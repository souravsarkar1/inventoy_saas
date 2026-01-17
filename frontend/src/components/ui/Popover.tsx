import React, { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface PopoverProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    anchorRef: React.RefObject<HTMLDivElement | HTMLButtonElement>;
}

const Popover: React.FC<PopoverProps> = ({ isOpen, onClose, children, anchorRef }) => {
    const popoverRef = useRef<HTMLDivElement | null>(null);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop to close when clicking outside */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-[90]"
                    />

                    <motion.div
                        ref={popoverRef}
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        className="absolute z-[100] mt-2 glass-card bg-bg-secondary border border-white/5 rounded-xl shadow-lg p-4"
                        style={{
                            top: anchorRef.current?.getBoundingClientRect().bottom,
                            left: anchorRef.current?.getBoundingClientRect().left,
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default Popover;
