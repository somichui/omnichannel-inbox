import { create } from 'zustand';
import { Message, MergeSuggestion } from '../types';

interface InboxState {
  messages: Message[];
  activePersonId: string | null;
  pendingSuggestion: MergeSuggestion | null;
  isLoading: boolean;
  drafts: Record<string, string>;
  currentView: 'inbox' | 'customers';
  customers: any[];
  
  setMessages: (messages: Message[]) => void;
  setActivePerson: (id: string | null) => void;
  setPendingSuggestion: (suggestion: MergeSuggestion | null) => void;
  setIsLoading: (isLoading: boolean) => void;
  setDraft: (personId: string, text: string) => void;
  setCurrentView: (view: 'inbox' | 'customers') => void;
  fetchInbox: () => Promise<void>;
  fetchSuggestions: () => Promise<void>;
  fetchCustomers: () => Promise<void>;
  unmergePerson: (personId: string, identityIds: string[]) => Promise<void>;
}

export const useInboxStore = create<InboxState>((set) => ({
  messages: [],
  activePersonId: null,
  pendingSuggestion: null,
  isLoading: true,
  drafts: {},
  currentView: 'inbox',
  customers: [],
  
  setMessages: (messages) => set({ messages }),
  setActivePerson: (activePersonId) => set({ activePersonId }),
  setPendingSuggestion: (pendingSuggestion) => set({ pendingSuggestion }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setDraft: (personId, text) => set((state) => ({
    drafts: { ...state.drafts, [personId]: text }
  })),
  setCurrentView: (currentView) => set({ currentView }),
  
  fetchInbox: async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/inbox`);
      if (res.ok) {
        const data = await res.json();
        set({ messages: data });
      }
    } catch (e) {
      console.error('Failed to fetch inbox:', e);
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchSuggestions: async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/suggestions/pending`);
      if (res.ok) {
        const data = await res.json();
        set({ pendingSuggestion: Object.keys(data).length > 0 ? data : null });
      }
    } catch (e) {
      console.error('Failed to fetch suggestions:', e);
    }
  },
  
  fetchCustomers: async () => {
    try {
      set({ isLoading: true });
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/customers`);
      if (res.ok) {
        const data = await res.json();
        set({ customers: data });
      }
    } catch (e) {
      console.error('Failed to fetch customers:', e);
    } finally {
      set({ isLoading: false });
    }
  },

  unmergePerson: async (personId: string, identityIds: string[]) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${apiUrl}/person/${personId}/unmerge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identityIds })
      });
      if (res.ok) {
        // Refresh state
        const state = useInboxStore.getState();
        await state.fetchCustomers();
        await state.fetchInbox();
        state.setActivePerson(null);
      }
    } catch (e) {
      console.error('Failed to unmerge person:', e);
    }
  }
}));
