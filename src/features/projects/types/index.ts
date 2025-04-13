import { Database } from '@/types/supabase'

export type Project = Database['public']['Tables']['projects']['Row']
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProjectUpdate = Database['public']['Tables']['projects']['Update']

export interface ProjectWithWorkspace extends Project {
  workspace: {
    id: string
    name: string
  }
}

export interface ProjectFormData {
  name: string
  description?: string
  workspace_id: string
  metadata?: Record<string, any>
} 