'use client'

import * as React from 'react'
import { ChatMessage, MessageCreateData } from "@/features/chat/types"
import { MessageList } from "@/features/chat/components/message-list"
import { ChatInputArea, ChatInputAreaRef } from "@/features/chat/components/chat-input-area"
import { ModelSelector } from "@/features/chat/components/model-selector"
import { fetchMessages, createMessage, updateMessage } from "@/features/chat/api/chat-service"
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
import { usePersonaStore } from '@/features/personas/store/persona-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/core/supabase/client"
import { v4 as uuidv4 } from 'uuid'

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

  const {
      selectedModel,
      setSelectedModel,
      fetchModels,
      isLoadingModels,
    modelError,
    allModels
  } = useModelStore()

  const { selectedPersona } = usePersonaStore()
  const { personas, selectedPersonaId, selectPersona, isLoading: personasLoading } = usePersonaStore()

  const inputAreaRef = React.useRef<ChatInputAreaRef>(null);

  // Initialize models once on mount
  React.useEffect(() => {
    console.log("[ChatInterface] Initializing models");
    fetchModels();
  }, [fetchModels]);

  // Handle model errors
  React.useEffect(() => {
    if (modelError) {
      console.error("[ChatInterface] Model error:", modelError);
      setError(modelError);
    } else {
      setError(null);
    }
  }, [modelError]);

  // Load messages from local storage when component mounts
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
        // First check localStorage for cached messages
        const cachedMessages = localStorage.getItem(`chat_messages_${chatSessionId}`)
        if (cachedMessages) {
          console.log("[ChatInterface] Loading cached messages for session:", chatSessionId)
          setMessages(JSON.parse(cachedMessages))
          setIsLoading(false)
          return
        }
        
        // If no cached messages, try to fetch from API
        const { data, error: fetchError } = await fetchMessages(chatSessionId);
        
        if (fetchError) {
          console.warn("[ChatInterface] Error loading messages:", fetchError);
          throw fetchError;
        }

        const messagesData = data || [];
        setMessages(messagesData);
        // Cache in localStorage
        localStorage.setItem(`chat_messages_${chatSessionId}`, JSON.stringify(messagesData))
      } catch (err: any) {
        console.error("[ChatInterface] Failed to load messages:", err);
        setError(err.message || "Failed to load chat messages");
        setMessages([]);
      } finally {
        setIsLoading(false);
      }
    }

    loadMessages();
  }, [chatSessionId])

  // Save messages to localStorage when they change
  React.useEffect(() => {
    if (chatSessionId && messages.length > 0) {
      try {
        localStorage.setItem(`chat_messages_${chatSessionId}`, JSON.stringify(messages))
      } catch (err) {
        console.error("[ChatInterface] Failed to cache messages:", err);
      }
    }
  }, [messages, chatSessionId])

  const handleSendMessage = async (message: string) => {
    // **Enhanced Pre-checks**
    if (!chatSessionId) {
      setError("Cannot send message: No active chat session.");
      console.error("[ChatInterface] Send failed: chatSessionId is null.");
      return;
    }
    if (!userId) {
      setError("Cannot send message: User not logged in.");
      console.error("[ChatInterface] Send failed: userId is null.");
      return;
    }
    if (isLoadingModels) {
      setError("Cannot send message: AI models are still loading.");
      console.warn("[ChatInterface] Send delayed: Models loading.");
      return;
    }
    if (modelError) {
      setError(`Cannot send message due to model loading error: ${modelError}`);
      console.error("[ChatInterface] Send failed: Model error exists.", modelError);
      return;
    }
    if (!selectedModel || !selectedModel.id || !selectedModel.endpointId) {
      setError("Cannot send message: No valid AI model selected or model is incomplete.");
      console.error("[ChatInterface] Send failed: selectedModel invalid.", selectedModel);
      // Attempt to re-fetch or select default if possible? Or prompt user.
      // For now, just block sending.
      // fetchModels(); // Optionally try fetching again
      return;
    }

    // **Use a stable reference to the model for the entire send operation**
    const currentModel = { ...selectedModel }; // Shallow copy to prevent mid-send changes

    let tempAiMessageId: number | null = null; // Use number or string consistent with ChatMessage ID type

    try {
      setIsSubmitting(true);
      setIsStreaming(true);
      setError(null);

      // **Ensure consistent ID types (assuming number for Date.now)**
    const userMessageId = Date.now();
      tempAiMessageId = userMessageId + 1; // Assign temporary ID here

    const userMessageData: ChatMessage = {
      id: userMessageId,
      session_id: chatSessionId,
      user_id: userId,
      content: message,
      role: 'user' as const,
      inserted_at: new Date().toISOString(),
      metadata: { 
        model_id: currentModel.id,
          model_name: currentModel.name,
          provider_type: currentModel.providerType // Include provider type
        }
      };

      const initialAiMessageData: ChatMessage = {
        id: tempAiMessageId, // Use the assigned temp ID
        session_id: chatSessionId,
        user_id: userId, // Or assign a system/bot ID if applicable
        content: "", // Start empty
        role: 'assistant' as const,
        inserted_at: new Date().toISOString(),
        metadata: { 
            model_id: currentModel.id, 
          model_name: currentModel.name,
          provider_type: currentModel.providerType, // Include provider type
          streaming: true, // Indicate streaming start
          completed: false
        }
      };
      
      // Add messages to UI immediately
      // Use functional update for setMessages to ensure we have the latest state
      setMessages(prevMessages => {
        const updated = [...prevMessages, userMessageData, initialAiMessageData];
        // Update local storage immediately after setting state
        try {
            localStorage.setItem(`chat_messages_${chatSessionId}`, JSON.stringify(updated));
        } catch (e) {
            console.error("[ChatInterface] Failed to cache optimistic messages:", e);
        }
        return updated;
      });


      // **Prepare API request**
      const fetchUrl = '/api/generate/text';
      const requestBody = {
          prompt: message,
          endpointId: currentModel.endpointId, // Ensure these are valid
          modelId: currentModel.id,           // Ensure these are valid
          systemPrompt: selectedPersona?.system_prompt || undefined, // Send undefined if null/empty
          chatHistory: messages // Send the history *before* adding the new user/assistant messages
              .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Filter relevant roles
              .map(({ role, content }) => ({ role, content })) // Map to expected format
              .slice(-10) // Limit history length if needed
      };

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      };

      console.log(`[ChatInterface] Sending request to ${fetchUrl}`, {
        modelId: currentModel.id,
          endpointId: currentModel.endpointId,
        historyLength: requestBody.chatHistory.length,
        hasSystemPrompt: !!requestBody.systemPrompt
      });

      // **Make API Call**
      const response = await fetch(fetchUrl, fetchOptions);

      console.log(`[ChatInterface] Response status: ${response.status}`);

      if (!response.ok) {
          let errorBody = 'Could not read error response body.';
          try {
              errorBody = await response.text(); // Try to get more details
          } catch (e) { /* ignore */ }
          throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}. Body: ${errorBody}`);
      }

      let finalAiContent = "";
      let toolArgs = "";
      let isToolCall = false;

      // **Handle Response (Streaming or Non-Streaming)**
      // Decision based on backend header or model type (adjust as needed)
      const isStreamingResponse = response.headers.get('Content-Type')?.includes('text/event-stream') ||
                                    (currentModel.providerType !== 'custom' && currentModel.id !== 'searchgpt');

      if (!isStreamingResponse) {
          console.log("[ChatInterface] Handling non-streaming response");
        const text = await response.text();
          finalAiContent = text.trim();
        
          // **Final Update for Non-Streaming**
        setMessages(prev => prev.map(msg => 
          msg.id === tempAiMessageId 
            ? { 
                ...msg, 
                  content: finalAiContent,
                metadata: { 
                  ...msg.metadata,
                  streaming: false,
                  completed: true
                }
              } 
            : msg
        ));

      } else {
        console.log("[ChatInterface] Handling streaming response");
        const reader = response.body?.getReader();
        if (!reader) throw new Error("Response body is not readable for streaming");

        const decoder = new TextDecoder();
        let buffer = ""; // Buffer to hold incomplete lines
        let accumulatedContent = ""; // Keep track of all content

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            console.log("[ChatInterface] Stream finished. Total content accumulated:", accumulatedContent.length, "characters");
            
            // Always update the final content in state
            setMessages(prev => prev.map(msg => 
              msg.id === tempAiMessageId 
                ? { 
                    ...msg, 
                    content: accumulatedContent,
                    metadata: { 
                      ...msg.metadata,
                      streaming: false,
                      completed: true
                    }
                  } 
                : msg
            ));
            break;
          }

          // Decode new chunk and add to buffer
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete SSE messages
          const messages = buffer.split(/\n\n/).filter(Boolean);
          
          // Keep the last item if it doesn't end with \n\n
          if (!buffer.endsWith('\n\n') && messages.length > 0) {
            buffer = messages.pop() || "";
          } else {
            buffer = "";
          }

          for (const message of messages) {
            if (!message.startsWith('data: ')) continue;
            
            const data = message.substring(6); // Remove 'data: ' prefix
            
            if (data === '[DONE]') {
              console.log("[ChatInterface] Received [DONE] signal");
              continue;
            }

            try {
              console.log("[ChatInterface] Processing SSE message:", data.substring(0, 100) + (data.length > 100 ? "..." : ""));
              
              // Skip parsing attempts and just display the content directly
              let newContent = "";
              
              // Handle [DONE] marker
              if (data === '[DONE]') {
                console.log("[ChatInterface] End of stream marker");
                continue;
              }
              
              // First try simple JSON string (most common case from our API)
              if (data.startsWith('"') && data.endsWith('"')) {
                try {
                  newContent = JSON.parse(data);
                  console.log("[ChatInterface] Parsed simple JSON string:", newContent.substring(0, 50) + (newContent.length > 50 ? "..." : ""));
                } catch (e) {
                  // If parsing fails, just use the raw data
                  newContent = data;
                  console.log("[ChatInterface] Using raw string data");
                }
              } 
              // OpenAI format (fallback)
              else if (data.includes("choices") && data.includes("delta")) {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.choices && parsed.choices[0]?.delta?.content) {
                    newContent = parsed.choices[0].delta.content;
                    console.log("[ChatInterface] Extracted from OpenAI format:", newContent);
                  }
                } catch (e) {
                  // If parsing fails, use the raw data
                  newContent = data;
                  console.log("[ChatInterface] Using raw data (OpenAI format parse failed)");
                }
              }
              // Use raw data as last resort
              else {
                newContent = data;
                console.log("[ChatInterface] Using raw data (no format recognized)");
              }
              
              if (newContent && typeof newContent === 'string') {
                console.log("[ChatInterface] Adding to UI:", newContent.substring(0, 30) + (newContent.length > 30 ? "..." : ""));
                accumulatedContent += newContent;
                
                // Update UI with new content
                setMessages(prev => prev.map(msg => 
                  msg.id === tempAiMessageId 
                    ? { ...msg, content: accumulatedContent } 
                    : msg
                ));
              }
            } catch (e) {
              console.error("[ChatInterface] Error processing SSE message:", e);
            }
          }
        }
      } // End else (streaming)

      // Persist final state after all updates are done
       setMessages(prevMessages => {
         try {
           localStorage.setItem(`chat_messages_${chatSessionId}`, JSON.stringify(prevMessages));
         } catch (e) {
           console.error("[ChatInterface] Failed to cache final messages:", e);
         }
         return prevMessages; // Return unchanged state just to trigger potential re-render if needed
       });


    } catch (error: any) {
      console.error("[ChatInterface] Critical error during message send/stream:", error);
      setError(error.message || "Failed to get response from AI");

      // Update the temporary AI message to show the error
      if (tempAiMessageId !== null) {
          setMessages(prev => prev.map(msg => 
             msg.id === tempAiMessageId
            ? { 
                ...msg, 
                content: `Error: ${error.message}`, 
                metadata: { 
                  ...(msg.metadata || {}), 
                  error: true,
                  streaming: false,
                  completed: true
                } 
              } 
               : msg
          ));
      }
    } finally {
      setIsSubmitting(false);
      setIsStreaming(false); // Ensure streaming is set to false in finally
      inputAreaRef.current?.focus(); 
      console.log("[ChatInterface] handleSendMessage finished.");
    }
  }

  const handleGenerateImage = async () => {
    console.warn("Image generation not implemented yet.");
  }

  const handleGenerateAudio = async () => {
    console.warn("Audio generation not implemented yet.");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-2 border-b bg-background">
          <div className="flex items-center space-x-2">
             <ModelSelector disabled={isSubmitting || isStreaming} />
             {selectedPersona && (
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                       <Button variant="outline" size="sm" className="h-9 text-xs px-2 space-x-1">
                         <BrainCircuit size={14} />
                         <span className="truncate max-w-[100px]">{selectedPersona.name}</span>
                       </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">Using Persona: {selectedPersona.name}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
             )}
          </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {!isLoading && !error && <MessageList messages={messages} isLoading={isLoading} error={error} />}
      </div>

      <div className="p-4 border-t bg-background">
        <ChatInputArea 
          ref={inputAreaRef}
          onSubmit={handleSendMessage} 
          isLoading={isSubmitting || isStreaming} 
          onGenerateAudio={handleGenerateAudio} 
        />
      </div>
    </div>
  )
}