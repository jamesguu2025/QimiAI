import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import '../styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <main className={inter.className}>
        <Component {...pageProps} />
      </main>
    </SessionProvider>
  );
}
