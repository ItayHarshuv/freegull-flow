import { create } from 'zustand';

type UiState = {
  mobileNavOpen: boolean;
  setMobileNavOpen: (isOpen: boolean) => void;
};

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
}));
