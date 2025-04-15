'use client'

import * as React from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendHorizonal, Image as ImageIcon, Mic, Globe, BrainCircuit } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { useSearchStore } from '@/features/search/store/searchStore';

interface ChatInputAreaProps {
  onSubmit: (messageContent: string) => void;
  isLoading: boolean; // To disable input/button while processing
  onGenerateAudio: () => void; // Added prop
}

export interface ChatInputAreaRef {
  focus: () => void;
  getCurrentValue: () => string;
}

// Use forwardRef to allow parent components to call focus
export const ChatInputArea = React.forwardRef<ChatInputAreaRef, ChatInputAreaProps>(({ 
  onSubmit, 
  isLoading,
  onGenerateAudio,
}, ref) => {
  const [inputValue, setInputValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const { isWebSearchEnabled, toggleWebSearch } = useSearchStore();
  const focusTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Effect to focus the textarea when isLoading becomes false
  React.useEffect(() => {
    if (!isLoading && textareaRef.current) {
      // Clear any existing timeout
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      
      // Set a new timeout for focus
      focusTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInputArea Focus Effect] Focused textarea after delay");
        }
      }, 100); // Small delay to ensure DOM updates are complete
    }
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, [isLoading]);

  // Expose the focus method via useImperativeHandle
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
      focusTimeoutRef.current = setTimeout(() => {
        if (textareaRef.current && document.activeElement !== textareaRef.current) {
          textareaRef.current.focus();
          console.log("[ChatInputArea Focus Effect] Manual focus called");
        }
      }, 100);
    },
    getCurrentValue: () => inputValue
  }));

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(event.target.value);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || isLoading) return;
    onSubmit(trimmedValue);
    setInputValue(""); // Clear input after submit
  };

  // Adjust textarea height dynamically based on content
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit"; // Reset height
      const scrollHeight = textareaRef.current.scrollHeight;
      // Set a max height (e.g., 200px) to prevent infinite growth
      const maxHeight = 200; 
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
    }
  }, [inputValue]);

  // Handle Enter key press to submit, Shift+Enter for newline
  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const trimmedValue = inputValue.trim();
      if (!trimmedValue || isLoading) return;
      onSubmit(trimmedValue);
      setInputValue("");
    }
  };

  return (
    <TooltipProvider> 
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t p-4"> 
        <div className="flex items-end gap-2"> 
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message here..."
            className="flex-1 resize-none overflow-y-auto max-h-[200px] min-h-[40px] text-sm"
            rows={1} // Start with single row
            disabled={isLoading}
          />
          <div className="flex items-center gap-1"> 
             <Tooltip>
               <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" disabled>
                   <ImageIcon className="h-4 w-4" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Attach Image (Coming Soon)</p>
               </TooltipContent>
             </Tooltip>

             <Tooltip>
               <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={onGenerateAudio}
                    disabled={isLoading || inputValue.trim().length === 0}
                  >
                   <Mic className="h-4 w-4" />
                 </Button>
               </TooltipTrigger>
                <TooltipContent side="top">
                  <p>Generate Audio from Input</p>
               </TooltipContent>
             </Tooltip>

             <Tooltip>
               <TooltipTrigger asChild>
                 <div>
                   <Switch
                      id="web-search-toggle"
                      checked={isWebSearchEnabled}
                      onCheckedChange={toggleWebSearch}
                      className="mr-1" // Add some margin
                    />
                 </div>
               </TooltipTrigger>
               <TooltipContent side="top">
                 <p>Toggle Web Search</p>
               </TooltipContent>
             </Tooltip>

             <Tooltip>
               <TooltipTrigger asChild>
                 <Button type="submit" size="icon" disabled={isLoading || inputValue.trim().length === 0}>
                   <SendHorizonal className="h-4 w-4" />
                   <span className="sr-only">Send message</span>
                 </Button>
               </TooltipTrigger>
                <TooltipContent>
                  <p>Send Message</p>
               </TooltipContent>
             </Tooltip>
          </div>
        </div>
      </form>
    </TooltipProvider>
  )
}) 

ChatInputArea.displayName = 'ChatInputArea'; 