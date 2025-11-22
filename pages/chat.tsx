import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ChatInput } from '../components/Chat/ChatInput';
import { Source } from '../components/Chat/RAGSources';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
}

export default function ChatPage() {
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

    const getMockResponse = (input: string): { content: string; sources: Source[] } => {
        const lowerInput = input.toLowerCase();

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

        return {
            content: "I understand. Could you tell me more about that? I'm here to listen and provide support based on verified medical guidelines.",
            sources: []
        };
    };

    const handleSend = async (content: string) => {
        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content
        };

        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);

        // Mock Response Logic
        setTimeout(() => {
            const { content: aiContent, sources } = getMockResponse(content);

            const mockResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: aiContent,
                sources: sources
            };
            setMessages(prev => [...prev, mockResponse]);
            setIsLoading(false);
        }, 1000);
    };

    return (
        <div className="flex h-screen bg-white font-sans text-slate-900 selection:bg-slate-100">
            <Head>
                <title>Qimi AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </Head>

            {/* Sidebar */}
            <aside className="w-[260px] flex-shrink-0 bg-white/50 border-r border-slate-200/60 flex flex-col hidden md:flex backdrop-blur-sm">
                <div className="p-4">
                    <button
                        onClick={() => setMessages([messages[0]])}
                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition-all text-sm font-semibold text-slate-700 group"
                    >
                        <div className="w-6 h-6 rounded-lg bg-primary-teal/10 flex items-center justify-center group-hover:bg-primary-teal/20 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-primary-teal">
                                <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                            </svg>
                        </div>
                        New Chat
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                    <div className="px-3 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today</div>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all group">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-primary-purple transition-colors">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">Understanding ADHD</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-white hover:shadow-sm transition-all group">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 group-hover:text-primary-purple transition-colors">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                        </svg>
                        <span className="truncate">Sleep schedule help</span>
                    </button>
                </div>

                <div className="p-4 border-t border-slate-200/60">
                    <button className="flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-white hover:shadow-sm transition-all text-sm text-slate-700">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                            JG
                        </div>
                        <div className="flex-1 text-left">
                            <div className="font-semibold text-slate-800">James Guu</div>
                            <div className="text-xs text-slate-500">Free Plan</div>
                        </div>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 relative">
                {/* Mobile Header */}
                <header className="md:hidden h-14 border-b border-slate-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-gradient-primary flex items-center justify-center">
                            <img src="/logo.svg" alt="Qimi" className="w-3 h-3 brightness-0 invert" />
                        </div>
                        Qimi AI
                    </div>
                    <button onClick={() => setMessages([messages[0]])} className="text-slate-500 p-2 bg-slate-100 rounded-full">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                        </svg>
                    </button>
                </header>

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
                                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} sources={msg.sources} />
                                ))}

                                {isLoading && (
                                    <div className="flex justify-start mb-6 ml-12">
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

                {/* Input Area */}
                <div className="flex-shrink-0 pb-6 pt-2 px-4">
                    <ChatInput onSend={handleSend} disabled={isLoading} />
                </div>
            </main>
        </div>
    );
}
