import Head from 'next/head';
import { useState } from 'react';
import {
  MessageSquare,
  Send,
  Plus,
  Menu,
  X,
  Sparkles,
  FileText,
  CreditCard,
  Check,
  User,
  Settings,
  Brain,
  Paperclip,
  Heart,
  BookOpen,
  Activity,
  Utensils,
  Users,
  Moon,
  School,
  Search,
  ChevronRight,
  Calendar,
  Baby,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  LogOut,
  Bell,
  Shield,
  HelpCircle,
  Download,
  Clock,
  Tag,
  Share2,
  Bookmark
} from 'lucide-react';

// 页面类型
type PageType = 'chat' | 'pricing' | 'login' | 'register' | 'profile' | 'child-profile' | 'growth-plans' | 'sections' | 'settings' | 'blog' | 'blog-detail';

// 模拟对话数据
const mockMessages = [
  {
    role: 'user',
    content: 'My 8-year-old has trouble focusing on homework. What strategies would you recommend?',
    time: '2:30 PM'
  },
  {
    role: 'assistant',
    content: `Great question! For an 8-year-old with attention challenges, here are some evidence-based strategies:

**1. Break Tasks Into Chunks**
Research shows that children with ADHD perform better with shorter, focused work periods. Try the "Pomodoro for Kids" approach:
- 10-15 minutes of focused work
- 5-minute movement break
- Repeat

**2. Create a Distraction-Free Zone**
- Remove visual clutter from the desk
- Use noise-canceling headphones or soft background music
- Face away from windows and high-traffic areas

**3. Use Visual Timers**
Visual representation of time helps children understand how long tasks will take. Try a sand timer or the Time Timer app.

📚 *Based on research from Dr. Russell Barkley (2020) on executive function interventions for ADHD children.*

Would you like me to create a personalized homework routine for your child?`,
    time: '2:31 PM',
    hasActionPlan: true
  }
];

// 侧边栏对话历史
const mockConversations = [
  { id: 1, title: 'Homework strategies for 8yo', time: 'Just now', active: true },
  { id: 2, title: 'Sleep routine questions', time: '2 hours ago' },
  { id: 3, title: 'IEP meeting preparation', time: 'Yesterday' },
  { id: 4, title: 'Emotional regulation tips', time: '2 days ago' },
  { id: 5, title: 'Medication discussion points', time: '1 week ago' },
];

// 8大板块数据
const sections = [
  { id: 'emotion', name: 'Emotional Support', icon: Heart, color: '#FF6B6B', desc: 'Regulate emotions, release stress' },
  { id: 'study', name: 'Learning Strategies', icon: BookOpen, color: '#4ECDC4', desc: 'Focus techniques, homework help' },
  { id: 'exercise', name: 'Exercise & Movement', icon: Activity, color: '#45B7D1', desc: 'Physical activities, sports guidance' },
  { id: 'nutrition', name: 'Diet & Nutrition', icon: Utensils, color: '#96CEB4', desc: 'Healthy eating, supplements' },
  { id: 'social', name: 'Social Skills', icon: Users, color: '#DDA0DD', desc: 'Friendships, communication' },
  { id: 'sleep', name: 'Sleep & Rest', icon: Moon, color: '#6C5CE7', desc: 'Bedtime routines, sleep quality' },
  { id: 'school', name: 'School Communication', icon: School, color: '#FDCB6E', desc: 'IEP, teacher meetings' },
  { id: 'brand', name: 'Supplement Research', icon: Search, color: '#A29BFE', desc: 'Brand verification, ingredients' },
];

// 成长方案数据
const mockGrowthPlans = [
  { id: 1, title: 'Homework Focus Routine', category: 'study', date: 'Dec 28, 2024', status: 'active' },
  { id: 2, title: 'Bedtime Calming Strategy', category: 'sleep', date: 'Dec 25, 2024', status: 'active' },
  { id: 3, title: 'Emotional Regulation Toolkit', category: 'emotion', date: 'Dec 20, 2024', status: 'completed' },
  { id: 4, title: 'Social Skills Practice Plan', category: 'social', date: 'Dec 15, 2024', status: 'completed' },
];

