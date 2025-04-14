'use client'

import React, { useEffect, useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useModelStore, SelectableModel } from "@/core/store/model-store"
import { Bot, Check, ChevronsUpDown, AlertTriangle, Activity, Shapes, BrainCircuit, DatabaseZap } from 'lucide-react'

interface ModelSelectorProps {
  disabled?: boolean;
}

function getProviderDisplayName(providerType: string): string {
    switch (providerType?.toLowerCase()) {
        case 'openai': return 'OpenAI';
        case 'openai_compatible': return 'OpenAI Compatible';
        case 'google': return 'Google AI';
        case 'anthropic': return 'Anthropic';
        case 'mistral': return 'Mistral AI';
        case 'groq': return 'Groq';
        case 'pollinations': return 'Pollinations AI';
        case 'openrouter': return 'OpenRouter';
        case 'hypobolic': return 'Hypobolic AI';
        case 'deepseek': return 'DeepSeek AI';
        case 'custom': return 'Custom';
        default: return providerType || 'Unknown Provider';
    }
}

export function ModelSelector({ disabled = false }: ModelSelectorProps) {
  const {
    allModels,
    selectedModel,
    fetchModels,
    setSelectedModel,
    isLoadingModels,
    modelError,
  } = useModelStore()

  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const filteredAndGroupedModels = useMemo(() => {
    const modelsArray: SelectableModel[] = Array.isArray(allModels) ? allModels : [];
    
    const filtered = modelsArray.filter(model => 
        model.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.reduce((acc, model) => {
      const groupKey = getProviderDisplayName(model.providerType);
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(model);
      return acc;
    }, {} as Record<string, SelectableModel[]>);

  }, [allModels, searchTerm]);

  const sortedGroupKeys = useMemo(() => Object.keys(filteredAndGroupedModels).sort((a, b) => a.localeCompare(b)), [filteredAndGroupedModels]);

  const handleSelectModel = (model: SelectableModel | null) => {
    setSelectedModel(model);
    setSearchTerm("");
    setOpen(false);
  }

  const getModelProviderIcon = (providerType?: string | null) => {
      switch (providerType?.toLowerCase()) {
          case 'openai':
          case 'openai_compatible':
              return <Activity size={14} className="mr-1 text-muted-foreground flex-shrink-0" />;
          case 'anthropic': 
              return <BrainCircuit size={14} className="mr-1 text-muted-foreground flex-shrink-0" />;
          case 'google':
              return <Shapes size={14} className="mr-1 text-muted-foreground flex-shrink-0" />;
          case 'mistral':
          case 'groq':
          case 'pollinations': 
          case 'openrouter':
          case 'hypobolic':
          case 'deepseek':
          case 'custom': 
              return <DatabaseZap size={14} className="mr-1 text-muted-foreground flex-shrink-0" />;
          default: 
              return <Bot size={14} className="mr-1 text-muted-foreground flex-shrink-0" />;
      }
  }

  const getButtonLabel = () => {
      if (isLoadingModels) return "Loading...";
      if (modelError) return "Error";
      if (!selectedModel && allModels.length > 0) return "Select model";
      if (!selectedModel && allModels.length === 0) return "No models";
      return selectedModel?.name || "Select model";
  }

  const getButtonIcon = () => {
      if (isLoadingModels) return <Activity size={14} className="animate-spin flex-shrink-0 mr-1" />;
      if (modelError) return <AlertTriangle size={14} className="text-red-500 flex-shrink-0 mr-1" />;
      return selectedModel ? getModelProviderIcon(selectedModel.providerType) : <Bot size={14} className="flex-shrink-0 mr-1" />;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-auto min-w-[150px] h-9 justify-between text-xs px-2 space-x-1 bg-background"
          disabled={disabled || isLoadingModels || modelError !== null || allModels.length === 0}
          title={modelError || (selectedModel ? `${selectedModel.name} (${getProviderDisplayName(selectedModel.providerType)})` : 'Select an AI model')}
        >
          <div className="flex items-center gap-1 truncate">
             {getButtonIcon()}
            <span className="truncate">
              {getButtonLabel()}
            </span>
          </div>
          <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <div className="p-2 border-b">
          <Input
            placeholder="Search models..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        
        {(() => {
          if (isLoadingModels) {
            return <div className="p-4 text-center text-xs text-muted-foreground">Loading models...</div>;
          }
          if (modelError) {
             return <div className="p-4 text-center text-xs text-red-500">{modelError}</div>;
          }
          if (sortedGroupKeys.length === 0 && searchTerm) {
             return <div className="p-4 text-center text-xs text-muted-foreground">No models match "{searchTerm}".</div>;
          }
          if (allModels.length === 0) {
            return <div className="p-4 text-center text-xs text-muted-foreground">No models available.</div>;
          }

          return (
            <ScrollArea className="h-auto max-h-[250px]">
              <div className="p-2">
                {sortedGroupKeys.length > 0 ? (
                  sortedGroupKeys.map((groupKey) => (
                    <div key={groupKey} className="mb-2 last:mb-0">
                      <p className="text-xs font-semibold text-muted-foreground px-2 mb-1">
                        {groupKey}
                      </p>
                      {filteredAndGroupedModels[groupKey].map((model: SelectableModel) => (
                        <Button
                          key={`${model.endpointId}-${model.id}`}
                          variant="ghost"
                          className="w-full justify-start h-auto py-1.5 px-2 text-xs"
                          onClick={() => handleSelectModel(model)}
                          title={`${model.name} (${getProviderDisplayName(model.providerType)})`}
                        >
                          <div className="flex items-center w-full">
                            {getModelProviderIcon(model.providerType)}
                            <div className="flex flex-col items-start flex-grow truncate mr-2">
                              <span className="font-medium truncate">{model.name}</span>
                            </div>
                            {selectedModel?.id === model.id && selectedModel?.endpointId === model.endpointId && 
                              <Check className="ml-auto h-4 w-4 flex-shrink-0" />
                            }
                          </div>
                        </Button>
                      ))}
                    </div>
                  ))
                ) : (
                   <p className="text-xs text-muted-foreground px-2">No models found.</p>
                )}
              </div>
            </ScrollArea>
          );
        })()}
      </PopoverContent>
    </Popover>
  )
} 