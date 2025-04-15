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
  isLoadingModels: false,
  modelError: null,

  fetchModels: async () => {
    // Don't fetch if already loading
    if (get().isLoadingModels) {
      console.log("[ModelStore] Skipping fetch - already loading");
      return;
    }
    
    console.log("[ModelStore] Starting model fetch");
    set({ isLoadingModels: true, modelError: null });

    try {
      const supabase = createClient();
      
      // Fetch enabled endpoints
      const { data: enabledEndpoints, error: endpointError } = await supabase
        .from('ai_endpoints')
        .select('id, name, type') 
        .eq('enabled', true);

      if (endpointError) {
        throw new Error(`Failed to load provider configurations: ${endpointError.message}`);
      } 

      console.log("[ModelStore] Fetched endpoints:", enabledEndpoints?.length || 0);
      
      // Handle case where no endpoints are enabled
      if (!enabledEndpoints || enabledEndpoints.length === 0) {
        console.log("[ModelStore] No enabled endpoints found");
        set({ 
          allModels: [], 
          selectedModel: null, 
          isLoadingModels: false,
          modelError: "No enabled AI endpoints found. Please contact your administrator."
        });
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
        throw new Error(`Failed to load enabled models: ${modelsError.message}`);
      }

      console.log("[ModelStore] Fetched models:", enabledModels?.length || 0);
      
      let fetchedSelectableModels: SelectableModel[] = [];
      
      if (enabledModels && enabledEndpoints) {
        fetchedSelectableModels = enabledModels
          .map(model => {
            const parentEndpoint = enabledEndpoints.find(ep => ep.id === model.endpoint_id);
            if (!parentEndpoint) {
              console.warn(`[ModelStore] No parent endpoint for model ${model.model_id}`);
              return null;
            }
            return {
              id: model.model_id,
              name: model.model_name || model.model_id,
              endpointId: model.endpoint_id,
              providerType: parentEndpoint.type || 'custom'
            };
          })
          .filter((model): model is SelectableModel => model !== null);
      }

      if (fetchedSelectableModels.length === 0) {
        console.log("[ModelStore] No enabled models found");
        set({ 
          allModels: [], 
          selectedModel: null, 
          isLoadingModels: false,
          modelError: "No enabled AI models found. Please contact your administrator."
        });
        return;
      }

      console.log("[ModelStore] Processing", fetchedSelectableModels.length, "models");

      // Update models first
      set({ allModels: fetchedSelectableModels });

      // Then handle selection
      const currentSelection = get().selectedModel;
      const isCurrentSelectionValid = currentSelection && 
        fetchedSelectableModels.some(m => 
          m.id === currentSelection.id && 
          m.endpointId === currentSelection.endpointId
        );

      if (!isCurrentSelectionValid) {
        console.log("[ModelStore] Setting default model");
        set({ selectedModel: fetchedSelectableModels[0] });
      }

      // Finally clear loading state
      set({ isLoadingModels: false, modelError: null });
      console.log("[ModelStore] Fetch complete");

    } catch (error: any) {
      console.error("[ModelStore] Critical error:", error);
      const errorMessage = error.message || 'Failed to load AI models.';
      set({ 
        modelError: errorMessage, 
        isLoadingModels: false, 
        allModels: [], 
        selectedModel: null 
      });
    }
  },

  setSelectedModel: (model) => {
    console.log("[ModelStore] Setting selected model:", model?.name);
    set({ selectedModel: model });
  },

  getModelById: (id) => {
    if (!id) return null;
    return get().allModels.find(m => m.id === id) || null;
  }
})); 