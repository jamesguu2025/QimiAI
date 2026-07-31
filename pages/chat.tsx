import { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';
import { Moon, BookOpen, Heart, MessageSquare, Pin, Edit3, Trash2 } from 'lucide-react';
import { StreamingMessage } from '../components/Chat/StreamingMessage';
import { ChatInput, FileAttachment } from '../components/Chat/ChatInput';
import GuestOnboarding from '../components/Chat/GuestOnboarding';
import { ChatPageSkeleton } from '../components/UI/Skeleton';
import AppLayout from '../components/Layout/AppLayout';
import SaveFromChatButton from '../components/GrowthPlan/SaveFromChatButton';
import { guestStorage } from '../utils/guest-storage';
import { useChat } from '../hooks/useChat';
import { useChatStore, WELCOME_MESSAGE } from '../stores/chatStore';
import { useAuthUIStore } from '../stores/authUIStore';
import MemoryToast from '../components/Chat/MemoryToast';
import { isTopicFolder, Message, normalizeTopicFolder, TopicFolder } from '../types/chat';
import { trackClientEvent } from '../lib/client-analytics';
import { useAiQuota } from '../hooks/useAiQuota';

const TOPIC_LABELS: Record<TopicFolder, string> = {
    emotion: 'Emotions',
    learning: 'Learning',
    exercise: 'Exercise',
    nutrition: 'Nutrition',
    social: 'Social',
    sleep: 'Sleep',
    school: 'School',
    supplement: 'Supplements',
    supplements: 'Supplements',
};

export default function ChatPage() {
    const router = useRouter();
    const { mode } = router.query;
    const { data: session, status } = useSession();
    const { openLoginModal } = useAuthUIStore();
    const { quota, refreshQuota } = useAiQuota(status !== 'loading');

    useEffect(() => {
        if (status === 'loading') return;
        void refreshQuota();
    }, [status, session?.user?.email, refreshQuota]);

    // 访客模式状态
    const [isGuest, setIsGuest] = useState(true);
    const [showOnboarding, setShowOnboarding] = useState(false);
    const [guestMessageCount, setGuestMessageCount] = useState(0);

    // 使用流式聊天 Hook (连接真实 API)
    const {
        messages,
        isStreaming,
        sendMessage,
        setMessages
    } = useChat();

    // 会话管理 (from store)
    const {
        selectConversation,
        createNewChat,
        currentConversation,
        activeFolderKey,
        conversations,
        isLoadingConversations,
        loadConversations,
        setActiveFolderKey,
        deleteConversationById,
        renameConversation,
        togglePinConversation,
    } = useChatStore();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const modeHandledRef = useRef<string | null>(null);
    const guestMigrationKeyRef = useRef<string | null>(null);
    const activeTopicLabel = activeFolderKey ? TOPIC_LABELS[activeFolderKey] : null;
    const pageTitle = currentConversation?.title?.trim()
        ? `${currentConversation.title.trim()} - Qimi AI`
        : 'New Chat - Qimi AI';
    const topicConversations = conversations
        .filter(conversation => normalizeTopicFolder(conversation.folderKey) === activeFolderKey)
        .sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
    const guestRecentUserMessage = isGuest
        ? messages.find(message => message.role === 'user' && message.content.trim())
        : undefined;
    const guestRecentConversation = guestRecentUserMessage
        ? {
            title: guestRecentUserMessage.content.trim(),
            updatedAt: guestRecentUserMessage.timestamp,
        }
        : null;

    const isNearBottom = () => {
        const container = messagesContainerRef.current;
        if (!container) return true;

        const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
        return distanceFromBottom < 120;
    };

    useEffect(() => {
        if (!shouldAutoScrollRef.current && !isNearBottom()) return;
        messagesEndRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }, [messages]);

    const handleMessagesScroll = () => {
        shouldAutoScrollRef.current = isNearBottom();
    };

    // Handle conversation query param from SmartDrawer navigation
    useEffect(() => {
        const conversationId = router.query.conversation as string;
        if (conversationId) {
            selectConversation(conversationId);
            // Clean up the URL to avoid re-triggering
            router.replace('/chat', undefined, { shallow: true });
        }
    }, [router.query.conversation]);

    // Handle topic query param from SmartDrawer navigation
    useEffect(() => {
        const topic = router.query.topic as string;
        if (topic) {
            const folderKey = topic === 'supplement' ? 'supplements' : topic;
            if (isTopicFolder(folderKey)) {
                createNewChat(normalizeTopicFolder(folderKey));
                setMessages([WELCOME_MESSAGE]);
            }
            router.replace('/chat', undefined, { shallow: true });
        }
    }, [router.query.topic]);

    // 保存 AI 回复到 guestStorage（当流式响应完成时）
    useEffect(() => {
        if (isGuest && !isStreaming && messages.length > 1) {
            // 获取当前已保存的消息列表
            const guestData = guestStorage.get();
            const savedMessageIds = new Set(guestData?.chatHistory?.map(m => m.id) || []);

            // 找到所有未保存的 AI 消息
            const unsavedAIMessages = messages.filter(msg =>
                msg.role === 'assistant' &&
                msg.id !== 'welcome' &&
                msg.content &&
                !msg.isStreaming &&
                !savedMessageIds.has(msg.id)
            );

            // 批量保存未保存的 AI 消息
            unsavedAIMessages.forEach(msg => {
                guestStorage.addMessage({
                    id: msg.id,
                    role: 'assistant',
                    content: msg.content
                });
                console.log('[Guest] Saved AI message:', msg.id);
            });
        }
    }, [isGuest, isStreaming, messages]);

    // 检查登录状态和访客数据
    useEffect(() => {
        if (status === 'loading') return;

        if (session) {
            setIsGuest(false);
            setShowOnboarding(false);
            const guestData = guestStorage.get();
            if (guestData && session.user?.email) {
                const migrationKey = JSON.stringify({
                    email: session.user.email,
                    createdAt: guestData.createdAt,
                    messageCount: guestData.messageCount,
                    lastMessageId: guestData.chatHistory?.at(-1)?.id,
                });

                if (guestMigrationKeyRef.current !== migrationKey) {
                    guestMigrationKeyRef.current = migrationKey;
                    guestStorage.migrateToUser(session.user.email).then((migrated) => {
                        if (migrated) {
                            setMessages([WELCOME_MESSAGE]);
                            loadConversations();
                        } else {
                            guestMigrationKeyRef.current = null;
                        }
                    });
                }
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
                            timestamp: new Date().toISOString(),
                            sources: []
                        }));
                        setMessages([WELCOME_MESSAGE, ...restoredMessages]);
                    }
                }
            }
        }
    }, [session, status, setMessages, loadConversations]);

    // 处理初始模式 - 使用 ref 防止刷新时重复触发
    useEffect(() => {
        if (!mode || modeHandledRef.current === mode) return;

        modeHandledRef.current = mode as string;

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
            openLoginModal('signup');
            return;
        }

        shouldAutoScrollRef.current = true;
        const nextGuestMessageCount = guestMessageCount + 1;
        const hasAttachment = Boolean(attachments?.length);

        if (isGuest) {
            guestStorage.addMessage({
                id: `guest-user-${Date.now()}`,
                role: 'user',
                content,
                timestamp: new Date().toISOString(),
            });
            guestStorage.incrementMessageCount();
            setGuestMessageCount(prev => prev + 1);
        }

        // 构造 userProfile 用于 AI 个性化回复
        let userProfile = undefined;
        if (isGuest) {
            const guestData = guestStorage.get();
            if (guestData?.childBirthday || guestData?.challenges) {
                userProfile = {
                    childName: guestData.childName,
                    childBirthday: guestData.childBirthday,
                    gender: guestData.gender,
                    challenges: guestData.challenges,
                };
            }
        }
        // TODO: 登录用户从 Supabase 获取 userProfile (Phase 2)

        await sendMessage(content, attachments, false, userProfile, activeFolderKey);
        await refreshQuota();

        if (isGuest) {
            trackClientEvent('chat:message_sent', {
                conversation_type: 'guest',
                auth_state: 'guest',
                folder_key: activeFolderKey || 'general',
            });
            if (nextGuestMessageCount === 1) {
                trackClientEvent('chat:first_message_sent', {
                    conversation_type: 'guest',
                    auth_state: 'guest',
                    has_attachment: hasAttachment,
                    folder_key: activeFolderKey || 'general',
                });
            }

            if ([1, 3, 5, 10, 20].includes(nextGuestMessageCount)) {
                trackClientEvent('chat:message_count_milestone_reach', {
                    milestone: nextGuestMessageCount,
                    auth_state: 'guest',
                });
            }
        }
    };

    // 访客引导完成
    const handleOnboardingComplete = (data: {
        childName: string;
        childBirthday: { year: number; month: number };
        gender: 'boy' | 'girl' | 'other';
        challenges: { id: string; name: string; categoryId: string; categoryName: string }[];
        firstQuestion: string;
    }) => {
        guestStorage.initSession(data.childName, data.childBirthday, data.gender, data.challenges, data.firstQuestion);
        setShowOnboarding(false);
        if (data.firstQuestion) {
            setTimeout(() => handleSend(data.firstQuestion), 500);
        }
    };

    // 抽屉操作回调（传递给 AppLayout）
    const handleNewChat = () => {
        createNewChat(null);
        setMessages([WELCOME_MESSAGE]);
    };

    const handleSelectTopic = (folderKey: string) => {
        if (isTopicFolder(folderKey)) {
            const normalizedFolderKey = normalizeTopicFolder(folderKey);
            createNewChat(normalizedFolderKey);
            setActiveFolderKey(normalizedFolderKey);
        } else {
            createNewChat(null);
        }
        setMessages([WELCOME_MESSAGE]);
    };

    const handleSelectConversation = async (conversationId: string) => {
        try {
            await selectConversation(conversationId);
            trackClientEvent('chat:history_viewed', { auth_state: 'authenticated' });
        } catch (error) {
            console.error('Failed to load conversation:', error);
        }
    };

    const handleSelectGuestConversation = () => {
        const guestData = guestStorage.get();
        if (!guestData?.chatHistory?.length) return;

        setMessages([
            WELCOME_MESSAGE,
            ...guestData.chatHistory.map(message => ({
                id: message.id,
                role: message.role,
                content: message.content,
                timestamp: message.timestamp || new Date().toISOString(),
                sources: [],
            })),
        ]);
    };

    const handleRenameConversation = async (conversationId: string, currentTitle: string) => {
        const newTitle = window.prompt('Rename conversation', currentTitle);
        if (!newTitle?.trim() || newTitle.trim() === currentTitle) return;

        try {
            await renameConversation(conversationId, newTitle.trim());
        } catch (error) {
            console.error('Failed to rename conversation:', error);
        }
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (!window.confirm('Delete this conversation?')) return;

        try {
            await deleteConversationById(conversationId);
        } catch (error) {
            console.error('Failed to delete conversation:', error);
        }
    };

    const handlePinConversation = async (conversationId: string) => {
        try {
            await togglePinConversation(conversationId);
        } catch (error) {
            console.error('Failed to pin conversation:', error);
        }
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
                <GuestOnboarding
                    onComplete={handleOnboardingComplete}
                    onLogin={() => openLoginModal('login')}
                />
            </div>
        );
    }

    return (
        <AppLayout
            fullScreen
            onNewChat={handleNewChat}
            onSelectConversation={handleSelectConversation}
            guestRecentConversation={guestRecentConversation}
            onSelectGuestConversation={handleSelectGuestConversation}
            onSelectTopic={handleSelectTopic}
        >
            <Head><title>{pageTitle}</title></Head>

            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {quota && (quota.authState === 'authenticated' || quota.chat.used > 0 || quota.chat.remaining === 0) && (
                    <div className={`flex-shrink-0 border-b px-4 py-2 ${quota.chat.remaining === 0 ? 'border-red-100 bg-red-50' : quota.authState === 'authenticated' ? 'border-teal-100 bg-teal-50' : 'border-amber-100 bg-amber-50'}`}>
                        <div className={`mx-auto flex max-w-3xl items-center justify-center gap-2 text-sm ${quota.chat.remaining === 0 ? 'text-red-700' : quota.authState === 'authenticated' ? 'text-teal-700' : 'text-amber-700'}`}>
                            <span>
                                {quota.chat.remaining} of {quota.chat.limit} messages remaining {quota.chat.period === 'day' ? 'today' : 'in your guest trial'}.
                                {quota.authState === 'guest' && <>{' '}<button onClick={() => openLoginModal('signup')} className="font-semibold underline hover:text-amber-800">Sign in to create a personalized Growth Plan</button></>}
                            </span>
                        </div>
                    </div>
                )}
                {/* Chat 内容 */}
                <div
                    ref={messagesContainerRef}
                    onScroll={handleMessagesScroll}
                    className="flex-1 overflow-y-auto"
                >
                    <div className="max-w-3xl mx-auto px-4 py-8 flex flex-col min-h-full">
                        {activeFolderKey && !currentConversation && messages.length === 1 ? (
                            <div className="flex-1 flex flex-col pb-10">
                                <div className="mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                                            <BookOpen size={20} className="text-primary-purple" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-bold text-slate-800">{activeTopicLabel}</h2>
                                            <p className="text-sm text-slate-500">New chat in {activeTopicLabel}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {isLoadingConversations ? (
                                        <div className="rounded-lg border border-slate-100 bg-white px-4 py-3 text-sm text-slate-400">
                                            Loading...
                                        </div>
                                    ) : topicConversations.length > 0 ? (
                                        topicConversations.map(conversation => (
                                            <div
                                                key={conversation.id}
                                                className="group flex w-full items-center gap-2 rounded-lg border border-slate-100 bg-white px-4 py-3 text-left shadow-sm transition-colors hover:border-slate-200 hover:bg-slate-50"
                                            >
                                                <button
                                                    onClick={() => handleSelectConversation(conversation.id)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                    <MessageSquare size={17} className="flex-shrink-0 text-slate-400" />
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="truncate text-sm font-semibold text-slate-800">
                                                                {conversation.title || 'Untitled'}
                                                            </span>
                                                            {conversation.isPinned && <Pin size={14} className="flex-shrink-0 text-slate-400" />}
                                                        </div>
                                                        <div className="mt-0.5 text-xs text-slate-400">
                                                            {new Date(conversation.updatedAt).toLocaleDateString()}
                                                        </div>
                                                    </div>
                                                    </div>
                                                </button>
                                                <div className="flex flex-shrink-0 items-center gap-1 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100">
                                                    <button
                                                        onClick={() => handlePinConversation(conversation.id)}
                                                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                        title={conversation.isPinned ? 'Unpin' : 'Pin'}
                                                    >
                                                        <Pin size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleRenameConversation(conversation.id, conversation.title || 'Untitled')}
                                                        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                                                        title="Rename"
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteConversation(conversation.id)}
                                                        className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-400">
                                            No conversations yet
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : messages.length === 1 ? (
                            // 欢迎界面
                            <div className="flex-1 flex flex-col items-center justify-center pb-10">
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
                                {messages.map((msg, index) => {
                                    const previousUserMessage = [...messages.slice(0, index)].reverse().find((candidate) => candidate.role === 'user');

                                    return (
                                        <div key={msg.id}>
                                            <StreamingMessage
                                                role={msg.role}
                                                content={msg.content}
                                                sources={msg.sources}
                                                statusMessage={msg.statusMessage}
                                                attachments={msg.attachments}
                                                isStreaming={msg.isStreaming}
                                            />
                                            {msg.role === 'assistant' && msg.id !== 'welcome' && !msg.isStreaming && msg.content && (
                                                <div className="ml-0 md:ml-0">
                                                    <SaveFromChatButton
                                                        assistantContent={msg.content}
                                                        conversationId={msg.sourceConversationId || currentConversation?.id || null}
                                                        sourceMessageId={msg.sourceMessageId || null}
                                                        clientMessageId={msg.id}
                                                        sourceTime={msg.timestamp}
                                                        userContext={previousUserMessage?.content}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} className="h-4" />
                            </>
                        )}
                    </div>
                </div>

                {/* 输入区域 */}
                <div className="flex-shrink-0 pb-6 pt-2 px-4 bg-white border-t border-slate-50">
                    <ChatInput
                        onSend={handleSend}
                        disabled={isStreaming}
                    />
                </div>
            </div>
            {/* Memory extraction toast — shows when Qimi learns new facts */}
            <MemoryToast
                conversationId={currentConversation?.id || null}
                isStreaming={isStreaming}
            />
        </AppLayout>
    );
}
