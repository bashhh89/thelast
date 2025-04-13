import { createClient } from '@/lib/supabase/client'
import { Project, ProjectInsert, ProjectUpdate, ProjectWithWorkspace } from '../types'

const supabase = createClient()

export async function fetchProjects(workspaceId: string): Promise<{ data: ProjectWithWorkspace[] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        workspace:workspaces (
          id,
          name
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error fetching projects:', error)
    return { data: null, error: error as Error }
  }
}

export async function createProject(project: ProjectInsert): Promise<{ data: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('!!! Error creating project in API service:', error); 
    return { data: null, error: new Error(`Error creating project: ${JSON.stringify(error)}`) };
  }
}

export async function updateProject(id: string, updates: ProjectUpdate): Promise<{ data: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating project:', error)
    return { data: null, error: error as Error }
  }
}

export async function deleteProject(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting project:', error)
    return { error: error as Error }
  }
}

// --- API Route Callers --- 

export async function updateProjectApi(
  projectId: string, 
  updates: Partial<Pick<Project, 'name' | 'description'> // Adjust based on what PATCH route accepts
>): Promise<{ data: { id: string } | null; error: string | null }> {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("API Error updating project:", response.status, responseData);
      throw new Error(responseData.error || `Failed to update project (status: ${response.status})`);
    }

    // API route returns { message: '...', id: '...' }
    return { data: { id: responseData.id }, error: null }; 

  } catch (err: any) {
    console.error("Caught error during project API update call:", err);
    return { data: null, error: err.message || 'An unexpected error occurred during update.' };
  }
}

export async function deleteProjectApi(projectId: string): Promise<{ error: string | null }> {
  try {
    const response = await fetch(`/api/projects/${projectId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("API Error deleting project:", response.status, errorData);
      throw new Error(errorData.error || `Failed to delete project (status: ${response.status})`);
    }
    return { error: null };

  } catch (err: any) {
    console.error("Caught error during project API deletion call:", err);
    return { error: err.message || 'An unexpected error occurred during deletion.' }; 
  }
}

// --- Direct Supabase Functions (Renamed) --- 

export async function updateProjectDirect(id: string, updates: ProjectUpdate): Promise<{ data: Project | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return { data, error: null }
  } catch (error) {
    console.error('Error updating project:', error)
    return { data: null, error: error as Error }
  }
}

export async function deleteProjectDirect(id: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) throw error
    return { error: null }
  } catch (error) {
    console.error('Error deleting project:', error)
    return { error: error as Error }
  }
} 