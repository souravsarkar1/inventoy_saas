import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface SocketContextType {
    socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);

    useEffect(() => {
        if (user) {
            const newSocket = io(import.meta.env.VITE_SOCKET_URL);
            setSocket(newSocket);

            const tenantId = typeof user.tenantId === 'string' ? user.tenantId : user.tenantId._id;
            newSocket.emit('join-tenant', tenantId);

            newSocket.on('connect', () => {
                console.log('Connected to socket server');
            });

            newSocket.on('order-created', (order: any) => {
                toast.success(`New order received: $${order.totalAmount}`, {
                    duration: 5000,
                    position: 'top-right',
                    style: { background: '#141417', color: '#fff', border: '1px solid #2d2d35' }
                });
            });

            newSocket.on('po-updated', (po: any) => {
                toast.success(`PO Updated: ${po.status}`, {
                    duration: 5000,
                    position: 'top-right',
                    style: { background: '#141417', color: '#fff', border: '1px solid #2d2d35' }
                });
            });

            return () => {
                newSocket.close();
            };
        } else {
            if (socket) {
                socket.close();
                setSocket(null);
            }
        }
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};
