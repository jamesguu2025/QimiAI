import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import { SmartDrawer } from '../Chat/SmartDrawer';
import UserMenu from '../UI/UserMenu';

interface AppLayoutProps {
    children: React.ReactNode;
    fullScreen?: boolean;
    onNewChat?: () => void;
    onSelectConversation?: (id: string) => void;
    onSelectTopic?: (key: string) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    fullScreen = false,
    onNewChat,
    onSelectConversation,
    onSelectTopic
}) => {
    const router = useRouter();
    const { data: session } = useSession();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCollapsed, setDrawerCollapsed] = useState(false);
    const touchStartX = useRef<number>(0);

    const isGuest = !session;

    // Touch gesture handlers for swipe-to-open (mobile)
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (touchStartX.current < 30 && diff > 50 && !drawerOpen) {
            setDrawerOpen(true);
        }
    };

    return (
        <div className="h-screen w-full bg-slate-50 flex overflow-hidden">
            <SmartDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isCollapsed={drawerCollapsed}
                onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
                onNewChat={onNewChat || (() => router.push('/chat'))}
                onSelectTopic={onSelectTopic || ((folderKey) => router.push(`/chat?topic=${folderKey}`))}
                onSelectConversation={onSelectConversation || ((id) => router.push(`/chat?conversation=${id}`))}
                isGuest={isGuest}
            />

            <div
                className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${drawerCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Mobile Header */}
                <div className="lg:hidden flex-shrink-0 flex items-center justify-between h-16 px-4 bg-white border-b border-slate-100 z-10 relative">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-700"
                    >
                        <Menu size={24} />
                    </button>
                    <img src="/logo.svg" alt="Qimi AI" className="h-9 w-auto" />
                    <UserMenu />
                </div>

                {/* Desktop Header (non-fullScreen only) */}
                {!fullScreen && (
                    <div className="hidden lg:flex flex-shrink-0 items-center justify-between h-16 px-6 bg-white border-b border-slate-100">
                        <img src="/logo.svg" alt="Qimi AI" className="h-9 w-auto" />
                        <UserMenu />
                    </div>
                )}

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
