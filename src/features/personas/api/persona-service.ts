// Service functions using the client-side Supabase client
import { createClient } from '@/core/supabase/client'; // Use the client-side helper
import { Persona, PersonaInsert, PersonaUpdate } from '../types';
import { PostgrestError } from '@supabase/supabase-js';

const supabase = createClient();

export const fetchPersonasApi = async (workspaceId: string): Promise<{ data: Persona[] | null; error: PostgrestError | null }> => {
  if (!workspaceId) {
    return { data: null, error: { message: 'Workspace ID is required', details: '', hint: '', code: '400' } as PostgrestError };
  }

  // Fetch directly using client, RLS will apply based on user's auth cookie
  const { data, error } = await supabase
    .from('personas')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching personas:", error);
  }
  return { data, error };
};

export const createPersonaApi = async (personaInput: Omit<PersonaInsert, 'user_id'>): Promise<{ data: Persona | null; error: PostgrestError | null }> => {
  // Get current user ID client-side (should be available)
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    console.error("CreatePersonaApi: User not authenticated.");
    return { data: null, error: { message: "User not authenticated", details: "", hint: "", code: "401" } as PostgrestError };
  }

  if (!personaInput.workspace_id) {
     return { data: null, error: { message: "Workspace ID is missing in persona data", details: "", hint: "", code: "400" } as PostgrestError };
  }

  const insertData: PersonaInsert = {
      ...personaInput,
      user_id: user.id // Add the user ID here
  };

  // Insert directly using client, RLS will apply
  const { data, error } = await supabase
    .from('personas')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error("Error creating persona:", error);
    // RLS errors might manifest here, check codes if needed (e.g., 403 via PostgREST)
  }
  return { data, error };
};

// TODO: Add updatePersonaApi, deletePersonaApi using the client

// TODO: Add updatePersonaApi, deletePersonaApi later 