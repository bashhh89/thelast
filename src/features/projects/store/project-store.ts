import { create } from 'zustand'
import { Project, ProjectInsert, ProjectWithWorkspace } from '../types'
import {
  fetchProjects as apiFetchProjects,
  createProject as apiCreateProject,
  updateProject as apiUpdateProject,
  deleteProject as apiDeleteProject,
} from '../api/project-service'

interface ProjectState {
  projects: ProjectWithWorkspace[]
  isLoading: boolean
  error: Error | null
  selectedProject: Project | null
  fetchProjects: (workspaceId: string) => Promise<void>
  createProject: (project: Omit<Project, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  setSelectedProject: (project: Project | null) => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  isLoading: false,
  error: null,
  selectedProject: null,

  fetchProjects: async (workspaceId) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await apiFetchProjects(workspaceId)
      if (error) throw error
      set({ projects: data || [], isLoading: false })
    } catch (error) {
      set({ error: error as Error, isLoading: false })
    }
  },

  createProject: async (projectData: ProjectInsert) => {
    set({ isLoading: true, error: null });
    try {
      // Log the data being sent
      console.log('!!! project-store: Attempting to create project with data:', JSON.stringify(projectData, null, 2));
      const { data, error } = await apiCreateProject(projectData);
      if (error) {
        console.error('!!! project-store: Error received from apiCreateProject:', error);
        throw new Error(error.message || 'Unknown error creating project');
      }
      if (data) {
        set((state) => ({ 
          projects: [...state.projects, { ...data, workspace: state.projects[0]?.workspace || {id: projectData.workspace_id, name: 'Unknown'} }],
          isLoading: false 
        }));
      } else {
         throw new Error('No data returned after creating project.');
      }
    } catch (err: any) {
      console.error("!!! project-store: Raw error caught:", err);
      console.error("!!! project-store: err.message:", err?.message);
      set({ error: err, isLoading: false }); // Store the raw error object
    }
  },

  updateProject: async (id, updates) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await apiUpdateProject(id, updates)
      if (error) throw error
      if (data) {
        // After updating, fetch the updated list to get workspace data
        const { data: updatedData, error: fetchError } = await apiFetchProjects(data.workspace_id)
        if (fetchError) throw fetchError
        set({ projects: updatedData || [], isLoading: false })
      }
    } catch (error) {
      set({ error: error as Error, isLoading: false })
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await apiDeleteProject(id)
      if (error) throw error
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }))
    } catch (error) {
      set({ error: error as Error, isLoading: false })
    }
  },

  setSelectedProject: (project) => set({ selectedProject: project }),
})) 