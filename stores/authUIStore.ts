import { create } from 'zustand';

interface AuthUIState {
  isLoginModalOpen: boolean;
  loginModalTab: 'login' | 'signup';
  loginModalReason?: string;
  openLoginModal: (tab?: 'login' | 'signup', reason?: string) => void;
  closeLoginModal: () => void;
}

export const useAuthUIStore = create<AuthUIState>((set) => ({
  isLoginModalOpen: false,
  loginModalTab: 'login',
  loginModalReason: undefined,
  openLoginModal: (tab = 'login', reason) => set({ isLoginModalOpen: true, loginModalTab: tab, loginModalReason: reason }),
  closeLoginModal: () => set({ isLoginModalOpen: false, loginModalReason: undefined }),
}));
