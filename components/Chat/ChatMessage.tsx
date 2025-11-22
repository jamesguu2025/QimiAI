import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RAGSources, Source } from './RAGSources';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, sources }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] md:max-w-[85%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>

        {/* Avatar */}
        <div className={`
          w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 mt-1
          ${isUser ? 'bg-slate-200' : 'bg-gradient-primary shadow-sm'}
        `}>
          {isUser ? (
            <span className="text-[10px] font-bold text-slate-500">YOU</span>
          ) : (
            <img src="/logo.svg" alt="Qimi" className="w-4 h-4 brightness-0 invert" />
          )}
        </div>

        {/* Message Content */}
        <div className="flex flex-col min-w-0">
          <div className={`
                text-[0.95rem] leading-7
                ${isUser ? 'text-slate-800 font-medium bg-slate-50/80 px-5 py-3 rounded-2xl rounded-tr-sm border border-slate-200/60 shadow-sm' : 'text-slate-800'}
            `}>
            {isUser ? (
              <p>{content}</p>
            ) : (
              <div className="prose prose-slate prose-sm max-w-none prose-p:leading-7 prose-headings:font-bold prose-headings:text-slate-900 prose-a:text-primary-teal prose-strong:text-slate-900 prose-ul:my-2 prose-li:my-0">
                <ReactMarkdown>{content}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* RAG Sources (Only for Assistant) */}
          {!isUser && sources && sources.length > 0 && (
            <RAGSources sources={sources} />
          )}
        </div>
      </div>
    </div>
  );
};
