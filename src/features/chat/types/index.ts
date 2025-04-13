import { Database } from "@/core/supabase/database.types";

// Extract types from generated Supabase types
export type ChatMessage = Database["public"]["Tables"]["messages"]["Row"];
export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"]; // Reverted to base Row type

// Type for creating a new message (excluding server-generated fields like id, inserted_at)
export type MessageCreateData = Pick<ChatMessage, 'session_id' | 'user_id' | 'content' | 'role' | 'metadata'>;

// Type for creating a new chat session (use the generated Insert type)
// This should include project_id if the generated types are correct
export type ChatSessionCreateData = Database["public"]["Tables"]["chat_sessions"]["Insert"]; 