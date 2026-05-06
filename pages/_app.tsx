import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import LoginModal from '@/components/Auth/LoginModal';
import { useAuthUIStore } from '@/stores/authUIStore';
import '../styles/globals.css';

function GlobalLoginModal() {
  const { isLoginModalOpen, loginModalTab, closeLoginModal } = useAuthUIStore();
  return (
    <LoginModal
      isOpen={isLoginModalOpen}
      onClose={closeLoginModal}
      defaultTab={loginModalTab}
    />
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider>
      <main>
        <Component {...pageProps} />
        <GlobalLoginModal />
      </main>
    </SessionProvider>
  );
}
