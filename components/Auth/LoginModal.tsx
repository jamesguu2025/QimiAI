import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import { BarChart3, Brain, ListChecks, Mail, Lock, MessageCircle, User, Eye, EyeOff, X } from 'lucide-react';
import { PARENTAL_CONSENT_TEXT } from '@/lib/compliance/consent';
import { trackClientEvent } from '@/lib/client-analytics';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'signup';
  reason?: string;
}

function UnlockBenefitsPanel() {
  const benefits = [
    { label: 'Continue this chat', icon: MessageCircle },
    { label: 'Remember your family', icon: Brain },
    { label: "Save plans you've made", icon: ListChecks },
    { label: 'Track progress over time', icon: BarChart3 },
  ];

  return (
    <div className="mb-5 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200/70">
      <p className="text-[15px] font-semibold tracking-tight text-slate-900">
        Save this conversation
      </p>
      <p className="mt-0.5 text-xs text-slate-500">
        Sign up to keep what you&apos;ve built so far.
      </p>

      <ul className="mt-3 space-y-1.5">
        {benefits.map(({ label, icon: Icon }) => (
          <li key={label} className="flex items-center gap-2.5">
            <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary-teal" strokeWidth={2.25} />
            <span className="text-[13px] leading-tight text-slate-700">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function LoginModal({ isOpen, onClose, defaultTab = 'login', reason }: LoginModalProps) {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(defaultTab === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasConsent, setHasConsent] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLogin(defaultTab === 'login');
      setError('');
      setSuccess('');
      setFormData({ email: '', password: '', name: '' });
      setHasConsent(false);
    }
  }, [isOpen, defaultTab]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (isLogin) {
        const result = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.error) {
          setError(result.error);
        } else {
          trackClientEvent('auth:login_success', { method: 'credentials' });
          onClose();
          router.push('/chat');
        }
      } else {
        if (!hasConsent) {
          setError('Please confirm you are 18 or older and authorized to share this information before signing up.');
          setLoading(false);
          return;
        }

        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || 'Registration failed');
        } else {
          setSuccess('Registration successful! Logging in...');
          const loginResult = await signIn('credentials', {
            email: formData.email,
            password: formData.password,
            redirect: false,
          });
          if (loginResult?.ok) {
            const consentRes = await fetch('/api/compliance/consent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ consentText: PARENTAL_CONSENT_TEXT }),
            });

            if (!consentRes.ok) {
              onClose();
              router.push('/consent?returnTo=%2Fchat');
              return;
            }

            trackClientEvent('auth:signup_success', { method: 'credentials', consent_captured: true });
            onClose();
            router.push('/chat');
          }
        }
      }
    } catch (err) {
      setError('Network error, please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = (provider: string) => {
    signIn(provider, { callbackUrl: '/chat' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative mx-auto flex min-h-full w-full max-w-md items-center px-4 py-4 sm:py-6">
        <div className="relative max-h-[calc(100vh-2rem)] w-full overflow-y-auto bg-white rounded-2xl shadow-2xl animate-fade-in-up">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

        <div className="p-5 sm:p-8">
          {/* Header */}
          <div className="text-center mb-4 sm:mb-6">
            <img src="/logo.svg" alt="Qimi" className="h-9 sm:h-10 mx-auto mb-2 sm:mb-3" />
            <p className="text-slate-500 text-sm">
              {isLogin ? 'Welcome back!' : 'Create your account'}
            </p>
          </div>

          {reason && <UnlockBenefitsPanel />}

          {/* Tab Switcher */}
          <div className="flex mb-4 sm:mb-6 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                isLogin
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Log in
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                !isLogin
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Sign up
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-xl text-green-600 text-sm">
              {success}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name (optional)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder={isLogin ? 'Enter password' : 'At least 8 characters'}
                  required
                  minLength={isLogin ? undefined : 8}
                  className="w-full pl-10 pr-12 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-teal/20 focus:border-primary-teal transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {!isLogin && (
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left text-xs leading-relaxed text-slate-600">
                <input
                  type="checkbox"
                  checked={hasConsent}
                  onChange={(event) => {
                    setHasConsent(event.target.checked);
                    setError('');
                  }}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary-teal focus:ring-primary-teal"
                />
                <span>
                  By continuing, I confirm that I am 18 or older, that I will only provide child or family information I am authorized to share, and that I agree to the{' '}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-teal hover:underline"
                  >
                    Privacy Policy
                  </a>
                  {' '}and{' '}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary-teal hover:underline"
                  >
                    Terms of Service
                  </a>.
                </span>
              </label>
            )}

            <button
              type="submit"
              disabled={loading || (!isLogin && !hasConsent)}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
              ) : (
                isLogin ? 'Log in' : 'Sign up'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-4 sm:my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-slate-500">or continue with</span>
            </div>
          </div>

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => handleOAuthLogin('google')}
              className="w-full py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-medium rounded-xl transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </button>

          </div>

          {/* Terms */}
          {!isLogin && (
            <p className="mt-6 text-center text-xs text-slate-500">
              By signing up, you agree to our{' '}
              <a
                href="/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-teal hover:underline"
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-teal hover:underline"
              >
                Privacy Policy
              </a>
            </p>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
