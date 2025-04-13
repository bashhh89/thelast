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