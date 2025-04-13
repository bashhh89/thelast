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

// Updated deleteWorkspace to call the API route
export const deleteWorkspaceApi = async (workspaceId: string): Promise<{ error: string | null }> => {
  try {
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error deleting workspace:", response.status, errorData);
      throw new Error(errorData.error || `Failed to delete workspace (status: ${response.status})`);
    }
    // No content expected on successful delete, but return consistent structure
    return { error: null };

  } catch (err: any) {
    console.error("Caught error during workspace API deletion call:", err);
    return { error: err.message || 'An unexpected error occurred during deletion.' }; 
  }
};

/**
 * Updates an existing workspace via the API route.
 */
export const updateWorkspaceApi = async (
  workspaceId: string,
  updateData: Partial<Pick<Workspace, 'name' | 'description'>> // Allow updating name or description
): Promise<{ data: { id: string } | null; error: string | null }> => {
  try {
    const response = await fetch(`/api/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updateData),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("API Error updating workspace:", response.status, responseData);
      throw new Error(responseData.error || `Failed to update workspace (status: ${response.status})`);
    }

    // API route currently returns { message: '...', id: '...' }
    return { data: { id: responseData.id }, error: null }; 

  } catch (err: any) {
    console.error("Caught error during workspace API update call:", err);
    return { data: null, error: err.message || 'An unexpected error occurred during update.' };
  }
};

// --- Keep original direct Supabase functions for potential other uses or reference ---
// --- OR remove them if the API routes fully replace their functionality      ---

// Original deleteWorkspace function (direct Supabase call)
export const deleteWorkspaceDirect = async (workspaceId: string): Promise<{ error: PostgrestError | null }> => {
  try {
    const { error } = await supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      console.error("Error deleting workspace directly:", error);
      throw error; // Re-throw the error to be caught by the store
    }
    return { error: null };
  } catch (err: any) {
    console.error("Caught error during direct workspace deletion:", err);
    return { error: err as PostgrestError }; 
  }
};

// Original updateWorkspace function (direct Supabase call)
export const updateWorkspaceDirect = async (
  workspaceId: string,
  updateData: Partial<Pick<Workspace, 'name' | 'description'>>
): Promise<{ data: Workspace | null; error: PostgrestError | null }> => {
   const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("User not authenticated to update workspace directly.");
    return { data: null, error: { message: "User not authenticated", details: "", hint: "", code: "401" } as PostgrestError };
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update(updateData)
    .eq('id', workspaceId)
    .select()
    .single();

  if (error) {
    console.error("Error updating workspace directly:", error);
  }

  return { data, error };
};

// TODO: Implement deleteWorkspace functions as needed 

// --- API Route Callers --- 

// Function to call the invite API endpoint
export const inviteUserApi = async (
  workspaceId: string, 
  email: string,
  role: 'owner' | 'member' = 'member' // Default role
): Promise<{ message?: string; error: string | null }> => {
  try {
    const response = await fetch(`/api/workspace-invites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        workspace_id: workspaceId, 
        invited_email: email, 
        role_to_assign: role 
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("API Error sending invite:", response.status, responseData);
      // Use the error message from the API response if available
      throw new Error(responseData.error || `Failed to send invite (status: ${response.status})`);
    }

    // Return success message from API if present
    return { message: responseData.message, error: null }; 

  } catch (err: any) {
    console.error("Caught error during invite API call:", err);
    return { error: err.message || 'An unexpected error occurred sending the invite.' };
  }
}; 