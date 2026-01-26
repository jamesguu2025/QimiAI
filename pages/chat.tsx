import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Menu, Moon, BookOpen, Heart } from 'lucide-react';
import { StreamingMessage } from '../components/Chat/StreamingMessage';
import { ChatInput, FileAttachment } from '../components/Chat/ChatInput';
import { SmartDrawer } from '../components/Chat/SmartDrawer';
import GuestOnboarding from '../components/Chat/GuestOnboarding';
import LoginWall from '../components/Chat/LoginWall';
import { ChatPageSkeleton } from '../components/UI/Skeleton';
import { guestStorage } from '../utils/guest-storage';
import { useStreamingChat, Message } from '../hooks/useStreamingChat';

// 欢迎消息
const WELCOME_MESSAGE: Message = {
    id: 'welcome',
    role: 'assistant',
    content: "Hello. I'm Qimi AI.\n\nI can help you understand ADHD symptoms, find management strategies, or just listen. How can I help you today?"
};

export default function ChatPage() {
    const router = useRouter();
    const { mode } = router.query;
    const { data: session, status } = useSession();

    // 访客模式状态
    const [isGuest, setIsGuest] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showLoginWall, setShowLoginWall] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(0);

    // 抽屉状态
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerCollapsed, setDrawerCollapsed] = useState(false);

    // 使用流式聊天 Hook
    const {
        messages,
        isStreaming,
        canStop,
        sendMessage,
        stopGeneration,
        setMessages
    } = useStreamingChat([WELCOME_MESSAGE]);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);

    // 自动滚动到底部
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // 触摸手势 - 从左边缘右滑打开抽屉（移动端）
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const diff = touchEndX - touchStartX.current;

        // 从左边缘开始（<30px）且右滑超过 50px，打开抽屉
        if (touchStartX.current < 30 && diff > 50 && !drawerOpen) {
            setDrawerOpen(true);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 检查登录状态和访客数据
    useEffect(() => {
        if (status === 'loading') return;

        if (session) {
            setIsGuest(false);
            setShowOnboarding(false);
            const guestData = guestStorage.get();
            if (guestData && session.user?.email) {
                guestStorage.migrateToUser(session.user.email);
            }
        } else {
            setIsGuest(true);
            const hasOnboarded = guestStorage.hasCompletedOnboarding();
            if (!hasOnboarded) {
                setShowOnboarding(true);
            } else {
                const guestData = guestStorage.get();
                if (guestData) {
                    setGuestMessageCount(guestData.messageCount || 0);
                    if (guestData.chatHistory && guestData.chatHistory.length > 0) {
                        const restoredMessages: Message[] = guestData.chatHistory.map(msg => ({
                            id: msg.id,
                            role: msg.role as 'user' | 'assistant',
                            content: msg.content,
                            sources: []
                        }));
                        setMessages([WELCOME_MESSAGE, ...restoredMessages]);
                    }
                }
            }
        }
    }, [session, status, setMessages]);

    // 处理初始模式
    useEffect(() => {
        if (mode === 'iep') {
            handleSend("I need help with an IEP.");
        } else if (mode === 'routine') {
            handleSend("I need help building a routine.");
        } else if (mode === 'support') {
            handleSend("I'm feeling overwhelmed and need support.");
        }
    }, [mode]);

    // 发送消息
    const handleSend = async (content: string, attachments?: FileAttachment[]) => {
        if (isGuest && guestStorage.hasReachedLimit()) {
            setShowLoginWall(true);
            return;
        }

        await sendMessage(content, attachments);

        if (isGuest) {
            guestStorage.addMessage({ id: Date.now().toString(), role: 'user', content });
            guestStorage.incrementMessageCount();
            setGuestMessageCount(prev => prev + 1);
        }
    };

    // 访客引导完成
    const handleOnboardingComplete = (data: {
        childBirthday: { year: number; month: number };
        challenges: { id: string; name: string; categoryId: string; categoryName: string }[];
        firstQuestion: string;
    }) => {
        guestStorage.initSession(data.childBirthday, data.challenges, data.firstQuestion);
        setShowOnboarding(false);
        if (data.firstQuestion) {
            setTimeout(() => handleSend(data.firstQuestion), 500);
        }
    };

    // 抽屉操作
    const handleNewChat = () => {
        setMessages([WELCOME_MESSAGE]);
        setDrawerOpen(false);
    };

    const handleSelectTopic = (folderKey: string) => {
        console.log('Selected topic:', folderKey);
        setDrawerOpen(false);
    };

    const handleSelectConversation = (conversationId: string) => {
        console.log('Selected conversation:', conversationId);
        setDrawerOpen(false);
    };

    // 加载状态 - 使用骨架屏
    if (status === 'loading') {
        return (
            <>
                <Head><title>Chat - Qimi AI</title></Head>
                <ChatPageSkeleton />
            </>
        );
    }

    // 访客引导
    if (showOnboarding) {
        return (
            <div className="h-screen bg-white">
                <Head><title>Welcome - Qimi AI</title></Head>
                <GuestOnboarding onComplete={handleOnboardingComplete} />
            </div>
        );
    }

    return (
        <div className="h-screen flex bg-white">
            <Head><title>Chat - Qimi AI</title></Head>

            {/* 智能抽屉 */}
            <SmartDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                isCollapsed={drawerCollapsed}
                onToggleCollapse={() => setDrawerCollapsed(!drawerCollapsed)}
                onNewChat={handleNewChat}
                onSelectTopic={handleSelectTopic}
                onSelectConversation={handleSelectConversation}
            />

            {/* 主内容区 */}
            <div
                className={`flex-1 flex flex-col transition-all duration-300 ${drawerCollapsed ? 'lg:ml-16' : 'lg:ml-72'}`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header */}
                <header className="flex-shrink-0 h-14 flex items-center justify-center px-4 border-b border-slate-100 bg-white relative">
                    <button
                        onClick={() => setDrawerOpen(true)}
                        className="lg:hidden absolute left-4 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    >
                        <Menu size={20} className="text-slate-600" />
                    </button>
                    <img src="/logo.svg" alt="Qimi" className="h-8" />
                </header>

                {/* 登录墙 */}
                {showLoginWall && (
                    <LoginWall
                        onClose={() => setShowLoginWall(false)}
                        messageCount={guestMessageCount}
                        maxMessages={guestStorage.getMaxMessages()}
                    />
                )}

                {/* Chat 内容 */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-full">
                        {messages.length === 1 ? (
                            // 欢迎界面
                            <div className="flex-1 flex flex-col items-center justify-center pb-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-primary-teal/20 mb-6">
                                    <img src="/logo.svg" alt="Qimi" className="w-8 h-8 brightness-0 invert" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Hi, I'm Qimi AI</h2>
                                <p className="text-slate-500 text-center max-w-md mb-8">
                                    I'm here to support your family's journey with ADHD.<br />How can I help you today?
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                                    <button onClick={() => handleSend("How do I manage ADHD sleep issues?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-teal/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3 group-hover:bg-indigo-100 transition-colors">
                                            <Moon size={18} className="text-indigo-500" />
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Sleep Help</div>
                                        <div className="text-xs text-slate-400">Tips for better rest</div>
                                    </button>

                                    <button onClick={() => handleSend("Strategies for focus and homework?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-purple/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                                            <BookOpen size={18} className="text-purple-500" />
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Focus Tips</div>
                                        <div className="text-xs text-slate-400">Homework strategies</div>
                                    </button>

                                    <button onClick={() => handleSend("How to handle emotional outbursts?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-teal/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                                            <Heart size={18} className="text-teal-500" />
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Emotions</div>
                                        <div className="text-xs text-slate-400">Managing outbursts</div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            // 消息列表
                            <>
                                {messages.map((msg) => (
                                    <StreamingMessage
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        sources={msg.sources}
                                        attachments={msg.attachments}
                                        isStreaming={msg.isStreaming}
                                        onStop={canStop ? stopGeneration : undefined}
                                    />
                                ))}
                                <div ref={messagesEndRef} className="h-4" />
                            </>
                        )}
                    </div>
                </div>

                {/* 访客剩余消息提示 */}
                {isGuest && guestMessageCount > 0 && (
                    <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-700">
                            <span>
                                {guestStorage.getRemainingMessages()} free messages remaining.{' '}
                                <button onClick={() => setShowLoginWall(true)} className="font-semibold underline hover:text-amber-800">
                                    Sign up for unlimited
                                </button>
                            </span>
                        </div>
                    </div>
                )}

                {/* 输入区域 */}
                <div className="flex-shrink-0 pb-6 pt-2 px-4 bg-white border-t border-slate-50">
                    <ChatInput onSend={handleSend} disabled={isStreaming} />
                </div>
            </div>
        </div>
    );
}
