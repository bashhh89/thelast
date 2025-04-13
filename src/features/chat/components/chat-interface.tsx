'use client'

import * as React from 'react'
import { ChatMessage } from "@/features/chat/types"
import { MessageList } from "@/features/chat/components/message-list"
import { ChatInputArea, ChatInputAreaRef } from "@/features/chat/components/chat-input-area"
import { ModelSelector } from "@/features/chat/components/model-selector"
import { fetchMessages, createMessage } from "@/features/chat/api/chat-service"
import { generateTextPollinations } from "@/core/api/pollinations"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal, Image as ImageIcon, Mic } from 'lucide-react'
import { useModelStore } from "@/core/store/model-store"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useAuthStore } from "@/features/auth/store/auth-store"
import { useChatSessionStore } from "@/features/chat/store/chat-session-store"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Globe, BrainCircuit } from "lucide-react"
import { cn } from "@/lib/utils"
import { useSearchStore } from '@/features/search/store/searchStore'

interface ChatInterfaceProps {
  chatSessionId: string | null;
}

export function ChatInterface({ chatSessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)

  const { user } = useAuthStore()
  const userId = user?.id
  const userName = user?.user_metadata?.full_name || user?.email || null

  const { selectedTextModelId, setSelectedTextModel, availableModels } = useModelStore()
  const {
    isWebSearchEnabled,
    setIsWebSearchEnabled,
  } = useSearchStore()

  // Create a ref for the ChatInputArea
  const inputAreaRef = React.useRef<ChatInputAreaRef>(null);

  React.useEffect(() => {
    if (!chatSessionId) {
      setMessages([])
      setError(null)
      setIsLoading(false)
      return
    }

    const loadMessages = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const { data, error: fetchError } = await fetchMessages(chatSessionId)
        if (fetchError) throw fetchError
        setMessages(data || [])
      } catch (err: any) {
        console.error("Error loading messages:", err)
        setError(err.message || "Failed to load messages.")
        setMessages([])
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [chatSessionId])

  React.useEffect(() => {
    if (!selectedTextModelId) {
      const defaultModel = availableModels.find(m => m.id === 'openai' && m.output_modalities.includes('text'))?.id || 
                         availableModels.find(m => m.output_modalities.includes('text'))?.id
      if (defaultModel) {
        setSelectedTextModel(defaultModel)
      } else {
        console.error('No valid text models available')
      }
    }
  }, [selectedTextModelId, setSelectedTextModel, availableModels])

  // Effect to focus input when streaming stops
  React.useEffect(() => {
    if (!isStreaming && !isLoading) { // Also check isLoading to avoid focus on initial load
      // Add a minimal delay to ensure rendering is complete
      const timer = setTimeout(() => {
        inputAreaRef.current?.focus();
      }, 50); // 50ms delay might be more reliable
      return () => clearTimeout(timer); // Cleanup timer on unmount or state change
    }
  }, [isStreaming, isLoading]);

  const effectiveStandardModelId = selectedTextModelId

  const handleSendMessage = async (message: string) => {
    if (!chatSessionId || !effectiveStandardModelId || !userId) {
      setError("Cannot send message: Session, Standard Model, or User ID missing.")
      return
    }

    const userMessageId = Date.now();
    const userMessageData = {
      id: userMessageId,
      session_id: chatSessionId,
      user_id: userId,
      content: message,
      role: 'user' as const,
      metadata: { 
        model_id: effectiveStandardModelId,
        is_web_search_enabled: isWebSearchEnabled
      }
    }

    try {
      setIsSubmitting(true);
      setIsStreaming(true);
      
      const saveUserMsgPromise = createMessage(userMessageData);
      
      // Add initial user message immediately
      const userMessageWithTimestamp = {
        ...userMessageData,
        inserted_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, userMessageWithTimestamp]);
      
      // Define initialAiMessage as const inside the try block
      const initialAiMessage: ChatMessage = {
        id: Date.now() + 1,
        session_id: chatSessionId,
        user_id: userId,
        content: "",
        role: 'assistant' as const,
        inserted_at: new Date().toISOString(),
        metadata: { 
          model: effectiveStandardModelId, 
          webSearch: isWebSearchEnabled, 
        }
      };
      setMessages(prev => [...prev, initialAiMessage]);

      // Save both messages to database
      const saveInitialAiMsgPromise = createMessage(initialAiMessage);
      
      // Determine the model ID based on the Web Search toggle
      const useSearch = isWebSearchEnabled;
      const SEARCH_MODEL_ID = 'searchgpt'; 
      const standardModelId = effectiveStandardModelId;
      const modelToUse = useSearch ? SEARCH_MODEL_ID : standardModelId;

      if (!modelToUse) {
        setError("No valid model selected for generation.");
        setIsSubmitting(false);
        setIsStreaming(false);
        return;
      }

      try {
        // Call the appropriate API function
        const response = await generateTextPollinations(
            message,
            modelToUse,
            messages.filter(m => m.id !== initialAiMessage.id), 
            userName,
            true, // Always stream to the client
            {},
            isWebSearchEnabled // Pass the flag for standard models
        );

        if (!(response instanceof ReadableStream)) {
           throw new Error("Expected a ReadableStream from generateTextPollinations");
        }

        const stream = response;
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = "";
        let done = false;
        console.log(`[${modelToUse}] Starting stream read loop...`); 

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            console.log(`[${modelToUse}] Raw chunk:`, chunk);

            // Robustly check for SSE format
            if (chunk.trim().startsWith('data:')) {
                const lines = chunk.split("\n").filter(line => line.trim().startsWith("data: "));
                for (const line of lines) {
                    const dataStr = line.substring(6).trim();
                    // console.log(`[${modelToUse}] SSE Data string:`, dataStr);
                    if (dataStr === "[DONE]") {
                        // console.log(`[${modelToUse}] Received [DONE] signal.`);
                        done = true;
                        break;
                    }
                    if (dataStr) {
                        try {
                            // Ensure complete JSON before parsing
                            if (!dataStr.endsWith('}')) continue; 
                            const data = JSON.parse(dataStr);
                            const deltaContent = data.choices?.[0]?.delta?.content;
                            if (deltaContent) {
                                accumulatedContent += deltaContent;
                                setMessages((prev) =>
                                    prev.map((msg) =>
                                        msg.id === initialAiMessage.id
                                            ? { ...msg, content: accumulatedContent }
                                            : msg
                                    )
                                );
                            }
                        } catch (e: any) {
                            if (e instanceof SyntaxError) continue;
                            console.error("Error parsing SSE stream data line:", line, e);
                        }
                    }
                }
            } else if (!done) { // Process as plain text only if not already done
                // console.log(`[${modelToUse}] Processing as plain text chunk.`);
                accumulatedContent += chunk;
                setMessages((prev) =>
                    prev.map((msg) =>
                        msg.id === initialAiMessage.id
                            ? { ...msg, content: accumulatedContent }
                            : msg
                    )
                );
            }
          }
        }

        console.log(`[${modelToUse}] Stream read loop finished. Accumulated:`, accumulatedContent);

        // --- Database Saving Logic --- 
        setIsStreaming(false);
        if (accumulatedContent) {
          const saveAiMsgPromise = createMessage({
            session_id: chatSessionId!,
            user_id: userId!,
            content: accumulatedContent, 
            role: 'assistant',
            metadata: { 
              model: modelToUse, 
              webSearch: isWebSearchEnabled,
            },
          });
          // Original: Saved user message earlier
          // const saveUserMsgPromise = createMessage(userMessageData); 
          try {
              // Fetch the previously saved user message promise if needed for allSettled, 
              // or adjust logic if user message saving was moved/changed.
              // For now, just await the AI message save.
             const aiResult = await saveAiMsgPromise;
             if (aiResult.error) {
                console.error("Failed to save final AI message:", aiResult.error);
                setError("Failed to save AI response to the database.");
             } else if (aiResult.data) {
                 // Update the final message state with ID from database
                 setMessages((prev) => 
                    prev.map((msg) =>
                        msg.id === initialAiMessage.id ? aiResult.data! : msg
                    )
                 );
             }
          } catch (dbError) {
              console.error("Error saving final AI message:", dbError);
              setError("Error saving AI response to the database.");
          }
        } else {
          console.warn(`[${modelToUse}] No content accumulated, skipping final AI message save.`);
          setMessages((prev) => prev.filter((msg) => msg.id !== initialAiMessage.id));
        }
        // --- End Database Saving Logic --- 

      } catch (err: any) {
        setIsStreaming(false);
        // Remove user message by ID and the last added message (placeholder AI)
        setMessages((prev) => prev.filter((msg) => msg.id !== userMessageData.id).slice(0, -1))
        console.error("Error during message send/AI generation:", err)
        const displayError = err?.status 
          ? `${err.message} (Status: ${err.status})` 
          : (err.message || "An unexpected error occurred.")
        setError(displayError)
      }

    } catch (err: any) {
      setIsStreaming(false);
      // Remove user message by ID and the last added message (placeholder AI)
      setMessages((prev) => prev.filter((msg) => msg.id !== userMessageData.id).slice(0, -1))
      console.error("Error during message send/AI generation:", err)
      const displayError = err?.status 
        ? `${err.message} (Status: ${err.status})` 
        : (err.message || "An unexpected error occurred.")
      setError(displayError)
    } finally {
      setIsSubmitting(false)
      // Remove setIsStreaming(false) from here, let the main logic handle it
      // setIsStreaming(false)
      // Remove focus call from finally block
      // setTimeout(() => {
      //   inputAreaRef.current?.focus();
      // }, 0); 
    }
  }

  const handleGenerateImage = () => {
    console.log("Trigger Image Generation")
    alert("Image generation not implemented yet.")
  }

  const handleGenerateAudio = () => {
    console.log("Trigger Audio Generation")
     alert("Audio generation not implemented yet.")
  }

  if (!chatSessionId) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Alert className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Select a Chat</AlertTitle>
          <AlertDescription>
            Choose a chat session from the sidebar to start messaging.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Fixed header with model selector */}
      <div className="flex items-center justify-between p-2 border-b bg-background">
        <div className="flex items-center gap-2">
          <ModelSelector />
          <div className="flex items-center gap-2">
            <Label htmlFor="web-search" className="text-xs">Web Search</Label>
            <Switch
              id="web-search"
              checked={isWebSearchEnabled}
              onCheckedChange={setIsWebSearchEnabled}
            />
          </div>
        </div>
      </div>

      {/* Scrollable message area */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <MessageList 
            messages={messages} 
            isLoading={isLoading} 
            error={error} 
          />
        </div>
      </div>

      {/* Fixed input area */}
      <div className="bg-background border-t">
        <ChatInputArea ref={inputAreaRef} onSubmit={handleSendMessage} isLoading={isSubmitting} />
      </div>
    </div>
  )
} 