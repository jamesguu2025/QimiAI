import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RAGSources } from './RAGSources';
import { RAGSource } from '../../types/api';
import { FileText, Image as ImageIcon, File, Square } from 'lucide-react';
import { formatFileSize } from '../../utils/format';
import { Attachment } from '../../types';

interface StreamingMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: RAGSource[];
  statusMessage?: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  onStop?: () => void;
}

// 获取文件图标
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) return <ImageIcon size={16} className="text-blue-500" />;
  if (type === 'application/pdf') return <FileText size={16} className="text-red-500" />;
  if (type.includes('word')) return <FileText size={16} className="text-blue-600" />;
  return <File size={16} className="text-slate-500" />;
};

export const StreamingMessage: React.FC<StreamingMessageProps> = ({
  role,
  content,
  sources,
  statusMessage,
  attachments,
  isStreaming,
  onStop
}) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[90%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>

        {/* 用户附件预览 */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {attachments.map((attachment) => (
              <div key={attachment.id}>
                {attachment.type.startsWith('image/') && attachment.url ? (
                  <div className="relative group/img">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-slate-200 shadow-sm"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs px-2 py-1 rounded-b-lg truncate opacity-0 group-hover/img:opacity-100 transition-opacity">
                      {attachment.name}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                    {getFileIcon(attachment.type)}
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700 truncate max-w-[150px]">
                        {attachment.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {formatFileSize(attachment.size)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 消息内容 */}
        <div className={`
          text-[15px] leading-relaxed font-medium
          ${isUser
            ? 'text-slate-700 bg-slate-50/80 px-5 py-3 rounded-2xl rounded-tr-sm border border-slate-200/60 shadow-sm'
            : 'text-slate-600'}
        `}>
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-slate max-w-none prose-p:text-[15px] prose-p:leading-relaxed prose-p:text-slate-600 prose-p:font-medium prose-headings:font-semibold prose-headings:text-slate-800 prose-a:text-primary-teal prose-strong:text-slate-700 prose-strong:font-semibold prose-ul:my-2 prose-li:my-0.5 prose-li:text-[15px] prose-li:text-slate-600">
              <ReactMarkdown>{content}</ReactMarkdown>
              {/* 流式输出光标 */}
              {isStreaming && (
                <span className="inline-block w-0.5 h-4 ml-0.5 bg-slate-400 animate-pulse" />
              )}
            </div>
          )}
        </div>

        {/* Status Message (RAG search indicator) */}
        {!isUser && statusMessage && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-500 italic">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Stop Generating 按钮 */}
        {!isUser && isStreaming && onStop && (
          <button
            onClick={onStop}
            className="mt-3 flex items-center gap-2 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Square size={14} fill="currentColor" />
            Stop generating
          </button>
        )}

        {/* RAG 引用源 */}
        {!isUser && sources && sources.length > 0 && !isStreaming && (
          <RAGSources sources={sources} />
        )}
      </div>
    </div>
  );
};

export default StreamingMessage;
