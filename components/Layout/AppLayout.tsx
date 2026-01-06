import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
    fullScreen?: boolean;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children, fullScreen = false }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <div className="h-screen bg-slate-50 flex overflow-hidden">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <div className="lg:hidden flex-shrink-0 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-100">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-700"
                    >
                        <Menu size={24} />
                    </button>
                    <img src="/logo.svg" alt="Qimi AI" className="h-9 w-auto" />
                    <div className="w-8" /> {/* Spacer for centering */}
                </div>

                {/* Main Content */}
                <main className={`flex-1 flex flex-col min-h-0 ${fullScreen ? '' : 'overflow-y-auto p-4 lg:p-8'}`}>
                    {fullScreen ? (
                        children
                    ) : (
                        <div className="max-w-6xl mx-auto w-full">
                            {children}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
