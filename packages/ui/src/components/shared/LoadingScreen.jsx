import React from 'react';
import { Activity } from 'lucide-react';

const LoadingScreen = ({ message = "Loading dashboard data..." }) => {
    return (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-950/80 backdrop-blur-md transition-all duration-500">
            <div className="relative">
                {/* Outer spin */}
                <div className="w-24 h-24 rounded-full border-t-2 border-b-2 border-blue-500/20 animate-spin"></div>

                {/* Inner pulse */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center animate-pulse border border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Activity className="w-8 h-8 text-blue-500" />
                    </div>
                </div>

                {/* Satellite dots */}
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></div>
            </div>

            <div className="mt-12 text-center space-y-4">
                <h2 className="text-xl font-bold text-white tracking-widest uppercase animate-pulse">
                    Processing
                </h2>
                <div className="flex items-center justify-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></div>
                </div>
                <p className="text-gray-400 font-medium text-sm max-w-xs mx-auto">
                    {message}
                </p>
            </div>

            {/* Background elements for premium feel */}
            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-purple-600/10 blur-[120px] rounded-full pointer-events-none"></div>
        </div>
    );
};

export default LoadingScreen;
