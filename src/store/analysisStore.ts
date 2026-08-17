import { create } from 'zustand';
import { ParsedData, AnalysisResult } from '../lib/parser/dataTypes';

interface AnalysisState {
  checklist: {
    videos: boolean;
    searches: boolean;
    comments: boolean;
    likes: boolean;
    favorites: boolean;
    shares: boolean;
    reposts: boolean;
  };
  parsedData: ParsedData | null;
  results: AnalysisResult | null;
  isPremiumUnlocked: boolean;
  isProcessing: boolean;
  progress: number;
  reportId: string | null;
  encryptionKey: string | null;
  isStoryOpen: boolean;
  currentStoryIndex: number;

  // Actions
  toggleCheckItem: (key: 'videos' | 'searches' | 'comments' | 'likes' | 'favorites' | 'shares' | 'reposts') => void;
  setChecklistAll: (value: boolean) => void;
  setData: (data: ParsedData | null) => void;
  setResults: (results: AnalysisResult | null) => void;
  setProcessing: (val: boolean) => void;
  setProgress: (val: number) => void;
  unlockPremium: () => void;
  setShareInfo: (id: string, key: string) => void;
  openStory: () => void;
  closeStory: () => void;
  setCurrentStoryIndex: (index: number) => void;
  resetAll: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  checklist: {
    videos: true,
    searches: true,
    comments: true,
    likes: true,
    favorites: true,
    shares: true,
    reposts: true,
  },
  parsedData: null,
  results: null,
  isPremiumUnlocked: false,
  isProcessing: false,
  progress: 0,
  reportId: null,
  encryptionKey: null,
  isStoryOpen: false,
  currentStoryIndex: 0,

  toggleCheckItem: (key) =>
    set((state) => ({
      checklist: {
        ...state.checklist,
        [key]: !state.checklist[key],
      },
    })),

  setChecklistAll: (value) =>
    set({
      checklist: {
        videos: value,
        searches: value,
        comments: value,
        likes: value,
        favorites: value,
        shares: value,
        reposts: value,
      },
    }),

  setData: (data) => set({ parsedData: data }),
  setResults: (results) => set({
    results,
    isStoryOpen: Boolean(results),
    currentStoryIndex: 0,
  }),
  setProcessing: (val) => set({ isProcessing: val }),
  setProgress: (val) => set({ progress: val }),
  unlockPremium: () => set({ isPremiumUnlocked: true }),
  setShareInfo: (id, key) => set({ reportId: id, encryptionKey: key }),
  openStory: () => set({ isStoryOpen: true, currentStoryIndex: 0 }),
  closeStory: () => set({ isStoryOpen: false }),
  setCurrentStoryIndex: (index) => set({ currentStoryIndex: index }),
  
  resetAll: () => set({
    parsedData: null,
    results: null,
    isPremiumUnlocked: false,
    isProcessing: false,
    progress: 0,
    reportId: null,
    encryptionKey: null,
    isStoryOpen: false,
    currentStoryIndex: 0,
  }),
}));
