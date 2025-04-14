// Client-side functions for chat CRUD operations

import { createClient } from "@/core/supabase/client";
import { ChatMessage, ChatSession, MessageCreateData, ChatSessionCreateData } from "@/features/chat/types";
import { PostgrestError } from "@supabase/supabase-js";

const supabase = createClient();

// --- Chat Sessions --- //

/**
 * Fetches chat sessions for a given workspace.
 */
export const fetchChatSessions = async (workspaceId: string): Promise<{ data: ChatSession[] | null; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('last_message_at', { ascending: false, nullsFirst: false }) // Show most recent first
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Error fetching chat sessions: ${error.message}`, error);
  }
  return { data, error };
};

/**
 * Creates a new chat session.
 */
export const createChatSession = async (sessionData: ChatSessionCreateData): Promise<{ data: ChatSession | null; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from('chat_sessions')
    .insert([sessionData])
    .select()
    .single();

  if (error) {
    console.error("Error creating chat session:", error);
  }
  return { data, error };
};

// --- API Route Callers for Sessions ---

export const updateSessionApi = async (
  sessionId: string, 
  updates: { title: string } // API expects title
): Promise<{ data: { id: string } | null; error: string | null }> => {
  try {
    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("API Error updating chat session:", response.status, responseData);
      throw new Error(responseData.error || `Failed to update session (status: ${response.status})`);
    }

    // API route returns { message: '...', id: '...' }
    return { data: { id: responseData.id }, error: null }; 

  } catch (err: any) {
    console.error("Caught error during session API update call:", err);
    return { data: null, error: err.message || 'An unexpected error occurred during session update.' };
  }
}

export const deleteSessionApi = async (sessionId: string): Promise<{ error: string | null }> => {
  try {
    // Get the current session
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const authToken = data.session?.access_token;

    if (!authToken) {
      console.error("No active session found for delete operation");
      return { error: "You need to be logged in to delete chats" };
    }

    const response = await fetch(`/api/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error deleting chat:", response.status, errorData);
      throw new Error(errorData.error || `Failed to delete chat (status: ${response.status})`);
    }
    return { error: null };
  } catch (err: any) {
    console.error("Error deleting chat:", err);
    return { error: err.message || 'Could not delete chat' };
  }
}

// --- Direct Supabase Functions (Renamed) ---

// Original deleteChatSession function
export const deleteChatSessionDirect = async (sessionId: string): Promise<{ error: PostgrestError | null }> => {
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);

    if (error) {
      console.error(`Error deleting chat session ${sessionId}:`, error);
      throw error;
    }
    return { error: null };
  } catch (err: any) {
     console.error("Caught error during chat session deletion:", err);
    return { error: err as PostgrestError };
  }
};

// Original updateChatSession function
export const updateChatSessionDirect = async (sessionId: string, updates: { title?: string }): Promise<{ data: ChatSession | null; error: PostgrestError | null }> => {
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error(`Error updating chat session ${sessionId}:`, error);
      throw error;
    }
    return { data, error: null };
  } catch (err: any) {
     console.error("Caught error during chat session update:", err);
    return { data: null, error: err as PostgrestError };
  }
};

// --- Chat Messages --- //

/**
 * Fetches messages for a specific chat session.
 */
export const fetchMessages = async (sessionId: string): Promise<{ data: ChatMessage[] | null; error: PostgrestError | null }> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('inserted_at', { ascending: true }); // Show oldest first

    if (error) {
      console.error(`Error fetching messages for session ${sessionId}:`, error);
      return { data: [], error: null }; // Return empty array instead of null
    }
    return { data: data || [], error: null };
  } catch (err) {
    console.error("Error in fetchMessages:", err);
    return { data: [], error: null }; // Return empty array on any error
  }
};

/**
 * Creates a new message in a chat session.
 */
export const createMessage = async (messageData: MessageCreateData): Promise<{ data: ChatMessage | null; error: PostgrestError | null }> => {
  // 1. Insert the new message
  const { data: newMessage, error: insertError } = await supabase
    .from('messages')
    .insert([messageData])
    .select()
    .single();

  if (insertError) {
    console.error("Error creating message:", insertError);
    return { data: null, error: insertError };
  }

  // 2. Update the last_message_at timestamp on the parent session
  if (newMessage) {
    const { error: updateError } = await supabase
      .from('chat_sessions')
      .update({ last_message_at: newMessage.inserted_at })
      .eq('id', newMessage.session_id);

    if (updateError) {
      // Log the error but don't necessarily block returning the message
      console.error(`Error updating session timestamp for session ${newMessage.session_id}:`, updateError);
    }
  }

  return { data: newMessage, error: null }; // Return the successfully inserted message
};

/**
 * Updates an existing message in a chat session.
 * Primarily used to update the AI assistant's message content after streaming is complete.
 */
export const updateMessage = async (
  messageId: number, // Corrected type: message ID is a number
  updates: { content?: string; metadata?: Record<string, any>; role?: string } // Fields to update
): Promise<{ data: ChatMessage | null; error: PostgrestError | null }> => {
  const { data, error } = await supabase
    .from('messages')
    .update(updates)
    .eq('id', messageId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating message ${messageId}:`, error);
  }

  return { data, error };
};

// Note: Messages are generally immutable, so update/delete functions might not be needed. 