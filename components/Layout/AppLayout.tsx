import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Menu } from 'lucide-react';
import { SmartDrawer } from '../Chat/SmartDrawer';
import UserMenu from '../UI/UserMenu';
import { useAuthUIStore } from '../../stores/authUIStore';
import guestStorage from '../../utils/guest-storage';

interface AppLayoutProps {
    children: React.ReactNode;
    topBanner?: React.ReactNode;
    fullScreen?: boolean;
    onNewChat?: () => void;
    onSelectConversation?: (id: string) => void;
    guestRecentConversation?: {
        title: string;
        updatedAt: string;
    } | null;
    onSelectGuestConversation?: () => void;
    onSelectTopic?: (key: string) => void;
}

const AppLayout: React.FC<AppLayoutProps> = ({
    children,
    topBanner,
    fullScreen = false,
    onNewChat,
    onSelectConversation,
    guestRecentConversation,
    onSelectGuestConversation,
    onSelectTopic
}) => {
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const { openLoginModal } = useAuthUIStore();
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCollapsed, setDrawerCollapsed] = useState(false);
    const touchStartX = useRef<number>(0);

    const isGuest = !session;

    const authReason = 'Create an account to get more chat turns, preserve your guest conversation, and activate Memory and Growth Plan features.';
    const headerAccountControl = session ? (
        <UserMenu />
    ) : (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={() => openLoginModal('login', authReason)}
                className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 sm:inline-flex"
            >
                Log in
            </button>
            <button
                type="button"
                onClick={() => openLoginModal('signup', authReason)}
                className="inline-flex items-center rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
            >
                Sign up
            </button>
        </div>
    );

    useEffect(() => {
        if (
            sessionStatus === 'loading' ||
            !session ||
            router.pathname === '/consent' ||
            router.pathname === '/onboarding'
        ) return;

        let cancelled = false;

        async function checkAccountGates() {
            try {
                const response = await fetch('/api/compliance/consent-status');
                if (!response.ok) return;

                const data = await response.json();
                if (!cancelled && data.hasConsent === false) {
                    router.replace(`/consent?returnTo=${encodeURIComponent(router.asPath)}`);
                    return;
                }

                // The chat page owns guest-to-account migration. Let it finish before
                // deciding that a registered profile is missing.
                if (router.pathname === '/chat' && guestStorage.get()) {
                    return;
                }

                const onboardingResponse = await fetch('/api/onboarding/status');
                if (!onboardingResponse.ok) {
                    console.error('[AppLayout] Onboarding status check failed:', onboardingResponse.status);
                    return;
                }

                const onboarding = await onboardingResponse.json();
                if (!cancelled && onboarding.completed === false) {
                    router.replace(`/onboarding?returnTo=${encodeURIComponent(router.asPath)}`);
                }
            } catch (error) {
                console.error('[AppLayout] Account gate check failed:', error);
            }
        }

        checkAccountGates();

        return () => {
            cancelled = true;
        };
    }, [session, sessionStatus, router.pathname, router.asPath]);

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
                guestRecentConversation={guestRecentConversation}
                onSelectGuestConversation={onSelectGuestConversation}
                isGuest={isGuest}
            />

            <div
                className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${drawerCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Mobile Header */}
                <div className="lg:hidden flex-shrink-0 flex items-center h-16 px-4 bg-white border-b border-slate-100 z-10 relative">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="p-2 -ml-2 text-slate-500 hover:text-slate-700"
                    >
                        <Menu size={24} />
                    </button>
                    <img src="/logo.svg" alt="Qimi AI" className="pointer-events-none absolute left-1/2 h-9 w-auto -translate-x-1/2" />
                    <div className="ml-auto">
                        {headerAccountControl}
                    </div>
                </div>

                {/* Desktop Header */}
                <div className="hidden lg:flex flex-shrink-0 items-center h-16 px-6 bg-white border-b border-slate-100 relative">
                    <div className="w-10" />
                    <img src="/logo.svg" alt="Qimi AI" className="pointer-events-none absolute left-1/2 h-9 w-auto -translate-x-1/2" />
                    <div className="ml-auto flex-shrink-0 flex justify-end">
                        {headerAccountControl}
                    </div>
                </div>

                {topBanner}

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
