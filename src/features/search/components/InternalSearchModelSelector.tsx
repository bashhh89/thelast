'use client';

import * as React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchStore, INTERNAL_SEARCH_MODELS } from '@/features/search/store/searchStore';
import { BrainCircuit } from 'lucide-react';

export function InternalSearchModelSelector() {
  const { selectedInternalSearchModel, setSelectedInternalSearchModel } = useSearchStore();

  const handleValueChange = (value: string) => {
    // If the selected value is the placeholder for "default", set state to null
    // Otherwise, set it to the selected model ID
    setSelectedInternalSearchModel(value === 'default-chat' ? null : value);
  };

  // Determine the value for the Select component. 
  // If null (standard chat), use 'default-chat'. Otherwise, use the model ID.
  const selectValue = selectedInternalSearchModel === null ? 'default-chat' : selectedInternalSearchModel;

  return (
    <Select
      value={selectValue}
      onValueChange={handleValueChange}
    >
      <SelectTrigger className="w-auto h-9 text-xs px-2 space-x-1 bg-background">
        <div className="flex items-center gap-1 truncate">
          <BrainCircuit size={14} className="flex-shrink-0" />
          <SelectValue placeholder="Select SearchGPT Model" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {/* Add an item representing the default chat model */}
        <SelectItem key="default-chat" value="default-chat" className="text-xs">
          Default Chat Model
        </SelectItem>
        {/* Map through the defined internal search models */}
        {INTERNAL_SEARCH_MODELS.map((model) => (
          <SelectItem key={model.id} value={model.id} className="text-xs">
            {model.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
} 