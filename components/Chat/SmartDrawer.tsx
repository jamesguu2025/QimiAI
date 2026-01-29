import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import {
  PanelLeftClose,
  PanelLeft,
  Plus,
  Search,
  MessageSquare,
  ChevronRight,
  Heart,
  BookOpen,
  Activity,
  Apple,
  Users,
  Moon,
  GraduationCap,
  Pill,
  Trash2,
  Loader2,
  LogIn,
  User,
  Home,
  AlertTriangle,
  X,
  Edit3,
  Pin,
  LucideIcon
} from 'lucide-react';
import { signIn, signOut } from 'next-auth/react';
import { useChatStore } from '../../stores/chatStore';

// ============================================================================
// 长按Hook - 用于移动端检测长按手势
// ============================================================================

function useLongPress(
  onLongPress: (position: { x: number; y: number }) => void,
  onClick?: () => void,
  { delay = 500 }: { delay?: number } = {}
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLongPressRef = useRef(false);
  const touchMoved = useRef(false);
  const positionRef = useRef({ x: 0, y: 0 });

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    isLongPressRef.current = false;
    touchMoved.current = false;

    // 保存触摸/点击位置，用于长按触发时使用
    if ('touches' in e) {
      positionRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };
    } else {
      positionRef.current = {
        x: e.clientX,
        y: e.clientY,
      };
    }

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      onLongPress(positionRef.current);
    }, delay);
  }, [onLongPress, delay]);

  const clear = useCallback((shouldTriggerClick = true) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (shouldTriggerClick && !isLongPressRef.current && !touchMoved.current && onClick) {
      onClick();
    }
  }, [onClick]);

  const move = useCallback(() => {
    touchMoved.current = true;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: () => clear(true),
    onTouchMove: move,
    onMouseDown: start,
    onMouseUp: () => clear(true),
    onMouseLeave: () => clear(false),
  };
}

// ============================================================================
// 确认弹窗组件
// ============================================================================

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  const dialogContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-5 py-4">
          <p className="text-sm text-slate-600">{message}</p>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );

  // 使用 Portal 渲染到 body，确保居中显示
  return ReactDOM.createPortal(dialogContent, document.body);
};

// ============================================================================
// 上下文菜单组件 - 用于移动端长按显示
// ============================================================================

