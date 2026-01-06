/**
 * LoginWall - 登录墙组件
 *
 * 当访客达到消息限制时显示，引导用户注册以继续使用
 * 设计原则：清晰价值主张，不强制（可关闭），提供继续试用选项
 */

import { signIn } from 'next-auth/react';
import { X, Check, Sparkles, MessageSquare } from 'lucide-react';

interface LoginWallProps {
  onClose: () => void;
  messageCount: number;
  maxMessages: number;
}

const BENEFITS = [
  { text: 'Unlimited AI conversations', icon: MessageSquare },
  { text: 'Save your chat history', icon: Check },
  { text: 'Personalized ADHD insights', icon: Sparkles },
  { text: 'Your child\'s profile saved', icon: Check },
];

export default function LoginWall({ onClose, messageCount, maxMessages }: LoginWallProps) {
  const handleSignUp = () => {
    signIn('google', { callbackUrl: '/chat' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        {/* 顶部渐变装饰 */}
        <div className="h-2 bg-gradient-to-r from-primary-teal to-primary-purple" />

        <div className="p-6 pt-8">
          {/* 消息使用情况 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-medium mb-4">
              <MessageSquare size={16} />
              {messageCount} of {maxMessages} free messages used
            </div>

            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              Save Your Progress
            </h2>
            <p className="text-slate-500">
              Sign up to continue your conversation and unlock all features
            </p>
          </div>

          {/* 权益列表 */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <ul className="space-y-3">
              {BENEFITS.map((benefit, index) => (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-teal/20 to-primary-purple/20 flex items-center justify-center">
                    <benefit.icon size={16} className="text-primary-purple" />
                  </div>
                  <span className="text-slate-700 font-medium">{benefit.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Google 登录按钮 */}
          <button
            onClick={handleSignUp}
            className="w-full py-3 rounded-xl font-semibold bg-gradient-to-r from-primary-teal to-primary-purple text-white hover:opacity-90 transition-opacity shadow-lg shadow-primary-purple/20 flex items-center justify-center gap-2 mb-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* 继续试用按钮 */}
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Continue as Guest (limited)
          </button>

          {/* 底部提示 */}
          <p className="text-center text-xs text-slate-400 mt-4">
            Your guest data will be automatically saved to your account
          </p>
        </div>
      </div>
    </div>
  );
}
