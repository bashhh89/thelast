import { create } from 'zustand'
import { Database } from "@/core/supabase/database.types"; // Import generated types
import { ChatSession } from "@/features/chat/types"
import { 
  fetchChatSessions as apiFetchChatSessions, 
  createChatSession as apiCreateChatSession,
  deleteChatSession as apiDeleteChatSession,
  updateChatSession as apiUpdateChatSession // Import update function
} from "@/features/chat/api/chat-service"
import { PostgrestError } from '@supabase/supabase-js'

// Re-Define the type for chat session creation locally using generated types
type ChatSessionCreateData = Database["public"]["Tables"]["chat_sessions"]["Insert"];

interface ChatSessionState {
  sessions: ChatSession[];
  currentWorkspaceId: string | null; // Track which workspace sessions are loaded for
  isLoading: boolean;
  error: string | null;
  fetchSessionsForWorkspace: (workspaceId: string) => Promise<void>;
  createSession: (workspaceId: string, userId: string, projectId?: string, title?: string) => Promise<ChatSession | null>;
  addSessionToList: (session: ChatSession) => void;
  clearSessions: () => void; // Clear sessions when workspace changes
  deleteSession: (sessionId: string) => Promise<void>; // Add delete function signature
  updateSessionTitle: (sessionId: string, newTitle: string) => Promise<void>; // Add update function signature
  isWebSearchMode: boolean; // State for the toggle
  toggleWebSearchMode: () => void; // Action to toggle the mode
}

export const useChatSessionStore = create<ChatSessionState>((set, get) => ({
  sessions: [],
  currentWorkspaceId: null,
  isLoading: false,
  error: null,
  isWebSearchMode: false, // Default to false

  fetchSessionsForWorkspace: async (workspaceId: string) => {
    // Avoid refetching if already loaded for this workspace
    if (get().currentWorkspaceId === workspaceId && !get().error) {
      // Potentially add logic here to check if a refresh is needed based on time
      // For now, just return if already loaded
      // set({ isLoading: false }); // Ensure loading is false if returning early
      // return;
    }
    set({ isLoading: true, error: null, sessions: [], currentWorkspaceId: workspaceId }); // Clear old sessions
    try {
      const { data, error } = await apiFetchChatSessions(workspaceId);
      if (error) throw error;
      set({ sessions: data || [], isLoading: false });
    } catch (err: any) {
      // Simpler error logging
      const errorMessage = err?.message || "Failed to fetch sessions";
      console.error(`Error fetching sessions in store: ${errorMessage}`, err);
      set({ error: errorMessage, isLoading: false });
    }
  },

  createSession: async (workspaceId: string, userId: string, projectId?: string, title?: string): Promise<ChatSession | null> => {
    set({ isLoading: true, error: null });
    try {
      // Construct session data, manually ensuring type includes project_id
      const sessionData: {
        workspace_id: string;
        user_id: string;
        title?: string | null;
        project_id?: string | null; // Explicitly add project_id here
      } = {
        workspace_id: workspaceId,
        user_id: userId,
        title: title || 'New Chat', // Default title
        project_id: projectId || null, // Add projectId or null
      };
      // Now call the API service which expects the correctly typed ChatSessionCreateData
      const { data, error } = await apiCreateChatSession(sessionData);
      if (error) throw error;
      if (data) {
        get().addSessionToList(data);
        set({ isLoading: false });
        return data; // Return the created session
      } else {
        throw new Error("No data returned after creating chat session.");
      }
    } catch (err: any) {
      // Super Verbose Error Logging
      console.error("!!! RAW ERROR in chat-session-store createSession:", err);
      console.error("!!! typeof err:", typeof err);
      console.error("!!! err.message:", err?.message);
      console.error("!!! err.details:", err?.details);
      console.error("!!! err.hint:", err?.hint);
      console.error("!!! err.code:", err?.code);
      console.error("!!! JSON.stringify(err):", JSON.stringify(err)); // Attempt to stringify
      const errorMessage = err?.message || "Failed to create chat session (Unknown Error)";
      set({ error: errorMessage, isLoading: false });
      return null;
    }
  },

  addSessionToList: (session: ChatSession) => {
    set((state) => ({
      // Add to the beginning of the list
      sessions: [session, ...state.sessions.filter(s => s.id !== session.id)], // Avoid duplicates if somehow added twice
    }));
  },

  clearSessions: () => {
     set({ sessions: [], currentWorkspaceId: null, isLoading: false, error: null });
  },

  deleteSession: async (sessionId: string) => {
    const currentSessions = get().sessions;
    // Optimistically remove from UI
    set((state) => ({ 
      sessions: state.sessions.filter(s => s.id !== sessionId) 
    }));

    try {
      const { error } = await apiDeleteChatSession(sessionId);
      if (error) {
        console.error("!!! Error deleting chat session:", error);
        // Revert optimistic update on error
        set({ sessions: currentSessions, error: error.message || "Failed to delete session" });
        // Maybe show a toast notification here
      }
      // On success, the session is already removed from the list
      set({ isLoading: false, error: null }); // Clear loading/error just in case

    } catch (err: any) {
      console.error("!!! Raw error caught during session deletion:", err);
      // Revert optimistic update on error
      set({ sessions: currentSessions, error: err.message || "Failed to delete session", isLoading: false });
    }
  },

  updateSessionTitle: async (sessionId: string, newTitle: string) => {
    const currentSessions = get().sessions;
    const originalSession = currentSessions.find(s => s.id === sessionId);
    if (!originalSession) return; // Should not happen

    // Optimistic update
    set((state) => ({
      sessions: state.sessions.map(s => 
        s.id === sessionId ? { ...s, title: newTitle } : s
      ),
    }));

    try {
      const { data, error } = await apiUpdateChatSession(sessionId, { title: newTitle });
      if (error || !data) {
        console.error("!!! Error updating chat session title:", error);
        // Revert on error
        set({ sessions: currentSessions, error: error?.message || "Failed to update title" });
      } else {
        // Update with the actual data from the server (might have other changes)
        set((state) => ({
          sessions: state.sessions.map(s => s.id === sessionId ? data : s),
          error: null,
        }));
      }
    } catch (err: any) {
      console.error("!!! Raw error caught during session title update:", err);
      // Revert on error
      set({ sessions: currentSessions, error: err.message || "Failed to update title" });
    }
  },

  toggleWebSearchMode: () => {
    set((state) => ({ isWebSearchMode: !state.isWebSearchMode }));
    console.log("Web Search Mode toggled to:", !get().isWebSearchMode);
  },
})); 