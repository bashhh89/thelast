'use client'

import * as React from 'react'
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { SendHorizonal } from 'lucide-react'

interface ChatInputAreaProps {
  onSubmit: (messageContent: string) => void;
  isLoading: boolean; // To disable input/button while processing
}

export interface ChatInputAreaRef {
  focus: () => void;
}

// Use forwardRef to allow parent components to call focus
export const ChatInputArea = React.forwardRef<ChatInputAreaRef, ChatInputAreaProps>((
  { onSubmit, isLoading }, 
  ref
) => {
  const [inputValue, setInputValue] = React.useState("");
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t p-4">
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
      <Button type="submit" size="icon" disabled={isLoading || inputValue.trim().length === 0}>
        <SendHorizonal className="h-4 w-4" />
        <span className="sr-only">Send message</span>
      </Button>
    </form>
  )
}) 