import * as React from "react"
import { Button } from "@/components/ui/button"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useModelStore } from "@/core/store/model-store"
import { Bot, Eye, Search } from 'lucide-react' // Icons for different model types
import { cn } from "@/lib/utils"

// Re-use or import the TextModel interface if it's defined elsewhere
interface TextModel {
    id: string;
    name: string;
    description?: string;
    category?: 'Chat' | 'Vision' | 'Search' | 'Audio' | string;
    featured?: boolean;
}

interface FeaturedModelButtonsProps {
    // Add any props if needed, e.g., controlling max number of buttons
    maxFeatured?: number;
}

export function FeaturedModelButtons({ maxFeatured = 3 }: FeaturedModelButtonsProps) {
    // --- Return null immediately to hide the component --- START
    return null;
    // --- Return null immediately to hide the component --- END

    const {
        textModels,
        selectedTextModelId,
        setSelectedTextModel,
    } = useModelStore()

    // Ensure textModels is always an array
    const modelsArray: TextModel[] = Array.isArray(textModels) ? textModels : [];

    // --- Identify Featured Models --- 
    // TODO: Replace hardcoded IDs with logic reading from store/API eventually
    const featuredModelIds = ['openai', 'openai-large', 'searchgpt'];
    const featuredModels = featuredModelIds
        .map(id => modelsArray.find(m => m.id === id))
        .filter((m): m is TextModel => !!m) // Filter out undefined
        .slice(0, maxFeatured);

    // Map category to icon (could be shared utility)
    const getCategoryIcon = (category?: string) => {
        switch (category?.toLowerCase()) {
            case 'vision': return <Eye size={14} className="mr-1.5 flex-shrink-0" />;
            case 'search': return <Search size={14} className="mr-1.5 flex-shrink-0" />;
            default: return <Bot size={14} className="mr-1.5 flex-shrink-0" />; // Default Chat icon
        }
    }

    if (modelsArray.length === 0 || featuredModels.length === 0) {
        // Don't render anything if models haven't loaded or no featured models are found
        // Optionally, show placeholder/loading state
        return null;
    }

    return (
        <TooltipProvider delayDuration={200}>
            <div className="flex items-center space-x-2">
                {featuredModels.map((model) => (
                    <Tooltip key={model.id}>
                        <TooltipTrigger asChild>
                            <Button
                                variant={selectedTextModelId === model.id ? "secondary" : "outline"} // Highlight selected
                                size="sm" // Smaller size for header buttons
                                className="h-9 px-3 text-xs space-x-1 transition-all duration-150 ease-in-out group" // Base styling
                                onClick={() => setSelectedTextModel(model.id)}
                            >
                                {getCategoryIcon(model.category)}
                                <span className="truncate group-hover:max-w-[200px] transition-all duration-150 ease-in-out">{model.name}</span>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" align="center">
                            <p className="text-xs max-w-[200px]">{model.description || model.name}</p>
                        </TooltipContent>
                    </Tooltip>
                ))}
            </div>
        </TooltipProvider>
    )
} 