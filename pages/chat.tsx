import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import AppLayout from '../components/Layout/AppLayout';
import { ChatMessage, Attachment } from '../components/Chat/ChatMessage';
import { ChatInput, FileAttachment } from '../components/Chat/ChatInput';
import { Source } from '../components/Chat/RAGSources';
import GuestOnboarding from '../components/Chat/GuestOnboarding';
import LoginWall from '../components/Chat/LoginWall';
import { guestStorage } from '../utils/guest-storage';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    attachments?: Attachment[];
}

export default function ChatPage() {
    const router = useRouter();
    const { mode } = router.query;
    const { data: session, status } = useSession();

    // 访客模式状态
    const [isGuest, setIsGuest] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [showLoginWall, setShowLoginWall] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(0);

    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello. I'm Qimi AI.\n\nI can help you understand ADHD symptoms, find management strategies, or just listen. How can I help you today?"
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 检查登录状态和访客数据
    useEffect(() => {
        if (status === 'loading') return;

        if (session) {
            // 已登录用户
            setIsGuest(false);
            setShowOnboarding(false);
            // 静默迁移访客数据到用户账户
            const guestData = guestStorage.get();
            if (guestData && session.user?.email) {
                guestStorage.migrateToUser(session.user.email);
            }
        } else {
            // 访客用户
            setIsGuest(true);
            const hasOnboarded = guestStorage.hasCompletedOnboarding();
            if (!hasOnboarded) {
                setShowOnboarding(true);
            } else {
                // 恢复访客数据
                const guestData = guestStorage.get();
                if (guestData) {
                    setGuestMessageCount(guestData.messageCount || 0);
                    // 恢复历史消息
                    if (guestData.chatHistory && guestData.chatHistory.length > 0) {
                        const restoredMessages: Message[] = guestData.chatHistory.map(msg => ({
                            id: msg.id,
                            role: msg.role,
                            content: msg.content,
                            sources: []
                        }));
                        setMessages([messages[0], ...restoredMessages]);
                    }
                }
            }
        }
    }, [session, status]);

    // Handle initial mode from query params
    useEffect(() => {
        if (mode === 'iep') {
            handleSend("I need help with an IEP.");
        } else if (mode === 'routine') {
            handleSend("I need help building a routine.");
        } else if (mode === 'support') {
            handleSend("I'm feeling overwhelmed and need support.");
        }
    }, [mode]);

    const getMockResponse = (input: string, hasAttachments: boolean): { content: string; sources: Source[] } => {
        const lowerInput = input.toLowerCase();

        // 如果有附件，给出不同的回复
        if (hasAttachments) {
            return {
                content: "Thank you for sharing those files with me. I can see the attachments you've uploaded.\n\n**What I can help with:**\n*   Analyze images of documents or homework\n*   Review PDFs of school reports or IEPs\n*   Help interpret Word documents\n\nCould you tell me more about what you'd like me to look at specifically?",
                sources: []
            };
        }

        if (lowerInput.includes('adhd')) {
            return {
                content: "ADHD (Attention Deficit Hyperactivity Disorder) is a neurodevelopmental condition involving persistent patterns of inattention, hyperactivity, and impulsivity.\n\nKey aspects include:\n*   Difficulty sustaining attention\n*   Struggling with organization\n*   Restlessness or fidgeting\n\nManagement often involves a combination of behavioral strategies, medication, and support.",
                sources: [
                    { title: "NIMH: Attention-Deficit/Hyperactivity Disorder", url: "https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd" },
                    { title: "CDC: What is ADHD?", url: "https://www.cdc.gov/ncbddd/adhd/facts.html" }
                ]
            };
        }

        if (lowerInput.includes('sleep')) {
            return {
                content: "Sleep issues are common with ADHD. A consistent bedtime routine is crucial.\n\n**Tips for better sleep:**\n1.  Limit screens 1 hour before bed.\n2.  Use white noise or calming music.\n3.  Keep the room cool and dark.\n\nMelatonin supplements are sometimes used, but consult a doctor first.",
                sources: [
                    { title: "Sleep Foundation: ADHD and Sleep", url: "https://www.sleepfoundation.org/mental-health/adhd-and-sleep" }
                ]
            };
        }

        if (lowerInput.includes('iep')) {
            return {
                content: "Navigating the IEP process can be daunting. I can help you understand your rights, suggest goals, or draft a letter to the school.\n\n**Where should we start?**\n*   Understanding the evaluation process\n*   Drafting SMART goals\n*   Requesting a meeting",
                sources: [
                    { title: "Understood.org: IEP Guide", url: "https://www.understood.org/en/school-learning/special-services/ieps/understanding-individualized-education-programs" }
                ]
            };
        }

        return {
            content: "I understand. Could you tell me more about that? I'm here to listen and provide support based on verified medical guidelines.",
            sources: []
        };
    };

    const handleSend = async (content: string, attachments?: FileAttachment[]) => {
        // 访客模式：检查是否达到消息限制
        if (isGuest && guestStorage.hasReachedLimit()) {
            setShowLoginWall(true);
            return;
        }

        // 转换附件格式
        const messageAttachments: Attachment[] | undefined = attachments?.map(a => ({
            id: a.id,
            name: a.name,
            type: a.type,
            size: a.size,
            url: a.url
        }));

        // 构建显示内容（如果只有附件没有文字）
        const displayContent = content || (attachments && attachments.length > 0
            ? `[Attached ${attachments.length} file${attachments.length > 1 ? 's' : ''}]`
            : '');

        // Avoid duplicates if called from effect
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: displayContent,
            attachments: messageAttachments
        };

        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.role === 'user' && lastMsg.content === displayContent) return prev;
            return [...prev, userMessage];
        });

        // 访客模式：保存消息并增加计数
        if (isGuest) {
            guestStorage.addMessage({ id: userMessage.id, role: 'user', content: displayContent });
            guestStorage.incrementMessageCount();
            setGuestMessageCount(prev => prev + 1);
        }

        setIsLoading(true);

        // Mock Response Logic
        setTimeout(() => {
            const hasAttachments = attachments && attachments.length > 0;
            const { content: aiContent, sources } = getMockResponse(content, !!hasAttachments);

            const mockResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiContent,
                sources: sources
            };
            setMessages(prev => [...prev, mockResponse]);

            // 访客模式：保存 AI 回复
            if (isGuest) {
                guestStorage.addMessage({ id: mockResponse.id, role: 'assistant', content: aiContent });
            }

            setIsLoading(false);
        }, 1000);
    };

    // 访客引导完成回调
    const handleOnboardingComplete = (data: {
        childBirthday: { year: number; month: number };
        challenges: { id: string; name: string; categoryId: string; categoryName: string }[];
        firstQuestion: string;
    }) => {
        guestStorage.initSession(data.childBirthday, data.challenges, data.firstQuestion);
        setShowOnboarding(false);

        // 自动发送第一个问题
        if (data.firstQuestion) {
            setTimeout(() => {
                handleSend(data.firstQuestion);
            }, 500);
        }
    };

    // 关闭登录墙
    const handleLoginWallClose = () => {
        setShowLoginWall(false);
    };

    // 加载中状态
    if (status === 'loading') {
        return (
            <AppLayout fullScreen>
                <Head>
                    <title>Chat - Qimi AI</title>
                </Head>
                <div className="flex items-center justify-center h-full">
                    <div className="animate-pulse text-slate-400">Loading...</div>
                </div>
            </AppLayout>
        );
    }

    // 访客引导页面
    if (showOnboarding) {
        return (
            <AppLayout fullScreen>
                <Head>
                    <title>Welcome - Qimi AI</title>
                </Head>
                <GuestOnboarding onComplete={handleOnboardingComplete} />
            </AppLayout>
        );
    }

    return (
        <AppLayout fullScreen>
            <Head>
                <title>Chat - Qimi AI</title>
            </Head>

            {/* 登录墙弹窗 */}
            {showLoginWall && (
                <LoginWall
                    onClose={handleLoginWallClose}
                    messageCount={guestMessageCount}
                    maxMessages={guestStorage.getMaxMessages()}
                />
            )}

            <div className="flex flex-col h-full bg-white">
                {/* Chat Stream */}
                <div className="flex-1 overflow-y-auto">
                    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-full">
                        {messages.length === 1 ? (
                            <div className="flex-1 flex flex-col items-center justify-center pb-10">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-xl shadow-primary-teal/20 mb-6">
                                    <img src="/logo.svg" alt="Qimi" className="w-8 h-8 brightness-0 invert" />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-800 mb-2">Hi, I'm Qimi AI</h2>
                                <p className="text-slate-500 text-center max-w-md mb-8">
                                    I'm here to support your family's journey with ADHD. <br />How can I help you today?
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full max-w-2xl">
                                    <button onClick={() => handleSend("How do I manage ADHD sleep issues?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-teal/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center mb-3 group-hover:bg-blue-100 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Sleep Help</div>
                                        <div className="text-xs text-slate-400">Tips for better rest</div>
                                    </button>

                                    <button onClick={() => handleSend("Strategies for focus and homework?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-purple/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center mb-3 group-hover:bg-purple-100 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                                                <path fillRule="evenodd" d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Focus Tips</div>
                                        <div className="text-xs text-slate-400">Homework strategies</div>
                                    </button>

                                    <button onClick={() => handleSend("How to handle emotional outbursts?")} className="text-left p-4 rounded-xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary-teal/30 hover:-translate-y-0.5 transition-all group">
                                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-500 flex items-center justify-center mb-3 group-hover:bg-teal-100 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                                            </svg>
                                        </div>
                                        <div className="font-semibold text-slate-800 text-sm mb-1">Emotions</div>
                                        <div className="text-xs text-slate-400">Managing outbursts</div>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {messages.map((msg) => (
                                    <ChatMessage
                                        key={msg.id}
                                        role={msg.role}
                                        content={msg.content}
                                        sources={msg.sources}
                                        attachments={msg.attachments}
                                    />
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start mb-6">
                                        <div className="flex gap-1.5">
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} className="h-4" />
                            </>
                        )}
                    </div>
                </div>

                {/* 访客剩余消息提示 */}
                {isGuest && guestMessageCount > 0 && (
                    <div className="flex-shrink-0 px-4 py-2 bg-amber-50 border-t border-amber-100">
                        <div className="max-w-3xl mx-auto flex items-center justify-center gap-2 text-sm text-amber-700">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                            </svg>
                            <span>
                                {guestStorage.getRemainingMessages()} free messages remaining.{' '}
                                <button
                                    onClick={() => setShowLoginWall(true)}
                                    className="font-semibold underline hover:text-amber-800"
                                >
                                    Sign up for unlimited
                                </button>
                            </span>
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <div className="flex-shrink-0 pb-6 pt-2 px-4 bg-white border-t border-slate-50">
                    <ChatInput onSend={handleSend} disabled={isLoading} />
                </div>
            </div>
        </AppLayout>
    );
}
