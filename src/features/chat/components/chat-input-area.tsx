'use client'

import * as React from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendHorizonal, Image as ImageIcon, Mic, Globe, BrainCircuit } from 'lucide-react'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface ChatInputAreaProps {
  onSubmit: (messageContent: string) => void;
  isLoading: boolean; // To disable input/button while processing
  isWebSearchEnabled: boolean; // Prop for web search state
  onWebSearchToggle: (enabled: boolean) => void; // Prop for toggling web search
}

export interface ChatInputAreaRef {
  focus: () => void;
}

// Use forwardRef to allow parent components to call focus
export const ChatInputArea = React.forwardRef<ChatInputAreaRef, ChatInputAreaProps>(({ 
  onSubmit, 
  isLoading,
  isWebSearchEnabled,   // Destructure new props
  onWebSearchToggle     // Destructure new props
}, ref) => {
  const [inputValue, setInputValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Effect to focus the textarea when isLoading becomes false
  React.useEffect(() => {
    if (!isLoading && textareaRef.current) {
      // Use requestAnimationFrame for potentially smoother focus after state updates
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        console.log("[ChatInputArea Focus Effect] Focused textarea because isLoading became false.");
      });
    }
  }, [isLoading]);

  // Expose the focus method via useImperativeHandle
  React.useImperativeHandle(ref, () => ({
    focus: () => {
      textareaRef.current?.focus();
    },
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

  // Placeholder handlers for Image/Audio buttons
  const handleGenerateImage = () => alert("Image generation not implemented yet.");
  const handleGenerateAudio = () => alert("Audio generation not implemented yet.");

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
                 <Button variant="outline" size="icon" onClick={handleGenerateImage} disabled>
                   <ImageIcon className="h-4 w-4" />
                 </Button>
               </TooltipTrigger>
               <TooltipContent>
                 <p>Attach Image (Coming Soon)</p>
               </TooltipContent>
             </Tooltip>

             <Tooltip>
               <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleGenerateAudio} disabled>
                   <Mic className="h-4 w-4" />
                 </Button>
               </TooltipTrigger>
                <TooltipContent>
                  <p>Use Microphone (Coming Soon)</p>
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

        <div className="flex items-center justify-end space-x-2 pt-1"> 
          <Label htmlFor="web-search-toggle" className={cn(
            "flex items-center text-xs font-normal cursor-pointer",
             isWebSearchEnabled ? "text-blue-500" : "text-muted-foreground"
          )}>
            {isWebSearchEnabled ? (
              <>
                <Globe className="mr-1 h-4 w-4" /> Web Search Enabled
              </>
            ) : (
              <>
                <BrainCircuit className="mr-1 h-4 w-4" /> Standard Mode
              </>
            )}
          </Label>
          <Switch
            id="web-search-toggle"
            checked={isWebSearchEnabled}
            onCheckedChange={onWebSearchToggle}
            disabled={isLoading}
            aria-label="Toggle Web Search"
          />
        </div>
      </form>
    </TooltipProvider>
  )
}) 

ChatInputArea.displayName = 'ChatInputArea'; 