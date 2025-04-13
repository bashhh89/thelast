import { create } from 'zustand';

// Define placeholder model IDs for internal search
export const INTERNAL_SEARCH_MODELS = [
  { id: 'internal-docs', name: 'SearchGPT (Internal Docs)' },
  { id: 'azure-example', name: 'SearchGPT (Azure Example)' },
  // Add more internal models as needed
];

interface SearchState {
  isWebSearchEnabled: boolean;
  selectedInternalSearchModel: string | null; // null means standard chat model is used
  setIsWebSearchEnabled: (enabled: boolean) => void;
  setSelectedInternalSearchModel: (modelId: string | null) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  isWebSearchEnabled: false,
  selectedInternalSearchModel: null, // Default to standard chat
  setIsWebSearchEnabled: (enabled) => set({ isWebSearchEnabled: enabled }),
  setSelectedInternalSearchModel: (modelId) => set({ selectedInternalSearchModel: modelId }),
})); 