import { create } from 'zustand';

interface AuthUIState {
  isLoginModalOpen: boolean;
  loginModalTab: 'login' | 'signup';
  openLoginModal: (tab?: 'login' | 'signup') => void;
  closeLoginModal: () => void;
}

export const useAuthUIStore = create<AuthUIState>((set) => ({
  isLoginModalOpen: false,
  loginModalTab: 'login',
  openLoginModal: (tab = 'login') => set({ isLoginModalOpen: true, loginModalTab: tab }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
}));
