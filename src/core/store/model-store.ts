import { create } from 'zustand'
import { createClient } from '@/core/supabase/client'
import { Database } from '@/core/supabase/database.types'

// Define the types based on the schema
export type AiEndpoint = Database['public']['Tables']['ai_endpoints']['Row']
export type AiEndpointModel = Database['public']['Tables']['ai_endpoint_models']['Row']

// Define a type for the models shown in the selector
export interface SelectableModel {
  id: string; // Actual model ID (e.g., 'gemini-1.5-flash', 'openai')
  name: string; // Display name (e.g., 'Gemini 1.5 Flash', 'OpenAI GPT-4o-mini')
  endpointId: string; // Reference to parent ai_endpoints.id
  providerType: string; // e.g., 'google', 'openai', 'pollinations', 'custom'
  // Removed isBuiltIn as all models will now come from DB
}

interface ModelStoreState {
  allModels: SelectableModel[];
  selectedModel: SelectableModel | null;
  isLoadingModels: boolean;
  modelError: string | null;
  fetchModels: () => Promise<void>;
  setSelectedModel: (model: SelectableModel | null) => void;
  getModelById: (id: string | null) => SelectableModel | null;
}

export const useModelStore = create<ModelStoreState>((set, get) => ({
  allModels: [],
  selectedModel: null,
  isLoadingModels: true,
  modelError: null,

  fetchModels: async () => {
    set({ isLoadingModels: true, modelError: null }); 
    let fetchedSelectableModels: SelectableModel[] = [];

    try {
      const supabase = createClient();
      
      // Fetch enabled endpoints
      const { data: enabledEndpoints, error: endpointError } = await supabase
        .from('ai_endpoints')
        .select('id, name, type') 
        .eq('enabled', true);

      if (endpointError) {
        console.error("Error fetching enabled endpoints:", endpointError);
        throw new Error(`Failed to load provider configurations: ${endpointError.message}`);
      } 
      
      // Handle case where no endpoints are enabled
      if (!enabledEndpoints || enabledEndpoints.length === 0) {
          console.log("No enabled endpoints found in the database.");
          set({ allModels: [], selectedModel: null, isLoadingModels: false });
          return;
      }
      
      const endpointIds = enabledEndpoints.map(ep => ep.id);

      // Fetch enabled models for these endpoints
      const { data: enabledModels, error: modelsError } = await supabase
        .from('ai_endpoint_models')
        .select('id, model_id, model_name, endpoint_id, enabled')
        .in('endpoint_id', endpointIds)
        .eq('enabled', true);

      if (modelsError) {
        console.error("Error fetching enabled models:", modelsError);
        throw new Error(`Failed to load enabled models: ${modelsError.message}`);
      }
      
      if (enabledModels && enabledEndpoints) {
          fetchedSelectableModels = enabledModels.map(model => {
              const parentEndpoint = enabledEndpoints.find(ep => ep.id === model.endpoint_id);
              if (!parentEndpoint) {
                  console.warn(`Could not find parent endpoint for model ID: ${model.model_id}`);
                  return null;
              }
              return {
                  id: model.model_id,
                  name: model.model_name || model.model_id,
                  endpointId: model.endpoint_id,
                  providerType: parentEndpoint.type || 'custom'
              };
          }).filter((model): model is SelectableModel => model !== null);
      }

      set({ allModels: fetchedSelectableModels, isLoadingModels: false });

      const currentSelection = get().selectedModel;
      const isCurrentSelectionValid = currentSelection && fetchedSelectableModels.some(m => m.id === currentSelection.id && m.endpointId === currentSelection.endpointId);

      if (!isCurrentSelectionValid) {
         const firstModel = fetchedSelectableModels.length > 0 ? fetchedSelectableModels[0] : null;
         set({ selectedModel: firstModel });
      }

    } catch (error: any) {
      console.error("Critical error fetching/processing models:", error);
      const errorMessage = error.message || 'Failed unexpectedly while loading models.';
      set({ 
          modelError: errorMessage, 
          isLoadingModels: false, 
          allModels: [], 
          selectedModel: null 
      });
    }
  },

  setSelectedModel: (model) => {
    set({ selectedModel: model });
  },

  getModelById: (id) => {
     if (!id) return null;
     return get().allModels.find(m => m.id === id) || null; 
  }
})); 