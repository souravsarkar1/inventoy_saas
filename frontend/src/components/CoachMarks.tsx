import React, { useState, useEffect, useLayoutEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, ChevronLeft, X, Sparkles } from 'lucide-react';

export interface Step {
    targetId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
}

interface CoachMarksProps {
    steps: Step[];
    isOpen: boolean;
    onClose: () => void;
}

const CoachMarks: React.FC<CoachMarksProps> = ({ steps, isOpen, onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0, height: 0 });

    const updateCoords = () => {
        const element = document.getElementById(steps[currentStep].targetId);
        if (element) {
            const rect = element.getBoundingClientRect();
            setCoords({
                top: rect.top + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width,
                height: rect.height
            });
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updateCoords();
        }
    }, [isOpen, currentStep]);

    useEffect(() => {
        window.addEventListener('resize', updateCoords);
        return () => window.removeEventListener('resize', updateCoords);
    }, [currentStep]);

    if (!isOpen) return null;

    const step = steps[currentStep];

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* Backdrop with hole */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                style={{
                    clipPath: `polygon(
                        0% 0%, 0% 100%, 
                        ${coords.left}px 100%, 
                        ${coords.left}px ${coords.top}px, 
                        ${coords.left + coords.width}px ${coords.top}px, 
                        ${coords.left + coords.width}px ${coords.top + coords.height}px, 
                        ${coords.left}px ${coords.top + coords.height}px, 
                        ${coords.left}px 100%, 
                        100% 100%, 100% 0%
                    )`
                }}
            />

            {/* Target Highlight Ring */}
            <motion.div
                animate={{
                    top: coords.top - 4,
                    left: coords.left - 4,
                    width: coords.width + 8,
                    height: coords.height + 8,
                }}
                className="absolute border-2 border-accent rounded-xl pointer-events-auto"
            />

            {/* Tooltip */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    top: coords.top + coords.height + 12,
                    left: Math.max(12, Math.min(window.innerWidth - 332, coords.left + (coords.width / 2) - 160))
                }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="absolute w-80 glass-card bg-bg-secondary p-6 shadow-2xl pointer-events-auto border border-white/10"
            >
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent">
                        <Sparkles size={16} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Feature Discovery</span>
                    <button onClick={onClose} className="ml-auto text-text-secondary hover:text-white">
                        <X size={16} />
                    </button>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                    {step.description}
                </p>

                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-text-secondary">
                        STEP {currentStep + 1} OF {steps.length}
                    </span>
                    <div className="flex gap-2">
                        {currentStep > 0 && (
                            <button
                                onClick={() => setCurrentStep(s => s - 1)}
                                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-all"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                if (currentStep === steps.length - 1) onClose();
                                else setCurrentStep(s => s + 1);
                            }}
                            className="btn btn-primary px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"
                        >
                            {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default CoachMarks;
