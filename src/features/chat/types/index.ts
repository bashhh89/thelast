import { Database } from "@/core/supabase/database.types";
import { Json } from "@/core/supabase/database.types"; // Import Json type

// --- Define specific metadata types --- //
export type BaseMessageMetadata = {
  model?: string;
  [key: string]: Json | undefined; // Allow other string keys
}

export type TextMessageMetadata = BaseMessageMetadata & {
  type?: 'text'; // Optional type field for standard text
  is_web_search_enabled?: boolean;
  webSearch?: boolean; // Older flag? Consolidate later.
  // Add other text-specific fields if needed
};

export type ImageMessageMetadata = BaseMessageMetadata & {
  type: 'image';
  imageUrl: string;
  prompt?: string;
  // Add other image-specific fields (width, height, seed?) if needed
};

// Metadata for Audio Messages
export type AudioMessageMetadata = BaseMessageMetadata & {
  type: 'audio';
  audioUrl: string; // URL to the playable audio
  text?: string;    // The original text that was converted
  voice?: string;
};

export type MessageMetadata = TextMessageMetadata | ImageMessageMetadata | AudioMessageMetadata; // Added Audio type

// --- Update core types to use specific metadata --- //

// Base Row type from Supabase
type BaseChatMessage = Database["public"]["Tables"]["messages"]["Row"];

// Override metadata type in ChatMessage
export type ChatMessage = Omit<BaseChatMessage, 'metadata'> & {
  metadata: MessageMetadata | null; 
};

export type ChatSession = Database["public"]["Tables"]["chat_sessions"]["Row"]; // Reverted to base Row type

// Type for creating a new message (excluding server-generated fields like id, inserted_at)
// Ensure metadata here also uses the specific type
export type MessageCreateData = Pick<ChatMessage, 'session_id' | 'user_id' | 'content' | 'role'> & {
   metadata?: MessageMetadata | null; // Make metadata optional here too
};

// Type for creating a new chat session (use the generated Insert type)
// This should include project_id if the generated types are correct
export type ChatSessionCreateData = Database["public"]["Tables"]["chat_sessions"]["Insert"]; 