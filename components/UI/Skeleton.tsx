import React from 'react';

// ============================================================================
// 通用骨架屏组件
// ============================================================================

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) => {
  const baseClasses = 'bg-slate-200';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
    />
  );
};

// ============================================================================
// 消息骨架屏
// ============================================================================

interface MessageSkeletonProps {
  isUser?: boolean;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ isUser = false }) => {
  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* 消息气泡骨架 */}
        <div
          className={`
            rounded-2xl p-4 animate-pulse
            ${isUser
              ? 'bg-slate-100 rounded-tr-sm'
              : 'bg-slate-50'
            }
          `}
        >
          {/* 多行文本骨架 */}
          <div className="space-y-2">
            <Skeleton variant="text" width={isUser ? 120 : 200} height={16} />
            {!isUser && (
              <>
                <Skeleton variant="text" width={280} height={16} />
                <Skeleton variant="text" width={160} height={16} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 对话列表项骨架屏
// ============================================================================

export const ConversationItemSkeleton: React.FC = () => {
  return (
    <div className="w-full flex items-center gap-3 px-3 py-2.5 animate-pulse">
      {/* 图标 */}
      <Skeleton variant="circular" width={20} height={20} animation="none" />
      {/* 标题 */}
      <Skeleton variant="text" width="70%" height={16} animation="none" />
    </div>
  );
};

// ============================================================================
// 抽屉内容骨架屏
// ============================================================================

export const DrawerContentSkeleton: React.FC = () => {
  return (
    <div className="p-3 space-y-4 animate-pulse">
      {/* 搜索框骨架 */}
      <Skeleton variant="rounded" width="100%" height={40} />

      {/* Topics 标题 */}
      <div className="px-3 py-2">
        <Skeleton variant="text" width={60} height={12} />
      </div>

      {/* 板块列表骨架 */}
      <div className="space-y-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5">
            <Skeleton variant="circular" width={24} height={24} animation="none" />
            <Skeleton variant="text" width="60%" height={16} animation="none" />
          </div>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="mx-3 border-t border-slate-100" />

      {/* Recent 标题 */}
      <div className="px-3 py-2">
        <Skeleton variant="text" width={50} height={12} />
      </div>

      {/* 对话列表骨架 */}
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <ConversationItemSkeleton key={i} />
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// 聊天页面加载骨架屏
// ============================================================================

export const ChatPageSkeleton: React.FC = () => {
  return (
    <div className="h-screen flex bg-white">
      {/* 侧边栏骨架（桌面端） */}
      <div className="hidden lg:block w-72 border-r border-slate-100">
        {/* Header */}
        <div className="h-16 border-b border-slate-100 px-4 flex items-center justify-between">
          <Skeleton variant="rounded" width={80} height={32} />
          <div className="flex gap-2">
            <Skeleton variant="circular" width={36} height={36} />
            <Skeleton variant="circular" width={36} height={36} />
          </div>
        </div>
        <DrawerContentSkeleton />
      </div>

      {/* 主内容区骨架 */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
          <Skeleton variant="circular" width={36} height={36} className="lg:hidden" />
          <Skeleton variant="rounded" width={80} height={32} />
          <div className="w-10 lg:hidden" />
        </header>

        {/* 消息区域骨架 */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-3xl mx-auto px-4 py-8">
            <MessageSkeleton />
            <MessageSkeleton isUser />
            <MessageSkeleton />
          </div>
        </div>

        {/* 输入区域骨架 */}
        <div className="pb-6 pt-2 px-4 border-t border-slate-50">
          <div className="max-w-3xl mx-auto">
            <Skeleton variant="rounded" width="100%" height={48} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Skeleton;
