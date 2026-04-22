import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * LogoReveal: A premium branding intro sequence for AXIOM.
 * Uses high-end animations to create a "wow" factor on launch.
 */
const LogoReveal = ({ onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onComplete();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#000000] flex items-center justify-center overflow-hidden">
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
                    animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        filter: 'blur(0px)',
                        transition: { duration: 1.2, ease: [0.16, 1, 0.3, 1] }
                    }}
                    exit={{ 
                        opacity: 0, 
                        scale: 1.1, 
                        filter: 'blur(40px)',
                        transition: { duration: 0.8, ease: [0.7, 0, 0.84, 0] }
                    }}
                    className="relative flex flex-col items-center"
                >
                    {/* Background Glow */}
                    <div className="absolute -inset-24 bg-[#FF6600]/5 blur-[120px] rounded-full animate-pulse" />
                    
                    {/* Logo Mark */}
                    <motion.div 
                        initial={{ rotate: -10 }}
                        animate={{ rotate: 0 }}
                        transition={{ duration: 2, ease: "easeOut" }}
                        className="relative z-10 mb-8"
                    >
                        <div className="w-16 h-16 border-2 border-[#FF6600] flex items-center justify-center relative">
                            <div className="w-4 h-4 bg-[#FF6600] animate-ping opacity-75" />
                            <div className="absolute inset-0 border border-[#FF6600]/20 rotate-45 scale-150" />
                        </div>
                    </motion.div>

                    {/* Logo Text */}
                    <div className="relative z-10 flex flex-col items-center gap-2">
                        <motion.h1 
                            initial={{ letterSpacing: '1em', opacity: 0 }}
                            animate={{ letterSpacing: '0.4em', opacity: 1 }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className="text-4xl font-bold text-white pl-[0.4em]"
                        >
                            AXIOM
                        </motion.h1>
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.8, delay: 0.8 }}
                            className="h-[1px] bg-gradient-to-r from-transparent via-[#FF6600] to-transparent opacity-50"
                        />
                        <motion.p 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 1.2 }}
                            className="text-[10px] font-black text-[#555] uppercase tracking-[0.3em] font-mono"
                        >
                            Institutional Vector Terminal
                        </motion.p>
                    </div>

                    {/* Loading Detail */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="absolute bottom-[-100px] flex flex-col items-center gap-4"
                    >
                        <div className="flex gap-1">
                            {[0, 1, 2].map(i => (
                                <motion.div 
                                    key={i}
                                    animate={{ opacity: [0.2, 1, 0.2] }}
                                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                                    className="w-1 h-1 bg-[#FF6600]"
                                />
                            ))}
                        </div>
                        <span className="text-[8px] text-[#333] font-mono tracking-widest uppercase">Initializing Core Engine...</span>
                    </motion.div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default LogoReveal;