// 博客文章数据
const mockBlogPosts = [
  {
    id: 1,
    slug: 'adhd-sleep-research-2025',
    title: 'ADHD and Sleep: 2025 Research Breakthrough',
    excerpt: 'New studies reveal that improving sleep quality can significantly boost attention in ADHD children. Harvard researchers found a 40% improvement in focus after implementing structured bedtime routines.',
    category: 'Research',
    date: 'Jan 3, 2025',
    readTime: '5 min read',
    image: '/blog/sleep-research.jpg',
    color: '#6C5CE7',
    sourceInfo: 'Based on Harvard Medical School 2024 research'
  },
  {
    id: 2,
    slug: 'executive-function-strategies',
    title: 'Building Executive Function: A Parent\'s Guide',
    excerpt: 'Executive function is the brain\'s CEO. Learn practical strategies to help your child develop planning, organization, and self-control skills through everyday activities.',
    category: 'Parenting',
    date: 'Jan 1, 2025',
    readTime: '8 min read',
    image: '/blog/executive-function.jpg',
    color: '#00D4AA',
    sourceInfo: 'Based on Dr. Peg Dawson\'s research'
  },
  {
    id: 3,
    slug: 'nutrition-focus-connection',
    title: 'The Nutrition-Focus Connection in ADHD',
    excerpt: 'Discover how omega-3 fatty acids, protein timing, and blood sugar stability can naturally support attention and reduce hyperactivity symptoms in children.',
    category: 'Nutrition',
    date: 'Dec 28, 2024',
    readTime: '6 min read',
    image: '/blog/nutrition.jpg',
    color: '#96CEB4',
    sourceInfo: 'Based on NIH dietary intervention studies'
  },
  {
    id: 4,
    slug: 'emotional-regulation-toolkit',
    title: 'Emotional Regulation Toolkit for ADHD Kids',
    excerpt: 'Big emotions are common in ADHD. This evidence-based toolkit provides 10 practical techniques to help children identify, express, and manage their feelings.',
    category: 'Emotional Health',
    date: 'Dec 25, 2024',
    readTime: '7 min read',
    image: '/blog/emotions.jpg',
    color: '#FF6B6B',
    sourceInfo: 'Based on Yale RULER approach research'
  },
  {
    id: 5,
    slug: 'iep-advocacy-guide',
    title: 'IEP Advocacy: Getting Your Child the Support They Need',
    excerpt: 'Navigate the IEP process with confidence. Learn key accommodations for ADHD students, how to prepare for meetings, and your rights as a parent advocate.',
    category: 'Education',
    date: 'Dec 20, 2024',
    readTime: '10 min read',
    image: '/blog/iep.jpg',
    color: '#FDCB6E',
    sourceInfo: 'Based on CHADD advocacy guidelines'
  },
];

