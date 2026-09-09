import {create} from 'zustand';

type PlayerSetupStatus = 'initializing' | 'ready' | 'unavailable';

type PlayerStore = {
  setupStatus: PlayerSetupStatus;
  errorMessage: string | null;
  markReady: () => void;
  markUnavailable: (message: string) => void;
  reportError: (message: string) => void;
  clearError: () => void;
};

export const usePlayerStore = create<PlayerStore>(set => ({
  setupStatus: 'initializing',
  errorMessage: null,
  markReady: () => set({setupStatus: 'ready', errorMessage: null}),
  markUnavailable: message =>
    set({setupStatus: 'unavailable', errorMessage: message}),
  reportError: message => set({errorMessage: message}),
  clearError: () => set({errorMessage: null}),
}));