interface ContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onRename: () => void;
  onPinTop: () => void;
  onDelete: () => void;
  isPinned?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  onRename,
  onPinTop,
  onDelete,
  isPinned = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // 调整菜单位置确保不超出屏幕
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 水平方向调整
      if (rect.right > viewportWidth) {
        menu.style.left = `${viewportWidth - rect.width - 16}px`;
      }
      // 垂直方向调整
      if (rect.bottom > viewportHeight) {
        menu.style.top = `${viewportHeight - rect.height - 16}px`;
      }
    }
  }, [isOpen, position]);

  if (!isOpen || !mounted) return null;

  const menuContent = (
    <>
      {/* 透明遮罩 */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={onClose}
        onTouchEnd={onClose}
      />

      {/* 菜单内容 */}
      <div
        ref={menuRef}
        className="fixed z-[9999] bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-[160px] animate-in fade-in zoom-in-95 duration-150"
        style={{ left: position.x, top: position.y }}
      >
        {/* 重命名 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRename();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Edit3 size={16} className="text-slate-500" />
          <span>Rename</span>
        </button>

        {/* 置顶/取消置顶 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPinTop();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <Pin size={16} className={isPinned ? 'text-primary-teal' : 'text-slate-500'} />
          <span>{isPinned ? 'Unpin' : 'Pin to Top'}</span>
        </button>

        {/* 分隔线 */}
        <div className="my-1 mx-2 border-t border-slate-100" />

        {/* 删除 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <Trash2 size={16} />
          <span>Delete</span>
        </button>
      </div>
    </>
  );

  // 使用 Portal 渲染到 body
  return ReactDOM.createPortal(menuContent, document.body);
};

// ============================================================================
// 数据类型定义
// ============================================================================

export interface TopicFolder {
  key: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

// Use the Conversation type from types/chat.ts via the store
// Local interface for display purposes
interface ConversationDisplay {
  id: string;
  title: string;
  folderKey: string | null;
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

// Mock data removed - now using real data from chatStore

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
  conversation: ConversationDisplay;
  onClick: () => void;
  onDelete: () => Promise<void>;
  onRename?: () => void;
  onPinTop?: () => void;
  isActive: boolean;
  collapsed: boolean;
  isPinned?: boolean;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  onClick,
  onDelete,
  onRename,
  onPinTop,
  isActive,
  collapsed,
  isPinned = false,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setShowConfirm(false);
    } catch (error) {
      // 保持弹窗打开，让用户知道失败了
    } finally {
      setIsDeleting(false);
    }
  };

  // 长按处理 - 显示上下文菜单
  const handleLongPress = useCallback((position: { x: number; y: number }) => {
    setContextMenuPosition(position);
    setShowContextMenu(true);

    // 触觉反馈（如果设备支持）
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, []);

  // 长按hook
  const longPressHandlers = useLongPress(handleLongPress, onClick, { delay: 500 });

  // 从上下文菜单触发删除
  const handleDeleteFromMenu = () => {
    setShowConfirm(true);
  };

  // 重命名处理（目前只是占位，后续可以实现）
  const handleRename = () => {
    if (onRename) {
      onRename();
    } else {
      // TODO: 实现重命名功能
      console.log('[ConversationItem] Rename requested for:', conversation.id);
    }
  };

  // 置顶处理（目前只是占位，后续可以实现）
  const handlePinTop = () => {
    if (onPinTop) {
      onPinTop();
    } else {
      // TODO: 实现置顶功能
      console.log('[ConversationItem] Pin to top requested for:', conversation.id);
    }
  };

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        className={`w-10 h-10 flex items-center justify-center rounded-lg transition-colors group relative ${
          isActive ? 'bg-primary-teal/10' : 'hover:bg-slate-100'
        }`}
        title={conversation.title}
      >
        <MessageSquare size={18} className={isActive ? 'text-primary-teal' : 'text-slate-400'} />
        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 max-w-[200px] truncate">
          {conversation.title}
        </div>
      </button>
    );
  }

  return (
    <>
      <div
        {...longPressHandlers}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group text-left cursor-pointer select-none ${
          isActive ? 'bg-primary-teal/10' : 'hover:bg-slate-50'
        } ${isPinned ? 'border-l-2 border-primary-teal' : ''}`}
      >
        {isPinned && <Pin size={12} className="text-primary-teal flex-shrink-0" />}
        <span className={`flex-1 text-sm truncate ${
          isActive ? 'text-primary-teal font-medium' : 'text-slate-600 group-hover:text-slate-900'
        }`}>
          {conversation.title}
        </span>
        {/* 桌面端hover显示删除按钮 */}
        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className={`p-1 rounded transition-all hidden sm:block ${
            isDeleting
              ? 'opacity-100 bg-slate-100'
              : 'opacity-0 group-hover:opacity-100 hover:bg-slate-200'
          }`}
          title="Delete"
        >
          <Trash2 size={14} className="text-slate-400 hover:text-red-500" />
        </button>
      </div>

      {/* 移动端长按上下文菜单 */}
      <ContextMenu
        isOpen={showContextMenu}
        position={contextMenuPosition}
        onClose={() => setShowContextMenu(false)}
        onRename={handleRename}
        onPinTop={handlePinTop}
        onDelete={handleDeleteFromMenu}
        isPinned={isPinned}
      />

      {/* 删除确认弹窗 */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Delete Conversation"
        message={`Are you sure you want to delete "${conversation.title}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setShowConfirm(false)}
        isLoading={isDeleting}
      />
    </>
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
  isGuest?: boolean; // If true, skip loading conversations from backend
}

export const SmartDrawer: React.FC<SmartDrawerProps> = ({
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse,
  onNewChat,
  onSelectTopic,
  onSelectConversation,
  isGuest = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Get conversations from store
  const {
    conversations,
    currentConversation,
    isLoadingConversations,
    loadConversations,
    deleteConversationById,
  } = useChatStore();

  // Load conversations on mount (only for logged-in users)
  useEffect(() => {
    if (!isGuest) {
      loadConversations();
    }
  }, [isGuest, loadConversations]);

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

  // Convert store conversations to display format and filter
  const displayConversations: ConversationDisplay[] = conversations.map(c => ({
    id: c.id,
    title: c.title || 'Untitled',
    folderKey: c.folderKey,
    updatedAt: c.updatedAt,
  }));

  // 过滤对话
  const filteredConversations = displayConversations.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle delete conversation
  const handleDeleteConversation = async (conversationId: string): Promise<void> => {
    console.log('[SmartDrawer] Deleting conversation:', conversationId);
    try {
      await deleteConversationById(conversationId);
      console.log('[SmartDrawer] Delete successful');
    } catch (error) {
      console.error('[SmartDrawer] Failed to delete conversation:', error);
      throw error; // 重新抛出让调用者知道失败了
    }
  };

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
        {/* Header - Home按钮 + 收起/展开按钮 */}
        <div className={`flex border-b border-slate-100 ${effectiveCollapsed ? 'flex-col items-center py-3 gap-2' : 'flex-row items-center justify-between h-14 px-4'}`}>
          {/* 收起/展开按钮（桌面端）- 收起时在上方 */}
          {effectiveCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Expand sidebar"
            >
              <PanelLeft size={20} className="text-slate-600" />
            </button>
          )}

          {/* Home/Dashboard 按钮 */}
          <button
            onClick={onNewChat}
            className={`flex items-center gap-2 rounded-lg hover:bg-slate-100 transition-colors ${effectiveCollapsed ? 'p-2' : 'px-3 py-1.5'}`}
            title="Dashboard"
          >
            <Home size={20} className="text-slate-600" />
            {!effectiveCollapsed && <span className="text-sm font-medium text-slate-600">Dashboard</span>}
          </button>

          {/* 收起/展开按钮（桌面端）- 展开时在右侧 */}
          {!effectiveCollapsed && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:flex p-2 rounded-lg hover:bg-slate-100 transition-colors"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={20} className="text-slate-600" />
            </button>
          )}
        </div>

        {/* 搜索框 + 新建对话按钮（展开时） */}
        {!effectiveCollapsed && (
          <div className="px-3 pt-3 pb-3 flex items-center gap-2">
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
              {isLoadingConversations ? (
                !effectiveCollapsed && (
                  <div className="px-3 py-4 flex items-center justify-center">
                    <Loader2 size={20} className="text-slate-400 animate-spin" />
                  </div>
                )
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map(conversation => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    onClick={() => onSelectConversation(conversation.id)}
                    onDelete={() => handleDeleteConversation(conversation.id)}
                    isActive={currentConversation?.id === conversation.id}
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

        {/* Footer with Login/User */}
        {!effectiveCollapsed && (
          <div className="p-4 border-t border-slate-100">
            {isGuest ? (
              <button
                onClick={() => signIn('google')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-teal text-white rounded-lg hover:bg-primary-teal/90 transition-colors font-medium text-sm"
              >
                <LogIn size={18} />
                Sign in for unlimited
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-teal/10 flex items-center justify-center">
                  <User size={18} className="text-primary-teal" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 truncate">Logged in</p>
                  <button
                    onClick={() => signOut()}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};

export default SmartDrawer;
