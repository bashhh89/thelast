// Client-side functions for workspace CRUD operations

import { createClient } from "@/core/supabase/client";
import { Workspace, WorkspaceCreateData } from "@/features/workspaces/types";
import { PostgrestError } from "@supabase/supabase-js";

const supabase = createClient();

/**
 * Fetches workspaces belonging to the currently authenticated user.
 */
export const fetchUserWorkspaces = async (): Promise<{ data: Workspace[] | null; error: PostgrestError | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated to fetch workspaces.");
    return { data: null, error: { message: "User not authenticated", details: "", hint: "", code: "401" } as PostgrestError };
  }

  // Note: Assumes RLS policy allows user to select workspaces where owner_id = auth.uid()
  // We need to join with profiles to link workspace owner_id to auth.uid()
  // However, our basic RLS uses owner_id directly which refers to the profiles table id (which matches auth.uid)
  // So, a direct select should work if the RLS is set up correctly.
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    // .eq('owner_id', user.id) // RLS should handle this filtering
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching workspaces:", error);
  }

  return { data, error };
};

/**
 * Creates a new workspace for the currently authenticated user.
 */
export const createWorkspace = async (workspaceData: WorkspaceCreateData): Promise<{ data: Workspace | null; error: PostgrestError | null }> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated to create workspace.");
    return { data: null, error: { message: "User not authenticated", details: "", hint: "", code: "401" } as PostgrestError };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .insert([{ ...workspaceData, owner_id: user.id }]) // owner_id comes from the authenticated user
    .select()
    .single(); // Return the created workspace

  if (error) {
    console.error("Error creating workspace:", error);
  }

  return { data, error };
};

// Add the deleteWorkspace function
export const deleteWorkspace = async (workspaceId: string): Promise<{ error: PostgrestError | null }> => {
  try {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error("Error deleting workspace:", error);
      throw error; // Re-throw the error to be caught by the store
    }
    return { error: null };
  } catch (err: any) {
    // Ensure we return the expected error structure
    console.error("Caught error during workspace deletion:", err);
    return { error: err as PostgrestError }; 
  }
};

// TODO: Implement updateWorkspace and deleteWorkspace functions as needed 