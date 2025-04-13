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

// Function to delete a chat session
export const deleteChatSession = async (sessionId: string): Promise<{ error: PostgrestError | null }> => {
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

// Function to update a chat session (e.g., rename)
export const updateChatSession = async (sessionId: string, updates: { title?: string }): Promise<{ data: ChatSession | null; error: PostgrestError | null }> => {
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
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('inserted_at', { ascending: true }); // Show oldest first

  if (error) {
    console.error(`Error fetching messages for session ${sessionId}:`, error);
  }
  return { data, error };
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

// Note: Messages are generally immutable, so update/delete functions might not be needed. 