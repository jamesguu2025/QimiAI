import NextAuth, { AuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import FacebookProvider from 'next-auth/providers/facebook';

// 兼容你当前在 Vercel 中的变量命名（驼峰/大小写差异）
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.Google_Client_ID || process.env.GOOGLE_CLIENTId || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || process.env.Google_Client_secret || process.env.GOOGLE_CLIENTSecret || '';
const FACEBOOK_CLIENT_ID = process.env.FACEBOOK_CLIENT_ID || process.env.Meta_Client_ID || '';
const FACEBOOK_CLIENT_SECRET = process.env.FACEBOOK_CLIENT_SECRET || process.env.Meta_Client_Secret || '';

export const authOptions: AuthOptions = {
  providers: [
    GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
      ? GoogleProvider({ clientId: GOOGLE_CLIENT_ID, clientSecret: GOOGLE_CLIENT_SECRET })
      : undefined,
    FACEBOOK_CLIENT_ID && FACEBOOK_CLIENT_SECRET
      ? FacebookProvider({ clientId: FACEBOOK_CLIENT_ID, clientSecret: FACEBOOK_CLIENT_SECRET })
      : undefined,
  ].filter((p): p is NonNullable<typeof p> => Boolean(p)),
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
