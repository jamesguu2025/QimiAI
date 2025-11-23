import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import AppLayout from '../components/Layout/AppLayout';
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
    const router = useRouter();
    const { mode } = router.query;

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

    const handleSend = async (content: string) => {
        // Avoid duplicates if called from effect
        setMessages(prev => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg.role === 'user' && lastMsg.content === content) return prev;

            return [...prev, {
                id: Date.now().toString(),
                role: 'user',
                content
            }];
        });

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
        <AppLayout fullScreen>
            <Head>
                <title>Chat - Qimi AI</title>
            </Head>

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
                <div className="flex-shrink-0 pb-6 pt-2 px-4 bg-white border-t border-slate-50">
                    <ChatInput onSend={handleSend} disabled={isLoading} />
                </div>
            </div>
        </AppLayout>
    );
}
