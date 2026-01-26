import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Paperclip, X, FileText, Image as ImageIcon, File, Upload } from 'lucide-react';
import { formatFileSize, getFileCategory } from '../../utils/format';

// 支持的文件类型
const ACCEPTED_FILE_TYPES = {
  // 图片
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
  // PDF
  'application/pdf': ['.pdf'],
  // Word 文档
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  // 文本
  'text/plain': ['.txt'],
  // Markdown
  'text/markdown': ['.md'],
};

const ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_FILE_TYPES).flat();
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 5;

// 附件接口
export interface FileAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  url?: string; // 图片预览 URL
  status: 'pending' | 'uploading' | 'done' | 'error';
  error?: string;
}

interface ChatInputProps {
  onSend: (message: string, attachments?: FileAttachment[]) => void;
  disabled?: boolean;
}

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

export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

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

  // 验证文件
  const validateFile = (file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      return `Unsupported file type: ${extension}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large (max ${formatFileSize(MAX_FILE_SIZE)})`;
    }
    return null;
  };

  // 处理文件
  const processFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = MAX_FILES - attachments.length;

    if (fileArray.length > remainingSlots) {
      alert(`You can only upload up to ${MAX_FILES} files. ${remainingSlots} slots remaining.`);
      fileArray.splice(remainingSlots);
    }

    const newAttachments: FileAttachment[] = [];

    fileArray.forEach((file) => {
      const error = validateFile(file);
      const attachment: FileAttachment = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        name: file.name,
        type: file.type,
        size: file.size,
        status: error ? 'error' : 'done',
        error: error || undefined,
      };

      // 为图片生成预览 URL
      if (file.type.startsWith('image/') && !error) {
        attachment.url = URL.createObjectURL(file);
      }

      newAttachments.push(attachment);
    });

    setAttachments(prev => [...prev, ...newAttachments]);
  }, [attachments.length]);

  // 移除附件
  const removeAttachment = (id: string) => {
    setAttachments(prev => {
      const attachment = prev.find(a => a.id === id);
      if (attachment?.url) {
        URL.revokeObjectURL(attachment.url);
      }
      return prev.filter(a => a.id !== id);
    });
  };

  // 拖拽事件处理
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当离开整个 drop zone 时才设置为 false
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFiles(files);
    }
  }, [processFiles]);

  // 点击上传
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
    // 重置 input 以允许重复选择同一文件
    e.target.value = '';
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const validAttachments = attachments.filter(a => a.status === 'done');
    if ((input.trim() || validAttachments.length > 0) && !disabled) {
      onSend(input.trim(), validAttachments.length > 0 ? validAttachments : undefined);
      setInput('');
      // 清理附件的 URL
      attachments.forEach(a => {
        if (a.url) URL.revokeObjectURL(a.url);
      });
      setAttachments([]);
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

  // 清理 URL 对象
  useEffect(() => {
    return () => {
      attachments.forEach(a => {
        if (a.url) URL.revokeObjectURL(a.url);
      });
    };
  }, []);

  const hasValidAttachments = attachments.some(a => a.status === 'done');
  const canSend = (input.trim() || hasValidAttachments) && !disabled;

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={Object.keys(ACCEPTED_FILE_TYPES).join(',')}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* 拖拽区域 */}
      <div
        ref={dropZoneRef}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative flex flex-col
          bg-white rounded-2xl
          border-2 transition-all duration-200
          ${isDragging
            ? 'border-primary-teal border-dashed bg-primary-teal/5'
            : 'border-slate-200 hover:border-slate-300'
          }
          ${!isDragging && 'shadow-sm focus-within:border-primary-teal/50 focus-within:shadow-lg focus-within:shadow-primary-teal/5 focus-within:ring-4 focus-within:ring-primary-teal/10'}
          overflow-hidden
        `}
      >
        {/* 拖拽提示覆盖层 */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-primary-teal/10 backdrop-blur-sm rounded-2xl">
            <Upload size={32} className="text-primary-teal mb-2" />
            <p className="text-primary-teal font-medium">Drop files here</p>
            <p className="text-primary-teal/70 text-sm mt-1">Images, PDFs, Word documents</p>
          </div>
        )}

        {/* 附件预览区域 */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 px-3 pt-3">
            {attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={`relative group flex items-center gap-2 px-3 py-2 rounded-lg border ${
                  attachment.status === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                {/* 图片缩略图或文件图标 */}
                {attachment.type.startsWith('image/') && attachment.url ? (
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-10 h-10 rounded object-cover"
                  />
                ) : (
                  getFileIcon(attachment.type)
                )}

                {/* 文件信息 */}
                <div className="flex flex-col max-w-[120px]">
                  <span className="text-xs font-medium text-slate-700 truncate">
                    {attachment.name}
                  </span>
                  {attachment.status === 'error' ? (
                    <span className="text-xs text-red-500 truncate">
                      {attachment.error}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">
                      {formatFileSize(attachment.size)}
                    </span>
                  )}
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={() => removeAttachment(attachment.id)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-600 hover:bg-slate-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 输入区域 */}
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

        {/* 底部工具栏 */}
        <div className="flex justify-between items-center px-3 pb-2">
          <div className="flex gap-2">
            {/* 上传按钮 */}
            <button
              onClick={handleFileSelect}
              disabled={disabled || attachments.length >= MAX_FILES}
              className={`
                p-2 rounded-lg transition-all duration-200 flex items-center justify-center
                ${attachments.length >= MAX_FILES
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }
              `}
              title={`Attach files (${attachments.length}/${MAX_FILES})`}
            >
              <Paperclip size={20} />
            </button>
          </div>

          {/* 发送按钮 - 渐变边框风格 */}
          <button
            onClick={() => handleSubmit()}
            disabled={!canSend}
            className={`
              p-2.5 rounded-xl transition-all duration-200 flex items-center justify-center
              ${canSend
                ? 'hover:shadow-md active:scale-95'
                : 'opacity-40 cursor-not-allowed'
              }
            `}
            style={canSend ? {
              background: 'white',
              border: '2px solid transparent',
              backgroundImage: 'linear-gradient(white, white), linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
            } : {
              background: '#f1f5f9',
              border: '2px solid #e2e8f0',
            }}
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="url(#sendGradient)"
              className="w-5 h-5"
            >
              <defs>
                <linearGradient id="sendGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={canSend ? "#00D4AA" : "#94a3b8"} />
                  <stop offset="100%" stopColor={canSend ? "#8B5CF6" : "#94a3b8"} />
                </linearGradient>
              </defs>
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 底部提示 */}
      <p className="text-center text-[11px] font-medium text-slate-400 mt-3">
        Qimi AI can make mistakes. Drag & drop or click <Paperclip size={11} className="inline" /> to attach files.
      </p>
    </div>
  );
};
