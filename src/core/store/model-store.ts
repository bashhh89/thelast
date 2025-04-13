import { create } from 'zustand'

// Define the structure for a model based on the provided list
interface AiModel {
  id: string; // e.g., 'openai', 'llama'
  name: string; // User-friendly name, e.g., 'OpenAI GPT-4o-mini'
  description?: string;
  provider?: string;
  input_modalities: string[]; // e.g., ['text', 'image']
  output_modalities: string[]; // e.g., ['text', 'audio']
  vision?: boolean;
  audio?: boolean;
  reasoning?: boolean;
  uncensored?: boolean;
  aliases?: string[];
  // Add other relevant properties like vision, audio, uncensored, reasoning if needed
}

// Updated list with all models provided by the user
const availableModels: AiModel[] = [
  { id: 'openai', name: 'OpenAI GPT-4o-mini', description: 'OpenAI GPT-4o-mini', provider: 'Azure', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'openai-large', name: 'OpenAI GPT-4o', description: 'OpenAI GPT-4o', provider: 'Azure', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'openai-reasoning', name: 'OpenAI o3-mini', description: 'OpenAI o3-mini', reasoning: true, provider: 'Azure', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'qwen-coder', name: 'Qwen 2.5 Coder 32B', description: 'Qwen 2.5 Coder 32B', provider: 'Scaleway', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'llama', name: 'Llama 3.3 70B', description: 'Llama 3.3 70B', provider: 'Cloudflare', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'llamascout', name: 'Llama 4 Scout 17B', description: 'Llama 4 Scout 17B', provider: 'Cloudflare', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'mistral', name: 'Mistral Small 3', description: 'Mistral Small 3', provider: 'Scaleway', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'unity', name: 'Unity Mistral Large', description: 'Unity Mistral Large', provider: 'Scaleway', uncensored: true, input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'midijourney', name: 'Midijourney', description: 'Midijourney', provider: 'Azure', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'rtist', name: 'Rtist', description: 'Rtist', provider: 'Azure', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'searchgpt', name: 'SearchGPT', description: 'SearchGPT', provider: 'Azure', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'evil', name: 'Evil', description: 'Evil', provider: 'Scaleway', uncensored: true, input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'deepseek-reasoning', name: 'DeepSeek-R1 Distill Qwen 32B', description: 'DeepSeek-R1 Distill Qwen 32B', reasoning: true, provider: 'Cloudflare', aliases: ['deepseek-r1'], input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'deepseek-reasoning-large', name: 'DeepSeek R1 - Llama 70B', description: 'DeepSeek R1 - Llama 70B', reasoning: true, provider: 'Scaleway', aliases: ['deepseek-r1-llama'], input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'llamalight', name: 'Llama 3.1 8B Instruct', description: 'Llama 3.1 8B Instruct', provider: 'Cloudflare', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'phi', name: 'Phi-4 Instruct', description: 'Phi-4 Instruct', provider: 'Cloudflare', input_modalities: ['text', 'image', 'audio'], output_modalities: ['text'], vision: true, audio: true },
  { id: 'llama-vision', name: 'Llama 3.2 11B Vision', description: 'Llama 3.2 11B Vision', provider: 'Cloudflare', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'pixtral', name: 'Pixtral 12B', description: 'Pixtral 12B', provider: 'Scaleway', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'hormoz', name: 'Hormoz 8b', description: 'Hormoz 8b', provider: 'Modal', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'hypnosis-tracy', name: 'Hypnosis Tracy 7B', description: 'Hypnosis Tracy 7B', provider: 'Azure', input_modalities: ['text', 'audio'], output_modalities: ['audio', 'text'], vision: false, audio: true },
  { id: 'mistral-roblox', name: 'Mistral Roblox', description: 'Mistral Roblox on Scaleway', provider: 'Scaleway', uncensored: true, input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'roblox-rp', name: 'Roblox Roleplay Assistant', description: 'Roblox Roleplay Assistant', provider: 'Azure', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'deepseek', name: 'DeepSeek-V3', description: 'DeepSeek-V3', provider: 'DeepSeek', input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'sur', name: 'Sur AI Assistant (Mistral)', description: 'Sur AI Assistant (Mistral)', provider: 'Scaleway', input_modalities: ['text', 'image'], output_modalities: ['text'], vision: true, audio: false },
  { id: 'llama-scaleway', name: 'Llama (Scaleway)', description: 'Llama (Scaleway)', provider: 'Scaleway', uncensored: true, input_modalities: ['text'], output_modalities: ['text'], vision: false, audio: false },
  { id: 'openai-audio', name: 'OpenAI GPT-4o-audio-preview', description: 'OpenAI GPT-4o-audio-preview', /* voices omitted for brevity */ provider: 'Azure', input_modalities: ['text', 'image', 'audio'], output_modalities: ['audio', 'text'], vision: true, audio: true },
];

// Helper function to filter models by modality
const filterModelsByModality = (modality: 'text' | 'image' | 'audio', type: 'input' | 'output') => {
  const key = type === 'input' ? 'input_modalities' : 'output_modalities';
  return availableModels.filter(model => model[key].includes(modality));
};

interface ModelStoreState {
  availableModels: AiModel[];
  textModels: AiModel[];
  imageModels: AiModel[];
  audioModels: AiModel[];
  selectedTextModelId: string | null;
  selectedImageModelId: string | null;
  selectedAudioModelId: string | null;
  setSelectedTextModel: (modelId: string | null) => void;
  setSelectedImageModel: (modelId: string | null) => void;
  setSelectedAudioModel: (modelId: string | null) => void;
}

// Set default models (e.g., the first compatible one from the list)
const defaultTextModel = filterModelsByModality('text', 'output')[0]?.id || null;
const defaultImageModel = filterModelsByModality('image', 'output')[0]?.id || null;
const defaultAudioModel = filterModelsByModality('audio', 'output')[0]?.id || null;

export const useModelStore = create<ModelStoreState>((set) => ({
  availableModels,
  textModels: filterModelsByModality('text', 'output'),
  imageModels: filterModelsByModality('image', 'output'),
  audioModels: filterModelsByModality('audio', 'output'),
  selectedTextModelId: defaultTextModel,
  selectedImageModelId: defaultImageModel,
  selectedAudioModelId: defaultAudioModel,
  setSelectedTextModel: (modelId) => set({ selectedTextModelId: modelId }),
  setSelectedImageModel: (modelId) => set({ selectedImageModelId: modelId }),
  setSelectedAudioModel: (modelId) => set({ selectedAudioModelId: modelId }),
})); 