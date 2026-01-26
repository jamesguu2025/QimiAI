import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  ChevronRight,
  MoreHorizontal,
  Heart,
  BookOpen,
  Activity,
  Apple,
  Users,
  Moon,
  GraduationCap,
  Pill,
  LucideIcon
} from 'lucide-react';

// ============================================================================
// 数据类型定义
// ============================================================================

export interface TopicFolder {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export interface Conversation {
  id: string;
  title: string;
  folderKey: string;
  updatedAt: string;
}

// ============================================================================
// 静态数据
// ============================================================================

export const TOPIC_FOLDERS: TopicFolder[] = [
  { key: 'emotion', name: 'Emotions', icon: Heart, color: '#10B981' },
  { key: 'learning', name: 'Learning', icon: BookOpen, color: '#8B5CF6' },
  { key: 'exercise', name: 'Exercise', icon: Activity, color: '#F59E0B' },
  { key: 'nutrition', name: 'Nutrition', icon: Apple, color: '#EF4444' },
  { key: 'social', name: 'Social', icon: Users, color: '#3B82F6' },
  { key: 'sleep', name: 'Sleep', icon: Moon, color: '#6366F1' },
  { key: 'school', name: 'School', icon: GraduationCap, color: '#EC4899' },
  { key: 'supplements', name: 'Supplements', icon: Pill, color: '#14B8A6' },
];

export const MOCK_CONVERSATIONS: Conversation[] = [
  { id: '1', title: 'Sleep routine tips', folderKey: 'sleep', updatedAt: '2024-01-05' },
  { id: '2', title: 'Homework focus strategies', folderKey: 'learning', updatedAt: '2024-01-04' },
  { id: '3', title: 'Emotional outburst help', folderKey: 'emotion', updatedAt: '2024-01-03' },
  { id: '4', title: 'IEP meeting preparation', folderKey: 'school', updatedAt: '2024-01-02' },
];

// ============================================================================
// 子组件
// ============================================================================

interface TopicCardProps {
  folder: TopicFolder;
  onClick: () => void;
  collapsed: boolean;
}

const TopicCard: React.FC<TopicCardProps> = ({ folder, onClick, collapsed }) => {
  const IconComponent = folder.icon;

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors group relative"
        title={folder.name}
      >
        <IconComponent size={18} style={{ color: folder.color }} />
        {/* Tooltip */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {folder.name}
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group text-left"
    >
      <IconComponent size={18} style={{ color: folder.color }} />
      <span className="flex-1 text-sm font-medium text-slate-700 group-hover:text-slate-900">
        {folder.name}
      </span>
      <ChevronRight size={16} className="text-slate-400 group-hover:text-slate-600" />
    </button>
  );
};

interface ConversationItemProps {
  conversation: Conversation;
  onClick: () => void;
  collapsed: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({ conversation, onClick, collapsed }) => {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors group relative"
        title={conversation.title}
      >
        <MessageSquare size={18} className="text-slate-400" />
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 max-w-[200px] truncate">
          {conversation.title}
        </div>
      </button>
    );
  }

  return (
    <div
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 transition-colors group text-left cursor-pointer"
    >
      <span className="flex-1 text-sm text-slate-600 truncate group-hover:text-slate-900">
        {conversation.title}
      </span>
      <button
        onClick={(e) => { e.stopPropagation(); }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 rounded transition-all"
      >
        <MoreHorizontal size={14} className="text-slate-400" />
      </button>
    </div>
  );
};

// ============================================================================
// SmartDrawer 主组件
// ============================================================================

interface SmartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onNewChat: () => void;
  onSelectTopic: (folderKey: string) => void;
  onSelectConversation: (conversationId: string) => void;
}

