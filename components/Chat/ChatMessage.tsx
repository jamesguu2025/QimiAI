import React from 'react';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-6 py-4 shadow-sm ${
          isUser
            ? 'bg-gradient-to-r from-[#00D4AA] to-[#00C49A] text-white rounded-br-none'
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {isUser ? (
          <p className="text-base leading-relaxed">{content}</p>
        ) : (
          <div className="prose prose-slate prose-p:leading-relaxed prose-headings:text-gray-800 prose-a:text-[#00D4AA] max-w-none">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};
