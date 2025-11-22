import React, { useState, useRef, useEffect } from 'react';
import Head from 'next/head';
import { ChatMessage } from '../components/Chat/ChatMessage';
import { ChatInput } from '../components/Chat/ChatInput';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: 'welcome',
            role: 'assistant',
            content: "Hello! I'm Qimi AI. I'm here to support your family's journey with ADHD. How can I help you today?"
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
            const mockResponse: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `This is a **mock response** to: "${content}".\n\nI am currently running in **local prototype mode**. Once connected to the backend, I will provide real AI guidance based on your RAG system.\n\n* Compassionate support\n* Actionable advice\n* ADHD-friendly formatting`
            };
            setMessages(prev => [...prev, mockResponse]);
            setIsLoading(false);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
            <Head>
                <title>Chat with Qimi AI</title>
                <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
            </Head>

            {/* Header */}
            <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/logo.svg" alt="Qimi AI" className="w-8 h-8" />
                        <h1 className="font-semibold text-gray-800 text-lg">Qimi AI</h1>
                    </div>
                    <a href="/" className="text-sm text-gray-500 hover:text-[#00D4AA] transition-colors">
                        Back to Home
                    </a>
                </div>
            </header>

            {/* Chat Area */}
            <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-6 flex flex-col gap-6 overflow-y-auto">
                {messages.map((msg) => (
                    <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
                ))}

                {isLoading && (
                    <div className="flex justify-start mb-6">
                        <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-none px-6 py-4 shadow-sm">
                            <div className="flex gap-2">
                                <div className="w-2 h-2 bg-[#00D4AA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-2 h-2 bg-[#00D4AA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-2 h-2 bg-[#00D4AA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </main>

            {/* Input Area */}
            <div className="sticky bottom-0 bg-gradient-to-t from-[#F8FAFC] via-[#F8FAFC] to-transparent pt-10 pb-6">
                <ChatInput onSend={handleSend} disabled={isLoading} />
            </div>
        </div>
    );
}
