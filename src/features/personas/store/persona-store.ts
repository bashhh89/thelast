// Basic Zustand store for managing personas
import { create } from 'zustand';
import { Persona, PersonaInsert } from '../types';
import { fetchPersonasApi, createPersonaApi } from '../api/persona-service';
import { useWorkspaceStore } from '@/features/workspaces/store/workspace-store';

interface PersonaState {
  personas: Persona[];
  selectedPersonaId: string | null;
  selectedPersona: Persona | null;
  isLoading: boolean;
  error: string | null;
  fetchPersonas: (workspaceId: string) => Promise<void>;
  createPersona: (personaData: Omit<PersonaInsert, 'user_id' | 'workspace_id'>) => Promise<Persona | null>;
  selectPersona: (personaId: string | null) => void;
  // TODO: Add updatePersona, deletePersona actions later
}

export const usePersonaStore = create<PersonaState>((set, get) => ({
  personas: [],
  selectedPersonaId: null,
  selectedPersona: null,
  isLoading: false,
  error: null,

  fetchPersonas: async (workspaceId: string) => {
    if (!workspaceId) {
      set({ personas: [], isLoading: false, error: 'No workspace selected to fetch personas for.' });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await fetchPersonasApi(workspaceId);
      if (error) {
        throw new Error(error.message || 'Unknown error fetching personas');
      }
      set({ personas: data || [], isLoading: false });
      get().selectPersona(null);
    } catch (err: any) {
      console.error("Error fetching personas in store:", err);
      set({ error: err.message || 'Failed to fetch personas', isLoading: false });
    }
  },

  createPersona: async (personaInput: Omit<PersonaInsert, 'user_id' | 'workspace_id'>): Promise<Persona | null> => {
    const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId;
    if (!workspaceId) { 
      console.error("Cannot create persona: No workspace selected.");
      set({ error: "No workspace selected", isLoading: false });
      return null;
    }
    
    set({ isLoading: true, error: null });
    try {
      const fullPersonaData: Omit<PersonaInsert, 'user_id'> = {
        ...personaInput,
        workspace_id: workspaceId,
      };

      const { data: newPersona, error } = await createPersonaApi(fullPersonaData as PersonaInsert);
      
      if (error) {
        throw new Error(error.message || 'Unknown error creating persona');
      }

      if (newPersona) {
        set((state) => ({ 
          personas: [newPersona, ...state.personas], 
          isLoading: false,
          error: null 
        }));
        return newPersona;
      } else {
        throw new Error("API did not return the new persona data.");
      }

    } catch (err: any) {
      console.error("Error creating persona in store:", err);
      set({ error: err.message || "Failed to create persona", isLoading: false });
      return null;
    }
  },

  selectPersona: (personaId: string | null) => {
    const { personas } = get();
    const selected = personaId ? personas.find(p => p.id === personaId) || null : null;
    set({ 
      selectedPersonaId: personaId,
      selectedPersona: selected 
    });
    console.log("[PersonaStore] Selected Persona:", selected ? selected.name : 'None');
  },

  // Placeholder actions - implement later
  // createPersona: async (personaData: Omit<PersonaInsert, 'user_id' | 'workspace_id'>) => {
  //   const workspaceId = useWorkspaceStore.getState().selectedWorkspaceId;
  //   if (!workspaceId) { 
  //     console.error("Cannot create persona: No workspace selected.");
  //     // Optionally set an error state
  //     return;
  //   }
  //   // Call createPersonaApi...
  //   // Update state...
  // },
})); 