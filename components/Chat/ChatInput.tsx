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
        <div className="w-full max-w-4xl mx-auto p-4">
            <div className="relative flex items-end gap-2 bg-white rounded-3xl shadow-lg border border-gray-100 p-2 transition-shadow focus-within:shadow-xl">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about ADHD support..."
                    className="w-full max-h-[200px] py-3 px-4 bg-transparent border-none focus:ring-0 resize-none text-gray-700 placeholder-gray-400 text-base leading-relaxed"
                    rows={1}
                    disabled={disabled}
                />
                <button
                    onClick={() => handleSubmit()}
                    disabled={!input.trim() || disabled}
                    className={`p-3 rounded-full mb-1 transition-all duration-200 ${input.trim() && !disabled
                            ? 'bg-[#00D4AA] text-white hover:bg-[#00C49A] shadow-md'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
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
            <p className="text-center text-xs text-gray-400 mt-3">
                Qimi AI can make mistakes. Consider checking important information.
            </p>
        </div>
    );
};
