import { create } from 'zustand'
import { Project, ProjectInsert, ProjectUpdate, ProjectWithWorkspace } from '../types'
import {
  fetchProjects as apiFetchProjects,
  createProject as apiCreateProject,
  updateProjectApi,
  deleteProjectApi,
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

export const useProjectStore = create<ProjectState>((set, get) => ({
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
    // For now, only support updating the name optimistically via API
    const newName = updates.name?.trim();
    if (!newName) return; // Only proceed if name is provided and not empty

    const originalProjects = get().projects;
    const originalProject = originalProjects.find(p => p.id === id);
    if (!originalProject || originalProject.name === newName) return; // No change

    // Optimistic Update
    set(state => ({
      projects: state.projects.map(p =>
        p.id === id ? { ...p, name: newName } : p
      ),
      isLoading: true,
      error: null
    }));

    try {
      // Call the API service function
      const { error } = await updateProjectApi(id, { name: newName });
      
      if (error) {
        console.error("Failed to update project via API:", error);
        throw new Error(error); // Throw error string
      }
      
      // Optimistic update successful, just clear loading/error
      set({ isLoading: false, error: null });

    } catch (err: any) {
      console.error("Error updating project in store:", err);
      // Revert optimistic update
      set({ 
        projects: originalProjects, 
        error: err instanceof Error ? err : new Error("Failed to update project"), 
        isLoading: false 
      });
    }
  },

  deleteProject: async (id) => {
    set({ isLoading: true, error: null });
    try {
      // Call the API service function
      const { error } = await deleteProjectApi(id);
      if (error) throw new Error(error); // Throw error string
      
      // Update state on success
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        isLoading: false,
      }));
    } catch (err: any) {
       console.error("Error deleting project in store:", err);
      set({ 
        error: err instanceof Error ? err : new Error("Failed to delete project"), 
        isLoading: false 
      });
    }
  },

  setSelectedProject: (project) => set({ selectedProject: project }),
})) 