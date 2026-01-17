import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Step } from '../components/CoachMarks';

interface TourContextType {
    isTourOpen: boolean;
    startTour: () => void;
    endTour: () => void;
    tourSteps: Step[];
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const TourProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isTourOpen, setIsTourOpen] = useState(false);

    const tourSteps: Step[] = [
        {
            targetId: 'global-nav',
            title: 'Streamlined Navigation',
            description: 'Access your Dashboard, Inventory, Orders, and Suppliers from this central sidebar. We have organized everything for maximum efficiency.'
        },
        {
            targetId: 'global-tenant',
            title: 'Organization Identity',
            description: 'This shows your current business workspace. All data you see and modify is securely contained within this tenant.'
        },
        {
            targetId: 'global-profile',
            title: 'Your Command Center',
            description: 'Your user profile and role details. You can sign out securely from here once your shift is complete.'
        }
    ];

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenGlobalTour');
        if (!hasSeenTour) {
            // Delay slightly to let the app settle
            const timer = setTimeout(() => {
                setIsTourOpen(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const startTour = () => setIsTourOpen(true);
    const endTour = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenGlobalTour', 'true');
    };

    return (
        <TourContext.Provider value={{ isTourOpen, startTour, endTour, tourSteps }}>
            {children}
        </TourContext.Provider>
    );
};

export const useTour = () => {
    const context = useContext(TourContext);
    if (!context) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
};