export default function Mockup() {
  const [currentPage, setCurrentPage] = useState<PageType>('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inputValue, setInputValue] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  // 渲染页面导航按钮
  const PageNavButton = ({ page, label }: { page: PageType; label: string }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
        currentPage === page
          ? 'bg-white text-gray-800'
          : 'text-white/80 hover:text-white hover:bg-white/20'
      }`}
    >
      {label}
    </button>
  );

  // ========== 登录页面 ==========
  const LoginPage = () => (
    <div className="min-h-[calc(100vh-40px)] flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-bold text-4xl" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Qimi
          </span>
          <p className="mt-2" style={{ color: '#5A6C7D' }}>Welcome back! Sign in to continue.</p>
        </div>

        {/* 登录表单 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl" style={{ border: '1px solid #e8f0ed' }}>
          {/* Google 登录 */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold transition-colors hover:bg-gray-50 mb-4" style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          {/* Apple 登录 */}
          <button className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold transition-colors hover:bg-gray-50 mb-6" style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            Continue with Apple
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: '1px solid #e8f0ed' }}></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white" style={{ color: '#9CA3AF' }}>or continue with email</span>
            </div>
          </div>

          {/* 邮箱输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-colors"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
              />
            </div>
          </div>

          {/* 密码输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                className="w-full pl-11 pr-11 py-3 rounded-xl outline-none transition-colors"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#9CA3AF' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* 登录按钮 */}
          <button
            onClick={() => { setIsLoggedIn(true); setCurrentPage('chat'); }}
            className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)' }}
          >
            Sign In
          </button>

          {/* 忘记密码 */}
          <div className="text-center mt-4">
            <a href="#" className="text-sm font-medium" style={{ color: '#00B894' }}>Forgot password?</a>
          </div>
        </div>

        {/* 注册链接 */}
        <p className="text-center mt-6" style={{ color: '#5A6C7D' }}>
          Don&apos;t have an account?{' '}
          <button onClick={() => setCurrentPage('register')} className="font-semibold" style={{ color: '#00B894' }}>Sign up</button>
        </p>
      </div>
    </div>
  );

  // ========== 注册页面 ==========
  const RegisterPage = () => (
    <div className="min-h-[calc(100vh-40px)] flex items-center justify-center p-4" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-bold text-4xl" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Qimi
          </span>
          <p className="mt-2" style={{ color: '#5A6C7D' }}>Create your account to get started.</p>
        </div>

        {/* 注册表单 */}
        <div className="bg-white rounded-2xl p-8 shadow-xl" style={{ border: '1px solid #e8f0ed' }}>
          {/* 姓名输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Full Name</label>
            <div className="relative">
              <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type="text"
                placeholder="John Doe"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-colors"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
              />
            </div>
          </div>

          {/* 邮箱输入 */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Email</label>
            <div className="relative">
              <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full pl-11 pr-4 py-3 rounded-xl outline-none transition-colors"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
              />
            </div>
          </div>

          {/* 密码输入 */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Password</label>
            <div className="relative">
              <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                className="w-full pl-11 pr-11 py-3 rounded-xl outline-none transition-colors"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2"
                style={{ color: '#9CA3AF' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>At least 8 characters with uppercase, lowercase, and number</p>
          </div>

          {/* 注册按钮 */}
          <button
            onClick={() => { setIsLoggedIn(true); setCurrentPage('child-profile'); }}
            className="w-full py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)' }}
          >
            Create Account
          </button>

          {/* 条款 */}
          <p className="text-xs text-center mt-4" style={{ color: '#9CA3AF' }}>
            By signing up, you agree to our{' '}
            <a href="#" style={{ color: '#00B894' }}>Terms of Service</a> and{' '}
            <a href="#" style={{ color: '#00B894' }}>Privacy Policy</a>
          </p>
        </div>

        {/* 登录链接 */}
        <p className="text-center mt-6" style={{ color: '#5A6C7D' }}>
          Already have an account?{' '}
          <button onClick={() => setCurrentPage('login')} className="font-semibold" style={{ color: '#00B894' }}>Sign in</button>
        </p>
      </div>
    </div>
  );

  // ========== 孩子档案页面 ==========
  const ChildProfilePage = () => (
    <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2d3a36' }}>Child Profile</h1>
        <p className="mb-8" style={{ color: '#5A6C7D' }}>Help us personalize advice for your child.</p>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg" style={{ border: '1px solid #e8f0ed' }}>
          {/* 头像区域 */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
                👦
              </div>
              <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center" style={{ border: '2px solid #e8f0ed' }}>
                <Plus size={16} style={{ color: '#00B894' }} />
              </button>
            </div>
          </div>

          {/* 表单 */}
          <div className="space-y-6">
            {/* 昵称 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Nickname</label>
              <input
                type="text"
                placeholder="How should we call your child?"
                className="w-full px-4 py-3 rounded-xl outline-none"
                style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
                defaultValue="Alex"
              />
            </div>

            {/* 生日 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Birthday</label>
              <div className="relative">
                <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
                <input
                  type="date"
                  className="w-full pl-11 pr-4 py-3 rounded-xl outline-none"
                  style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}
                  defaultValue="2016-05-15"
                />
              </div>
            </div>

            {/* 性别 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Gender</label>
              <div className="flex gap-4">
                {['Boy', 'Girl', 'Other'].map((gender) => (
                  <button
                    key={gender}
                    className="flex-1 py-3 rounded-xl font-medium transition-all"
                    style={{
                      background: gender === 'Boy' ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' : '#F8FAFC',
                      border: gender === 'Boy' ? '2px solid #00D4AA' : '2px solid #e8f0ed',
                      color: gender === 'Boy' ? '#00B894' : '#5A6C7D'
                    }}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* 主要关注点 */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: '#2d3a36' }}>Main Concerns (select all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {['Focus & Attention', 'Emotional Regulation', 'Sleep Issues', 'Social Skills', 'School Performance', 'Hyperactivity'].map((concern, i) => (
                  <button
                    key={concern}
                    className="py-3 px-4 rounded-xl font-medium text-sm transition-all text-left"
                    style={{
                      background: i < 2 ? 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' : '#F8FAFC',
                      border: i < 2 ? '2px solid #00D4AA' : '2px solid #e8f0ed',
                      color: i < 2 ? '#00B894' : '#5A6C7D'
                    }}
                  >
                    {i < 2 && <Check size={14} className="inline mr-2" />}
                    {concern}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 保存按钮 */}
          <button
            onClick={() => setCurrentPage('chat')}
            className="w-full mt-8 py-3 rounded-xl text-white font-semibold transition-opacity hover:opacity-90 shadow-lg"
            style={{ background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)' }}
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );

  // ========== 用户设置页面 ==========
  const SettingsPage = () => (
    <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className="text-2xl font-bold mb-8" style={{ color: '#2d3a36' }}>Settings</h1>

        {/* 用户卡片 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6" style={{ border: '1px solid #e8f0ed' }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
              J
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg" style={{ color: '#2d3a36' }}>James G.</h3>
              <p className="text-sm" style={{ color: '#5A6C7D' }}>james@example.com</p>
            </div>
            <button className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: '#F8FAFC', color: '#5A6C7D', border: '1px solid #e8f0ed' }}>
              Edit
            </button>
          </div>
        </div>

        {/* 订阅状态 */}
        <div className="bg-white rounded-2xl p-6 shadow-lg mb-6" style={{ border: '1px solid #e8f0ed' }}>
          <h3 className="font-semibold mb-4" style={{ color: '#2d3a36' }}>Subscription</h3>
          <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)' }}>
            <div>
              <span className="font-semibold" style={{ color: '#00B894' }}>Basic Plan</span>
              <p className="text-sm" style={{ color: '#5A6C7D' }}>Renews Jan 28, 2025</p>
            </div>
            <button onClick={() => setCurrentPage('pricing')} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)' }}>
              Upgrade
            </button>
          </div>
        </div>

        {/* 设置列表 */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ border: '1px solid #e8f0ed' }}>
          {[
            { icon: Baby, label: 'Child Profile', page: 'child-profile' as PageType },
            { icon: Bell, label: 'Notifications', page: null },
            { icon: Shield, label: 'Privacy & Security', page: null },
            { icon: Download, label: 'Export Data', page: null },
            { icon: HelpCircle, label: 'Help & Support', page: null },
          ].map((item, i) => (
            <button
              key={item.label}
              onClick={() => item.page && setCurrentPage(item.page)}
              className="w-full flex items-center gap-4 p-4 transition-colors hover:bg-gray-50"
              style={{ borderTop: i > 0 ? '1px solid #e8f0ed' : 'none' }}
            >
              <item.icon size={20} style={{ color: '#5A6C7D' }} />
              <span className="flex-1 text-left font-medium" style={{ color: '#2d3a36' }}>{item.label}</span>
              <ChevronRight size={18} style={{ color: '#9CA3AF' }} />
            </button>
          ))}
        </div>

        {/* 登出按钮 */}
        <button
          onClick={() => { setIsLoggedIn(false); setCurrentPage('login'); }}
          className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-colors hover:bg-red-50"
          style={{ color: '#EF4444', border: '2px solid #FEE2E2' }}
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </div>
  );

  // ========== 成长方案列表页 ==========
  const GrowthPlansPage = () => (
    <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-3xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#2d3a36' }}>Growth Plans</h1>
            <p style={{ color: '#5A6C7D' }}>Your saved intervention strategies</p>
          </div>
          <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00B894' }}>
            {mockGrowthPlans.length} plans
          </span>
        </div>

        {/* 方案列表 */}
        <div className="space-y-4">
          {mockGrowthPlans.map((plan) => {
            const section = sections.find(s => s.id === plan.category);
            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl p-5 shadow-lg transition-all hover:shadow-xl cursor-pointer"
                style={{ border: '1px solid #e8f0ed' }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${section?.color}20` }}
                  >
                    {section && <section.icon size={24} style={{ color: section.color }} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1" style={{ color: '#2d3a36' }}>{plan.title}</h3>
                    <p className="text-sm" style={{ color: '#5A6C7D' }}>{plan.date}</p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-medium"
                    style={{
                      background: plan.status === 'active' ? 'rgba(0, 212, 170, 0.1)' : '#F8FAFC',
                      color: plan.status === 'active' ? '#00B894' : '#9CA3AF'
                    }}
                  >
                    {plan.status === 'active' ? 'Active' : 'Completed'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ========== 板块选择页面 ==========
  const SectionsPage = () => (
    <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-4xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        <h1 className="text-2xl font-bold mb-2" style={{ color: '#2d3a36' }}>Topic Sections</h1>
        <p className="mb-8" style={{ color: '#5A6C7D' }}>Choose a specific area to get focused support.</p>

        {/* 板块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setCurrentPage('chat')}
              className="bg-white rounded-2xl p-5 shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] text-left"
              style={{ border: '1px solid #e8f0ed' }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${section.color}20` }}
                >
                  <section.icon size={28} style={{ color: section.color }} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-1" style={{ color: '#2d3a36' }}>{section.name}</h3>
                  <p className="text-sm" style={{ color: '#5A6C7D' }}>{section.desc}</p>
                </div>
                <ChevronRight size={20} style={{ color: '#9CA3AF' }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ========== 博客列表页面 ==========
  const [selectedBlogPost, setSelectedBlogPost] = useState<typeof mockBlogPosts[0] | null>(null);

  const BlogPage = () => (
    <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-5xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        {/* 页面标题 */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4" style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00B894' }}>
            <BookOpen size={16} />
            Research & Insights
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2d3a36' }}>
            ADHD Knowledge Hub
          </h1>
          <p className="text-lg" style={{ color: '#5A6C7D' }}>
            Evidence-based articles, research summaries, and practical strategies for ADHD families.
          </p>
        </div>

        {/* 分类筛选 */}
        <div className="flex flex-wrap gap-2 mb-8">
          {['All', 'Research', 'Parenting', 'Nutrition', 'Emotional Health', 'Education'].map((cat, i) => (
            <button
              key={cat}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all"
              style={{
                background: i === 0 ? 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' : '#F8FAFC',
                color: i === 0 ? '#fff' : '#5A6C7D',
                border: i === 0 ? 'none' : '1px solid #e8f0ed'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 博客文章列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockBlogPosts.map((post) => (
            <button
              key={post.id}
              onClick={() => { setSelectedBlogPost(post); setCurrentPage('blog-detail'); }}
              className="bg-white rounded-2xl overflow-hidden shadow-lg transition-all hover:shadow-xl hover:scale-[1.02] text-left"
              style={{ border: '1px solid #e8f0ed' }}
            >
              {/* 文章封面占位 */}
              <div className="h-40 relative" style={{ background: `linear-gradient(135deg, ${post.color}20 0%, ${post.color}40 100%)` }}>
                <div className="absolute inset-0 flex items-center justify-center">
                  <BookOpen size={48} style={{ color: post.color, opacity: 0.5 }} />
                </div>
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: post.color }}>
                    {post.category}
                  </span>
                </div>
              </div>

              {/* 文章信息 */}
              <div className="p-5">
                <h3 className="font-bold text-lg mb-2 line-clamp-2" style={{ color: '#2d3a36' }}>
                  {post.title}
                </h3>
                <p className="text-sm mb-4 line-clamp-2" style={{ color: '#5A6C7D' }}>
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between text-xs" style={{ color: '#9CA3AF' }}>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {post.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {post.readTime}
                    </span>
                  </div>
                  <ChevronRight size={16} style={{ color: post.color }} />
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* 加载更多 */}
        <div className="text-center mt-8">
          <button className="px-6 py-3 rounded-xl font-semibold transition-colors hover:bg-gray-50" style={{ border: '2px solid #e8f0ed', color: '#5A6C7D' }}>
            Load More Articles
          </button>
        </div>
      </div>
    </div>
  );

  // ========== 博客详情页面 ==========
  const BlogDetailPage = () => {
    const post = selectedBlogPost || mockBlogPosts[0];
    return (
      <div className="min-h-[calc(100vh-40px)] p-4 md:p-8" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
        <div className="max-w-3xl mx-auto">
          {/* 返回按钮 */}
          <button onClick={() => setCurrentPage('blog')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
            <ArrowLeft size={20} />
            Back to Articles
          </button>

          {/* 文章头部 */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: post.color }}>
                {post.category}
              </span>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>{post.date}</span>
              <span className="text-sm" style={{ color: '#9CA3AF' }}>•</span>
              <span className="text-sm flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                <Clock size={14} />
                {post.readTime}
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2d3a36' }}>
              {post.title}
            </h1>
            <p className="text-lg" style={{ color: '#5A6C7D' }}>
              {post.excerpt}
            </p>
          </div>

          {/* 文章封面 */}
          <div className="h-64 rounded-2xl mb-8 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${post.color}20 0%, ${post.color}40 100%)` }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <BookOpen size={80} style={{ color: post.color, opacity: 0.3 }} />
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 mb-8">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors hover:bg-gray-50" style={{ border: '1px solid #e8f0ed', color: '#5A6C7D' }}>
              <Share2 size={16} />
              Share
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors hover:bg-gray-50" style={{ border: '1px solid #e8f0ed', color: '#5A6C7D' }}>
              <Bookmark size={16} />
              Save
            </button>
          </div>

          {/* 文章内容（模拟） */}
          <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg mb-8" style={{ border: '1px solid #e8f0ed' }}>
            <div className="prose prose-lg max-w-none" style={{ color: '#2d3a36', lineHeight: '1.8' }}>
              <p className="mb-6">
                Understanding the connection between sleep and ADHD is crucial for parents looking to support their children&apos;s development. Recent research from leading institutions has shed new light on this important relationship.
              </p>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#2d3a36' }}>Key Findings</h2>
              <p className="mb-6">
                A 2024 study conducted by Harvard Medical School found that children with ADHD who maintained consistent sleep schedules showed a 40% improvement in attention span during daytime activities. This groundbreaking research involved over 500 participants and spanned 18 months.
              </p>
              <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(0, 212, 170, 0.1)', borderLeft: '4px solid #00D4AA' }}>
                <p className="text-sm font-medium" style={{ color: '#00B894' }}>
                  💡 Key Insight: Consistent bedtimes are more important than total sleep duration for ADHD children.
                </p>
              </div>
              <h2 className="text-xl font-bold mb-4" style={{ color: '#2d3a36' }}>Practical Strategies</h2>
              <ul className="list-disc pl-6 mb-6 space-y-2">
                <li>Establish a consistent bedtime routine (30-45 minutes before sleep)</li>
                <li>Reduce screen time at least 1 hour before bed</li>
                <li>Create a cool, dark, and quiet sleep environment</li>
                <li>Consider melatonin supplements (consult your pediatrician first)</li>
                <li>Use weighted blankets for calming sensory input</li>
              </ul>
              <p className="mb-6">
                By implementing these evidence-based strategies, many families have reported significant improvements in their children&apos;s focus, mood, and overall behavior.
              </p>
            </div>
          </div>

          {/* 来源信息 */}
          <div className="bg-white rounded-2xl p-5 shadow-lg mb-8" style={{ border: '1px solid #e8f0ed' }}>
            <div className="flex items-start gap-3">
              <Tag size={20} style={{ color: '#00B894' }} />
              <div>
                <h4 className="font-semibold mb-1" style={{ color: '#2d3a36' }}>Source Information</h4>
                <p className="text-sm" style={{ color: '#5A6C7D' }}>{post.sourceInfo}</p>
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  This article has been AI-rewritten for clarity while maintaining factual accuracy. Original research citations are available upon request.
                </p>
              </div>
            </div>
          </div>

          {/* 相关文章 */}
          <div>
            <h3 className="font-bold text-lg mb-4" style={{ color: '#2d3a36' }}>Related Articles</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockBlogPosts.filter(p => p.id !== post.id).slice(0, 2).map((relatedPost) => (
                <button
                  key={relatedPost.id}
                  onClick={() => setSelectedBlogPost(relatedPost)}
                  className="bg-white rounded-xl p-4 shadow-md transition-all hover:shadow-lg text-left flex gap-4"
                  style={{ border: '1px solid #e8f0ed' }}
                >
                  <div className="w-16 h-16 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${relatedPost.color}20` }}>
                    <BookOpen size={24} style={{ color: relatedPost.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-2 mb-1" style={{ color: '#2d3a36' }}>{relatedPost.title}</h4>
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{relatedPost.readTime}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ========== 定价页面 ==========
  const PricingPage = () => (
    <div className="min-h-[calc(100vh-40px)] py-12 px-4" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #ffffff 100%)' }}>
      <div className="max-w-6xl mx-auto">
        {/* 返回按钮 */}
        <button onClick={() => setCurrentPage('chat')} className="flex items-center gap-2 mb-6 font-medium" style={{ color: '#5A6C7D' }}>
          <ArrowLeft size={20} />
          Back
        </button>

        {/* 标题 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-6" style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00B894' }}>
            <Sparkles size={16} />
            Simple, Transparent Pricing
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#2d3a36' }}>
            Choose Your Plan
          </h1>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#5A6C7D' }}>
            Start free, upgrade when you need more. Cancel anytime.
          </p>
        </div>

        {/* 定价卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {/* Free Plan */}
          <div
            className={`relative bg-white rounded-2xl border-2 p-6 transition-all cursor-pointer shadow-lg ${selectedPlan === 'free' ? 'scale-105' : 'hover:shadow-xl'}`}
            style={{ borderColor: selectedPlan === 'free' ? '#00D4AA' : '#e8f0ed' }}
            onClick={() => setSelectedPlan('free')}
          >
            <h3 className="text-lg font-bold mb-2" style={{ color: '#2d3a36' }}>Free</h3>
            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-3xl font-bold" style={{ color: '#2d3a36' }}>$0</span>
              <span style={{ color: '#5A6C7D' }}>/month</span>
            </div>
            <ul className="space-y-2 mb-6">
              {['10 AI messages/day', '3 RAG queries/day', '7-day history'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#2d3a36' }}>
                  <Check size={16} style={{ color: '#00D4AA' }} />{f}
                </li>
              ))}
            </ul>
            <button className="w-full py-2.5 rounded-xl font-semibold transition-colors hover:bg-gray-50" style={{ border: '2px solid #e8f0ed', color: '#2d3a36' }}>
              Get Started
            </button>
          </div>

          {/* Basic Plan */}
          <div
            className={`relative bg-white rounded-2xl border-2 p-6 transition-all cursor-pointer shadow-xl ${selectedPlan === 'basic' ? 'scale-105' : ''}`}
            style={{ borderColor: selectedPlan === 'basic' ? '#00D4AA' : 'rgba(0, 212, 170, 0.5)' }}
            onClick={() => setSelectedPlan('basic')}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <div className="text-white text-xs font-bold px-3 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #26A69A 100%)' }}>
                MOST POPULAR
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 pt-2" style={{ color: '#2d3a36' }}>Basic</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold" style={{ color: '#2d3a36' }}>$9.99</span>
              <span style={{ color: '#5A6C7D' }}>/month</span>
            </div>
            <p className="text-xs font-medium mb-4" style={{ color: '#00B894' }}>or $99/year (save 17%)</p>
            <ul className="space-y-2 mb-6">
              {['100 AI messages/day', '20 RAG queries/day', '30-day history', 'Growth Plans', 'PDF Export'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#2d3a36' }}>
                  <Check size={16} style={{ color: '#00D4AA' }} />{f}
                </li>
              ))}
            </ul>
            <button className="w-full py-2.5 rounded-xl text-white font-semibold shadow-lg" style={{ background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)' }}>
              Start Free Trial
            </button>
          </div>

          {/* Premium Plan */}
          <div
            className={`relative bg-white rounded-2xl border-2 p-6 transition-all cursor-pointer shadow-lg ${selectedPlan === 'premium' ? 'scale-105' : 'hover:shadow-xl'}`}
            style={{ borderColor: selectedPlan === 'premium' ? '#00D4AA' : '#e8f0ed' }}
            onClick={() => setSelectedPlan('premium')}
          >
            <div className="absolute -top-3 right-4">
              <div className="text-white text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
                PRO
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#2d3a36' }}>Premium</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-bold" style={{ color: '#2d3a36' }}>$19.99</span>
              <span style={{ color: '#5A6C7D' }}>/month</span>
            </div>
            <p className="text-xs font-medium mb-4" style={{ color: '#00B894' }}>or $199/year (save 17%)</p>
            <ul className="space-y-2 mb-6">
              {['Unlimited AI messages', 'Unlimited RAG', 'Unlimited history', 'Advanced Plans', 'GPT-4 access'].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm" style={{ color: '#2d3a36' }}>
                  <Check size={16} style={{ color: '#00D4AA' }} />{f}
                </li>
              ))}
            </ul>
            <button className="w-full py-2.5 rounded-xl text-white font-semibold" style={{ background: '#2d3a36' }}>
              Go Premium
            </button>
          </div>
        </div>

        {/* 信任标志 */}
        <div className="mt-12 text-center">
          <div className="flex items-center justify-center gap-6" style={{ color: '#5A6C7D' }}>
            <div className="flex items-center gap-2">
              <CreditCard size={18} />
              <span className="text-sm">Secure via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={18} style={{ color: '#00D4AA' }} />
              <span className="text-sm">Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ========== 主对话页面 ==========
  const ChatPage = () => (
    <div className="flex h-[calc(100vh-40px)]">
      {/* 侧边栏 */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-0'} bg-white flex flex-col transition-all overflow-hidden`} style={{ borderRight: '1px solid #e8f0ed' }}>
        {/* 侧边栏头部 */}
        <div className="p-4" style={{ borderBottom: '1px solid #e8f0ed' }}>
          <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-colors hover:bg-gray-200" style={{ background: '#F3F4F6', color: '#2d3a36' }}>
            <Plus size={20} />
            New Chat
          </button>
        </div>

        {/* 板块入口 */}
        <button
          onClick={() => setCurrentPage('sections')}
          className="mx-4 mt-4 flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50"
          style={{ background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', border: '1px solid rgba(0, 212, 170, 0.3)' }}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <span className="text-sm font-medium" style={{ color: '#2d3a36' }}>Topic Sections</span>
            <p className="text-xs" style={{ color: '#5A6C7D' }}>8 focused areas</p>
          </div>
          <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
        </button>

        {/* 对话列表 */}
        <div className="flex-1 overflow-y-auto p-2 mt-2" style={{ background: '#F8FAFC' }}>
          <div className="text-xs font-semibold uppercase tracking-wider px-3 py-2" style={{ color: '#4B5563' }}>
            Recent Conversations
          </div>
          {mockConversations.map((conv) => (
            <div
              key={conv.id}
              className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-colors"
              style={conv.active
                ? { background: 'linear-gradient(135deg, rgba(0, 212, 170, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)', borderLeft: '4px solid #00D4AA' }
                : { background: '#fff' }
              }
            >
              <MessageSquare size={18} className="flex-shrink-0" style={{ color: conv.active ? '#00D4AA' : '#6B7280' }} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: '#1F2937' }}>{conv.title}</div>
                <div className="text-xs" style={{ color: '#9CA3AF' }}>{conv.time}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 成长方案入口 */}
        <button
          onClick={() => setCurrentPage('growth-plans')}
          className="mx-4 mb-4 flex items-center gap-3 p-3 rounded-xl transition-colors hover:bg-gray-50"
          style={{ border: '1px solid #e8f0ed' }}
        >
          <FileText size={18} style={{ color: '#00B894' }} />
          <span className="flex-1 text-left text-sm font-medium" style={{ color: '#2d3a36' }}>Growth Plans</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'rgba(0, 212, 170, 0.1)', color: '#00B894' }}>4</span>
        </button>

        {/* 用户信息 */}
        <div className="p-4" style={{ borderTop: '1px solid #e8f0ed' }}>
          <button
            onClick={() => setCurrentPage('settings')}
            className="w-full flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors hover:bg-gray-50"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
              J
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-medium" style={{ color: '#1F2937' }}>James G.</div>
              <div className="text-xs font-medium" style={{ color: '#00B894' }}>Basic Plan</div>
            </div>
            <Settings size={18} style={{ color: '#9CA3AF' }} />
          </button>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #fefefe 15%)' }}>
        {/* 顶部导航 */}
        <div className="h-16 bg-transparent flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 rounded-lg transition-colors hover:bg-white/50">
            {sidebarOpen ? <X size={20} style={{ color: '#536471' }} /> : <Menu size={20} style={{ color: '#536471' }} />}
          </button>
          <span className="font-bold text-2xl" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Qimi
          </span>
          <div className="w-10" />
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-6 md:px-12 py-4">
          <div className="max-w-3xl mx-auto space-y-8">
            {mockMessages.map((msg, index) => (
              <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'assistant' && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #26A69A 100%)' }}>
                    <Brain size={20} />
                  </div>
                )}
                <div className={`max-w-[75%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                  <div
                    className="p-6"
                    style={msg.role === 'user'
                      ? { background: 'linear-gradient(145deg, #D4EDE5 0%, #C8E6DC 100%)', color: '#2d3a36', borderRadius: '28px 28px 8px 28px', boxShadow: '0 2px 4px rgba(0, 180, 148, 0.08), 0 8px 20px rgba(0, 0, 0, 0.10)' }
                      : { color: '#2d3a36' }
                    }
                  >
                    {msg.role === 'assistant' ? (
                      <div className="prose prose-sm max-w-none" style={{ lineHeight: '1.8' }} dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                    ) : (
                      <p style={{ lineHeight: '1.7' }}>{msg.content}</p>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-right' : ''}`} style={{ color: '#9CA3AF' }}>{msg.time}</div>
                  {msg.hasActionPlan && (
                    <button onClick={() => setCurrentPage('growth-plans')} className="mt-4 flex items-center gap-2 px-5 py-3 bg-white rounded-2xl text-sm font-semibold transition-all shadow-md hover:shadow-lg" style={{ color: '#00B894', border: '1px solid #e8f0ed' }}>
                      <FileText size={16} />
                      Save to Growth Plan
                    </button>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#E5E7EB', color: '#6B7280' }}>
                    <User size={20} />
                  </div>
                )}
              </div>
            ))}
            <div className="inline-flex items-center gap-2 text-sm bg-white px-4 py-3 rounded-2xl shadow-md" style={{ color: '#374151' }}>
              <span className="font-medium" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>📚 1 paper cited</span>
              <span style={{ color: '#9CA3AF' }}>›</span>
            </div>
          </div>
        </div>

        {/* 输入区域 */}
        <div className="p-6" style={{ background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)' }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4">
              <button className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all flex-shrink-0" style={{ border: '1px solid #e8f0ed' }}>
                <Paperclip size={22} style={{ color: '#00B894' }} />
              </button>
              <div className="flex-1 bg-white rounded-full px-6 py-4 shadow-md" style={{ border: '2px solid #e8f0ed' }}>
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask anything about ADHD parenting..."
                  className="w-full bg-transparent outline-none text-base"
                  style={{ color: '#2d3a36' }}
                />
              </div>
              <button
                className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-lg"
                style={inputValue
                  ? { background: 'linear-gradient(145deg, #5DBFAB 0%, #4EB5A0 100%)', color: '#fff' }
                  : { background: 'linear-gradient(145deg, #f0f0f0 0%, #e0e0e0 100%)', color: '#999' }
                }
              >
                <Send size={20} />
              </button>
            </div>
            <div className="flex items-center justify-between mt-3 px-2">
              <div className="text-xs" style={{ color: '#9CA3AF' }}>
                <span className="font-medium" style={{ color: '#00B894' }}>87</span> messages remaining today
              </div>
              <div className="text-xs" style={{ color: '#9CA3AF' }}>Powered by GPT-4o-mini</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 渲染当前页面
  const renderPage = () => {
    switch (currentPage) {
      case 'login': return <LoginPage />;
      case 'register': return <RegisterPage />;
      case 'child-profile': return <ChildProfilePage />;
      case 'settings': return <SettingsPage />;
      case 'growth-plans': return <GrowthPlansPage />;
      case 'sections': return <SectionsPage />;
      case 'pricing': return <PricingPage />;
      case 'blog': return <BlogPage />;
      case 'blog-detail': return <BlogDetailPage />;
      default: return <ChatPage />;
    }
  };

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(180deg, #f0faf8 0%, #fefefe 30%)' }}>
      <Head>
        <title>Qimi AI - App Mockup Preview</title>
        <meta name="description" content="Preview of the upcoming Qimi AI web application" />
        <link rel="icon" href="/favicon.svg" />
      </Head>

      {/* 顶部导航条 */}
      <div className="text-white py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 flex-wrap" style={{ background: 'linear-gradient(135deg, #00D4AA 0%, #8B5CF6 100%)' }}>
        <span>🎨 Design Mockup:</span>
        <PageNavButton page="chat" label="Chat" />
        <PageNavButton page="sections" label="Sections" />
        <PageNavButton page="growth-plans" label="Plans" />
        <PageNavButton page="child-profile" label="Child" />
        <PageNavButton page="settings" label="Settings" />
        <PageNavButton page="pricing" label="Pricing" />
        <PageNavButton page="blog" label="Blog" />
        <PageNavButton page="login" label="Login" />
        <PageNavButton page="register" label="Register" />
      </div>

      {renderPage()}
    </div>
  );
}
