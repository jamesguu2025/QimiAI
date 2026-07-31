import React, { useEffect, useRef, useState } from 'react';
import { Square } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';

// Kept for API compatibility while attachment upload is deliberately hidden for MVP.
export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  url?: string;
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { isStreaming, stopStream } = useChatStore();

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
  }, [input]);

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const content = input.trim();
    if (!content || disabled || isStreaming) return;
    onSend(content);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  const canSend = Boolean(input.trim()) && !disabled && !isStreaming;
  const isInputDisabled = Boolean(disabled) && !isStreaming;

  return (
    <div className="mx-auto w-full max-w-3xl p-4">
      <form
        onSubmit={handleSubmit}
        className="relative flex flex-col overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 focus-within:border-primary-teal/50 focus-within:shadow-lg focus-within:shadow-primary-teal/5 focus-within:ring-4 focus-within:ring-primary-teal/10"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (!isStreaming) handleSubmit();
            }
          }}
          placeholder="Ask anything..."
          className="max-h-[200px] w-full resize-none border-none bg-transparent px-4 py-3 text-[0.95rem] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
          rows={1}
          disabled={isInputDisabled}
          style={{ minHeight: '52px' }}
        />

        <div className="flex items-center justify-end px-3 pb-2">
          <button
            type={isStreaming ? 'button' : 'submit'}
            onClick={isStreaming ? stopStream : undefined}
            disabled={!canSend && !isStreaming}
            className={`flex items-center justify-center rounded-xl p-2.5 transition-all duration-200 ${(canSend || isStreaming) ? 'hover:shadow-md active:scale-95' : 'cursor-not-allowed opacity-40'}`}
            style={(canSend || isStreaming) ? {
              background: 'white',
              border: '2px solid transparent',
              backgroundImage: isStreaming
                ? 'linear-gradient(white, white), linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            } : { background: '#f1f5f9', border: '2px solid #e2e8f0' }}
            aria-label={isStreaming ? 'Stop generating' : 'Send message'}
          >
            {isStreaming ? (
              <Square size={18} fill="currentColor" className="text-red-500" />
            ) : (
              <svg className="h-[18px] w-[18px] text-primary-teal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            )}
          </button>
        </div>
      </form>
      <p className="mt-2 text-center text-xs text-slate-400">Qimi can make mistakes. Check important information.</p>
    </div>
  );
};
