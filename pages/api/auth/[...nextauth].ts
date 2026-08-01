import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getSupabaseAdmin } from '@/lib/supabase';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

// 兼容你当前在 Vercel 中的变量命名（驼峰/大小写差异）
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.Google_Client_ID || process.env.GOOGLE_CLIENTId || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.Google_Client_secret || process.env.GOOGLE_CLIENTSecret || '';

if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  throw new Error('Missing NEXTAUTH_SECRET in production');
}

// 创建 providers 数组，避免 undefined 值
const providers: AuthOptions['providers'] = [];

// Email/Password 登录
providers.push(
  CredentialsProvider({
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email', placeholder: 'your@email.com' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials, req) {
      const normalizedEmail = credentials?.email?.toLowerCase().trim() || '';
      const password = credentials?.password || '';
      if (!normalizedEmail || !password || normalizedEmail.length > 254 || password.length > 128) {
        throw new Error('请输入邮箱和密码');
      }

      const forwardedFor = req.headers?.['x-forwarded-for'];
      const clientIp = typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : 'unknown';
      const rateLimitKey = `${normalizedEmail}:${clientIp}`;
      const attempt = checkRateLimit({
        namespace: 'credentials-login',
        key: rateLimitKey,
        limit: 10,
        windowMs: 15 * 60 * 1000,
      });
      if (attempt.limited) {
        throw new Error('尝试次数过多，请稍后再试');
      }

      const supabase = getSupabaseAdmin();

      // 查找用户
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, name, avatar_url, password_hash')
        .eq('email', normalizedEmail)
        .single();

      if (error || !user) {
        throw new Error('邮箱或密码错误');
      }

      if (!user.password_hash) {
        throw new Error('邮箱或密码错误，或请使用原注册方式');
      }

      // 验证密码
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        throw new Error('邮箱或密码错误');
      }

      resetRateLimit('credentials-login', rateLimitKey);

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.avatar_url,
      };
    },
  })
);

// Google OAuth
if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  providers.push(GoogleProvider({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET }));
}

export const authOptions: AuthOptions = {
  providers,
  secret: process.env.NEXTAUTH_SECRET,

  // Session 配置
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Callbacks
  callbacks: {
    async jwt({ token, user, account }) {
      // 首次登录时，将用户信息存入 token
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },

    async session({ session, token }) {
      // 将 token 信息传递到 session
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // 登录后重定向到 dashboard 或原始页面
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return `${baseUrl}/dashboard`;
    },
  },

  // Keep auth debug off by default: verbose OAuth logs can include sensitive data.
  debug: process.env.NEXTAUTH_DEBUG === 'true',
};

export default NextAuth(authOptions);
