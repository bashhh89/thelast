import { create } from 'zustand'
import { Workspace } from "@/features/workspaces/types"
import { fetchUserWorkspaces, createWorkspace as apiCreateWorkspace, deleteWorkspaceApi, updateWorkspaceApi } from "@/features/workspaces/api/workspace-service"
import { WorkspaceCreateData } from "@/features/workspaces/types"

interface WorkspaceState {
  workspaces: Workspace[];
  selectedWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  selectWorkspace: (workspaceId: string | null) => void;
  createWorkspace: (workspaceData: WorkspaceCreateData) => Promise<Workspace | null>; // Return created workspace or null on error
  addWorkspaceToList: (workspace: Workspace) => void; // Helper to add locally
  deleteWorkspace: (workspaceId: string) => Promise<void>; // Add delete function signature
  updateWorkspace: (workspaceId: string, name: string) => Promise<void>; // Add update signature
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  selectedWorkspaceId: null,
  isLoading: false,
  error: null,

  fetchWorkspaces: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await fetchUserWorkspaces();
      if (error) throw error;
      set({ workspaces: data || [], isLoading: false });
      // Select the first workspace by default if none is selected
      if (!get().selectedWorkspaceId && data && data.length > 0) {
        get().selectWorkspace(data[0].id);
      }
    } catch (err: any) {
      console.error("Error fetching workspaces in store:", err);
      set({ error: err.message || "Failed to fetch workspaces", isLoading: false });
    }
  },

  selectWorkspace: (workspaceId: string | null) => {
    set({ selectedWorkspaceId: workspaceId });
    // TODO: Persist selectedWorkspaceId (e.g., in localStorage or sessionStorage)
    // if you want it to persist across page reloads/sessions.
    // Example using localStorage:
    // if (workspaceId) {
    //   localStorage.setItem('selectedWorkspaceId', workspaceId);
    // } else {
    //   localStorage.removeItem('selectedWorkspaceId');
    // }
  },

  // Action to create a workspace and update the store
  createWorkspace: async (workspaceData: WorkspaceCreateData): Promise<Workspace | null> => {
    set({ isLoading: true, error: null }); // Indicate loading for creation
    try {
      const { data, error } = await apiCreateWorkspace(workspaceData);
      if (error) throw error;
      if (data) {
        get().addWorkspaceToList(data); // Add to local state
        get().selectWorkspace(data.id); // Select the newly created workspace
        set({ isLoading: false });
        return data; // Return the created workspace
      } else {
        throw new Error("No data returned after creating workspace.");
      }
    } catch (err: any) {
      console.error("Error creating workspace in store:", err);
      set({ error: err.message || "Failed to create workspace", isLoading: false });
      return null; // Return null on error
    }
  },

  // Helper action to add a workspace to the list (used after creation)
  addWorkspaceToList: (workspace: Workspace) => {
    set((state) => ({ workspaces: [workspace, ...state.workspaces] }));
  },

  deleteWorkspace: async (workspaceId: string) => {
    const currentSelectedId = get().selectedWorkspaceId;
    set({ isLoading: true, error: null });
    try {
      const { error } = await deleteWorkspaceApi(workspaceId);
      if (error) throw new Error(error);
      
      // Remove the deleted workspace from the list
      set((state) => ({
        workspaces: state.workspaces.filter((ws) => ws.id !== workspaceId),
        isLoading: false,
        // If the deleted workspace was the selected one, clear selection
        selectedWorkspaceId: currentSelectedId === workspaceId ? null : currentSelectedId,
      }));

    } catch (err: any) {
      console.error("!!! Error deleting workspace:", err);
      set({ error: err.message || "Failed to delete workspace", isLoading: false });
    }
  },

  updateWorkspace: async (workspaceId: string, name: string) => {
    const originalWorkspaces = get().workspaces;
    const originalWorkspace = originalWorkspaces.find(ws => ws.id === workspaceId);
    if (!originalWorkspace || originalWorkspace.name === name || name.trim() === '') return;

    const trimmedName = name.trim();

    // Optimistic update
    set(state => ({
      workspaces: state.workspaces.map(ws =>
        ws.id === workspaceId ? { ...ws, name: trimmedName } : ws
      ),
      isLoading: true,
      error: null
    }));

    try {
      const { data, error } = await updateWorkspaceApi(workspaceId, { name: trimmedName });
      
      if (error) {
        console.error("Failed to update workspace via API:", error);
        throw new Error(error);
      }
      
      console.log(`Workspace ${workspaceId} updated successfully via API.`);
      set({ isLoading: false, error: null });

    } catch (err: any) {
       console.error("Error updating workspace in store:", err);
       set({ 
         workspaces: originalWorkspaces, 
         error: err.message || "Failed to update workspace",
         isLoading: false
       });
    }
  }
}));

// TODO: Consider adding initialization logic similar to useInitializeAuthStore
// to fetch workspaces and potentially load selectedWorkspaceId from storage on mount. 