export const SmartDrawer: React.FC<SmartDrawerProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  onNewChat,
  onSelectTopic,
  onSelectConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // 检测是否是移动端
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 移动端始终显示完整版，桌面端使用 isCollapsed 状态
  const effectiveCollapsed = !isMobile && isCollapsed;
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);
  const isDragging = useRef<boolean>(false);

  // 过滤对话
  const filteredConversations = MOCK_CONVERSATIONS.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 触摸手势处理 - 移动端滑动关闭
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isDragging.current = true;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging.current) return;
    touchCurrentX.current = e.touches[0].clientX;

    const diff = touchCurrentX.current - touchStartX.current;
    // 只允许向左滑动关闭
    if (diff < 0 && drawerRef.current) {
      const translateX = Math.max(diff, -288); // 最大滑动距离 = 抽屉宽度
      drawerRef.current.style.transform = `translateX(${translateX}px)`;
      drawerRef.current.style.transition = 'none';
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const diff = touchCurrentX.current - touchStartX.current;

    if (drawerRef.current) {
      drawerRef.current.style.transition = 'transform 300ms ease-in-out';

      // 如果滑动超过 100px，关闭抽屉
      if (diff < -100) {
        drawerRef.current.style.transform = 'translateX(-100%)';
        setTimeout(onClose, 300);
      } else {
        drawerRef.current.style.transform = 'translateX(0)';
      }
    }
  }, [onClose]);

  // 重置样式当抽屉状态改变时
  useEffect(() => {
    if (drawerRef.current) {
      drawerRef.current.style.transform = '';
      drawerRef.current.style.transition = '';
    }
  }, [isOpen]);

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity lg:hidden ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* 抽屉主体 */}
      <div
        ref={drawerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          fixed inset-y-0 left-0 z-30 bg-white border-r border-slate-100
          flex flex-col
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          ${effectiveCollapsed ? 'w-16' : 'w-72'}
          touch-pan-y
        `}
      >
        {/* Header - 只在桌面端收起时显示 */}
        {effectiveCollapsed && (
          <div className="flex items-center h-14 border-b border-slate-100 px-3 justify-center">
            <div className="flex items-center gap-1">
              {/* 新建对话按钮 */}
              <button
                onClick={onNewChat}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="New chat"
              >
                <Plus size={20} className="text-slate-600" />
              </button>

              {/* 收起/展开按钮（桌面端） */}
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
        )}

        {/* 搜索框 + 新建对话按钮（展开时） */}
        {!effectiveCollapsed && (
          <div className="px-3 pt-5 pb-3 flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal/50"
              />
            </div>
            {/* 新建对话按钮 */}
            <button
              onClick={onNewChat}
              className="flex-shrink-0 p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors border border-slate-200"
              title="New chat"
            >
              <Plus size={20} />
            </button>
            {/* 收起/展开按钮（桌面端） */}
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex flex-shrink-0 p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={20} className="text-slate-600" />
            </button>
          </div>
        )}

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {/* 板块列表 */}
          <div className={`${effectiveCollapsed ? 'px-3 py-2' : 'px-3 py-2'}`}>
            {!effectiveCollapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Topics
              </h3>
            )}
            <div className={`space-y-1 ${effectiveCollapsed ? 'flex flex-col items-center' : ''}`}>
              {TOPIC_FOLDERS.map(folder => (
                <TopicCard
                  key={folder.key}
                  folder={folder}
                  onClick={() => onSelectTopic(folder.key)}
                  collapsed={effectiveCollapsed}
                />
              ))}
            </div>
          </div>

          {/* 分隔线 */}
          <div className={`my-2 ${effectiveCollapsed ? 'mx-3' : 'mx-3'}`}>
            <div className="border-t border-slate-100" />
          </div>

          {/* 对话历史 */}
          <div className={`${effectiveCollapsed ? 'px-3 py-2' : 'px-3 py-2'}`}>
            {!effectiveCollapsed && (
              <h3 className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Recent
              </h3>
            )}
            <div className={`space-y-1 ${effectiveCollapsed ? 'flex flex-col items-center' : ''}`}>
              {filteredConversations.length > 0 ? (
                filteredConversations.map(conversation => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => onSelectConversation(conversation.id)}
                    collapsed={effectiveCollapsed}
                  />
                ))
              ) : (
                !effectiveCollapsed && (
                  <p className="px-3 py-2 text-sm text-slate-400">No conversations yet</p>
                )
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        {!effectiveCollapsed && (
          <div className="p-4 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Qimi AI - Your ADHD Support
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default SmartDrawer;
