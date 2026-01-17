import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Package,
    Users,
    ShoppingCart,
    Truck,
    LogOut,
    ChevronRight,
    Box,
    MoreVertical,
    Building,
    FileUser
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useRef, useState } from 'react';
import LogoutModals from './LogoutModals';
import Popover from './ui/Popover';

const Sidebar = () => {
    const { user, logout } = useAuth();
    const [isLogoutModal, setLogoutModal] = useState(false);
    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
        { icon: Package, label: 'Inventory', path: '/inventory' },
        { icon: ShoppingCart, label: 'Sales Orders', path: '/orders' },
        { icon: Truck, label: 'Purchase Orders', path: '/purchase-orders' },
        { icon: Users, label: 'Suppliers', path: '/suppliers' },
        { icon: FileUser, label: 'Vendors', path: '/vendors' },
    ];

    if (user?.role === 'OWNER' || user?.role === 'MANAGER') {
        navItems.push({ icon: Building, label: 'Organization', path: '/organization' });
    }
    const navigate = useNavigate();
    const getTenantName = () => {
        if (!user?.tenantId) return 'N/A';
        if (typeof user.tenantId === 'string') return user.tenantId;
        if (typeof user.tenantId === 'object' && user.tenantId !== null) {
            // Safe check for name property
            const t = user.tenantId as any;
            return typeof t.name === 'string' ? t.name : JSON.stringify(t.name);
        }
        return 'N/A';
    };

    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const anchorRef = useRef<HTMLDivElement>(null);

    return (
        <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-72 bg-bg-secondary border-r border-white/5 flex flex-col h-screen sticky top-0 z-50"
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-accent"></div>

            <div className="p-8 pt-10">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                        <Box className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">StockPro</h1>
                        <span className="text-[10px] uppercase tracking-widest text-accent font-bold">Manager</span>
                    </div>
                </div>

                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                    <p className="text-[10px] uppercase text-text-secondary font-bold mb-1">Current Tenant</p>
                    <p className="text-sm font-bold text-white truncate">{String(getTenantName())}</p>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1 mt-4">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `
                            group relative flex items-center justify-between px-4 py-3 rounded-xl transition-all
                            ${isActive
                                ? 'bg-accent/10 text-accent'
                                : 'text-text-secondary hover:bg-white/5 hover:text-white'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <item.icon size={20} />
                            <span className="font-semibold text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Active Indicator (Custom div instead of NavLink) */}
                        <div className="active-indicator hidden" />
                    </NavLink>
                ))}
            </nav>

            <div className="p-6">
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.05] mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center font-bold text-white">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                            <p className="text-[10px] text-text-secondary uppercase font-bold">{user?.role}</p>
                        </div>
                        <button
                            onClick={() => setIsPopoverOpen(true)}
                            // @ts-ignore
                            ref={anchorRef}
                            className=""
                        >
                            <MoreVertical size={20} />
                        </button>
                    </div>

                </div>

                <button
                    onClick={() => setLogoutModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-danger bg-danger/10 hover:bg-danger/20 border border-danger/10 rounded-xl transition-all"
                >
                    <LogOut size={18} />
                    <span>Sign Out</span>
                </button>
            </div>
            <LogoutModals isLogoutModal={isLogoutModal} setLogoutModal={setLogoutModal} logout={logout} />

            <Popover isOpen={isPopoverOpen} onClose={() => setIsPopoverOpen(false)}
                //@ts-ignore
                anchorRef={anchorRef}
            >
                <div className="flex flex-col gap-1 min-w-[120px]">
                    <button
                        onClick={() => { navigate('/profile'); setIsPopoverOpen(false); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-bold text-white text-left transition-all"
                    >
                        Profile
                    </button>
                    {(user?.role === 'OWNER' || user?.role === 'MANAGER') && (
                        <button
                            onClick={() => { navigate('/organization'); setIsPopoverOpen(false); }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5 text-sm font-bold text-white text-left transition-all"
                        >
                            Organization
                        </button>
                    )}
                </div>
            </Popover>
        </motion.div>
    );
};

export default Sidebar;
