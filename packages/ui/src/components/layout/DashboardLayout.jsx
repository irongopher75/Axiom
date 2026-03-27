import React, { useState } from 'react';
import Header from '../shared/Header';
import Sidebar from '../shared/Sidebar';
import { Outlet } from 'react-router-dom';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col lg:flex-row">
            {/* Sidebar */}
            <Sidebar isOpen={isSidebarOpen} closeSidebar={closeSidebar} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
                <Header toggleSidebar={toggleSidebar} />

                <main className="flex-1 p-4 md:p-6 overflow-y-auto">
                    <div className="max-w-7xl mx-auto space-y-6 animate-slide-up">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
