'use client'

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useModelStore } from "@/core/store/model-store"
import { Bot } from 'lucide-react' // Icon

interface ModelSelectorProps {
  disabled?: boolean; // Add optional disabled prop
}

export function ModelSelector({ disabled = false }: ModelSelectorProps) { // Destructure and provide default
  const {
    textModels, // Use textModels for the chat context initially
    selectedTextModelId,
    setSelectedTextModel,
  } = useModelStore()

  const selectedModel = textModels.find(m => m.id === selectedTextModelId);

  const handleValueChange = (value: string) => {
    // Check if the selected value is a valid model ID
    if (textModels.some(m => m.id === value)) {
      setSelectedTextModel(value)
    } else {
      // Handle case where selection might be invalid (e.g., placeholder)
      setSelectedTextModel(null); // Or revert to default
    }
  }

  return (
    <Select 
      value={selectedTextModelId || ""} // Ensure value is controlled
      onValueChange={handleValueChange}
      disabled={disabled} // Pass disabled state to Select component
    >
      <SelectTrigger 
        className="w-auto h-9 text-xs px-2 space-x-1 bg-background"
        disabled={disabled} // Pass disabled state to Trigger
      >
        <div className="flex items-center gap-1 truncate">
          <Bot size={14} className="flex-shrink-0" />
          <SelectValue placeholder="Select model" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {textModels.length === 0 && <SelectItem value="loading" disabled>Loading models...</SelectItem>}
        {textModels.map((model) => (
          <SelectItem key={model.id} value={model.id} className="text-xs">
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
} 