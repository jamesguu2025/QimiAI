import React from 'react';
import ReactMarkdown from 'react-markdown';
import { RAGSources, Source } from './RAGSources';
import { FileText, Image as ImageIcon, File } from 'lucide-react';

// 附件类型
export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string; // 图片预览 URL
}

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
  attachments?: Attachment[];
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// 获取文件图标
const getFileIcon = (type: string) => {
  if (type.startsWith('image/')) {
    return <ImageIcon size={16} className="text-blue-500" />;
  }
  if (type === 'application/pdf') {
    return <FileText size={16} className="text-red-500" />;
  }
  if (type.includes('word') || type.includes('document')) {
    return <FileText size={16} className="text-blue-600" />;
  }
  return <File size={16} className="text-slate-500" />;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ role, content, sources, attachments }) => {
  const isUser = role === 'user';

  return (
    <div className={`flex w-full mb-6 group ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[90%] md:max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>

        {/* 附件预览（用户消息） */}
        {isUser && attachments && attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 justify-end">
            {attachments.map((attachment) => (
              <div key={attachment.id}>
                {attachment.type.startsWith('image/') && attachment.url ? (
                  // 图片预览
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
                  // 文件预览
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

        {/* Message Content - 使用 Sidebar 同款字体风格 */}
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
            </div>
          )}
        </div>

        {/* RAG Sources (Only for Assistant) */}
        {!isUser && sources && sources.length > 0 && (
          <RAGSources sources={sources} />
        )}
      </div>
    </div>
  );
};
