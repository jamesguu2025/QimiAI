import React, { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
    onSend: (message: string) => void;
    disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
    const [input, setInput] = useState('');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const adjustHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
        }
    };

    useEffect(() => {
        adjustHeight();
    }, [input]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        if (input.trim() && !disabled) {
            onSend(input.trim());
            setInput('');
            if (textareaRef.current) {
                textareaRef.current.style.height = 'auto';
            }
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-4">
            <div className={`
                relative flex flex-col
                bg-white rounded-2xl
                border border-slate-200
                shadow-sm
                transition-all duration-200
                focus-within:border-primary-teal/50 focus-within:shadow-lg focus-within:shadow-primary-teal/5 focus-within:ring-4 focus-within:ring-primary-teal/10
                overflow-hidden
            `}>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything..."
                    className="w-full max-h-[200px] py-3 px-4 bg-transparent border-none focus:ring-0 outline-none resize-none text-slate-800 placeholder:text-slate-400 text-[0.95rem] leading-relaxed"
                    rows={1}
                    disabled={disabled}
                    style={{ minHeight: '52px' }}
                />
                <div className="flex justify-between items-center px-2 pb-2">
                    <div className="flex gap-2">
                        {/* Placeholder for future attachment buttons */}
                    </div>
                    <button
                        onClick={() => handleSubmit()}
                        disabled={!input.trim() || disabled}
                        className={`
                            p-2 rounded-xl transition-all duration-200 flex items-center justify-center
                            ${input.trim() && !disabled
                                ? 'bg-gradient-primary text-white shadow-md shadow-primary-teal/20 hover:shadow-lg hover:shadow-primary-teal/30 hover:scale-105 active:scale-95'
                                : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                            }
                        `}
                        aria-label="Send message"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="w-5 h-5"
                        >
                            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                        </svg>
                    </button>
                </div>
            </div>
            <p className="text-center text-[11px] font-medium text-slate-400 mt-3">
                Qimi AI can make mistakes. Consider checking important information.
            </p>
        </div>
    );
};
