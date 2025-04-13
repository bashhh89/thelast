import { Database } from "@/core/supabase/database.types";

// Extract the Workspace type from the generated Supabase types
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];

// You might want additional related types, e.g., for forms:
export type WorkspaceCreateData = Pick<Workspace, 'name' | 'description'>; // Only fields needed for creation 