import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
    LayoutDashboard,
    MessageSquare,
    BookOpen,
    Settings,
    LogOut,
    Menu,
    X
} from 'lucide-react';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
    const router = useRouter();

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Chat', href: '/chat', icon: MessageSquare },
        { name: 'Resources', href: '/resources', icon: BookOpen },
        { name: 'Settings', href: '/settings', icon: Settings },
    ];

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={() => setIsOpen(false)}
            />

            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-100 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                {/* Logo Area */}
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
                    <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-slate-900">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-teal to-primary-purple flex items-center justify-center text-white">
                            Q
                        </div>
                        <span>Qimi AI</span>
                    </Link>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-1 text-slate-500 hover:text-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = router.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                                        ? 'bg-slate-50 text-primary-purple'
                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                            >
                                <item.icon size={20} className={isActive ? 'text-primary-purple' : 'text-slate-400'} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* User Profile / Footer */}
                <div className="p-4 border-t border-slate-100">
                    <button className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-red-600 transition-colors">
                        <LogOut size={20} className="text-slate-400 group-hover:text-red-600" />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
