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
      modelError
  } = useModelStore()
  const { selectedPersona } = usePersonaStore()
  const { personas, selectedPersonaId, selectPersona, isLoading: personasLoading } = usePersonaStore()

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
    const { allModels: currentModels, selectedModel: currentSelection } = useModelStore.getState();
    
    if (isLoadingModels || modelError) return;
    if (!currentSelection && currentModels.length > 0) { 
        console.log("[ChatInterface] No model selected, relying on store default.");
    }
  }, [selectedModel, isLoadingModels, modelError]);

  const handleSendMessage = async (message: string) => {
    if (!chatSessionId || !selectedModel?.id || !userId) {
      setError("Cannot send message: Session, Selected Model, or User ID missing.")
      console.error("Send Message Pre-check failed:", { chatSessionId, selectedModelId: selectedModel?.id, userId });
      return
    }
    const currentModel = selectedModel;

    let initialAiMessage: ChatMessage | null = null; 
    let dbAiMessageId: number | null = null;
    const userMessageId = Date.now();

    const userMessageData = {
      id: userMessageId,
      session_id: chatSessionId,
      user_id: userId,
      content: message,
      role: 'user' as const,
      metadata: { 
        model_id: currentModel.id,
        model_name: currentModel.name
      }
    }

    try {
      setIsSubmitting(true);
      setIsStreaming(true);
      setError(null);
      
      const userMessageWithTimestamp = {
        ...userMessageData,
        inserted_at: new Date().toISOString()
      };
      initialAiMessage = {
        id: Date.now() + 1,
        session_id: chatSessionId,
        user_id: userId,
        content: "",
        role: 'assistant' as const,
        inserted_at: new Date().toISOString(),
        metadata: { 
            model_id: currentModel.id, 
            model_name: currentModel.name 
        }
      };
      setMessages(prev => [...prev, userMessageWithTimestamp, initialAiMessage!]);
      const tempAiMessageId = initialAiMessage.id;

      const saveUserMsgPromise = createMessage(userMessageData);
      const saveAiPlaceholderPromise = createMessage({
        session_id: initialAiMessage.session_id,
        user_id: initialAiMessage.user_id,
        content: "",
        role: initialAiMessage.role,
        metadata: initialAiMessage.metadata,
      });

      saveUserMsgPromise.catch(err => console.error("Background error saving user message:", err));
      saveAiPlaceholderPromise.catch(err => console.error("Background error saving AI placeholder:", err));

      const fetchUrl = '/api/generate/text';
      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            prompt: message, 
            endpointId: currentModel.endpointId,
            modelId: currentModel.id,
            systemPrompt: selectedPersona?.system_prompt,
            chatHistory: messages
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .map(({ role, content }) => ({ role, content }))
        }),
      };
      
      console.log(`[ChatInterface] Sending payload to ${fetchUrl}:`, {
          prompt: message,
          endpointId: currentModel.endpointId,
          modelId: currentModel.id,
          systemPrompt: selectedPersona?.system_prompt ? 'present' : 'none',
          historyLength: messages.filter(msg => msg.role === 'user' || msg.role === 'assistant').length
      });

      const response = await fetch(fetchUrl, fetchOptions);

      if (!response.ok) {
        let errorPayload: any;
        try { errorPayload = await response.json(); } catch { /* ignore */ }
        const errorMsg = errorPayload?.error || `Backend API failed with status ${response.status}`;
        console.error("Error from backend API route:", response.status, errorPayload);
        throw new Error(errorMsg);
      }
      if (!response.body) throw new Error("Received empty response body from backend API");

      let accumulatedContent = ""; 
      let accumulatedToolArgs = "";
      let buffer = "";
      let done = false;
      const stream = response.body;
      const reader = stream.getReader();
      const decoder = new TextDecoder();

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          let messageEndIndex;
          while ((messageEndIndex = buffer.indexOf('\n\n')) !== -1) {
            const messageText = buffer.substring(0, messageEndIndex);
            buffer = buffer.substring(messageEndIndex + 2);
            const lines = messageText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data:')) {
                const dataStr = line.substring(5).trim();
                if (dataStr === "[DONE]") {
                  console.log(`[${currentModel.name}] Received [DONE] marker.`);
                  done = true;
                  break;
                }
                if (dataStr) {
                  if (dataStr.startsWith('{') && dataStr.endsWith('}')) {
                    try {
                      const parsedData = JSON.parse(dataStr);
                      const deltaContent = parsedData.choices?.[0]?.delta?.content;
                      if (typeof deltaContent === 'string' && deltaContent.length > 0) {
                        accumulatedContent += deltaContent;
                      } else {
                        const deltaToolCalls = parsedData.choices?.[0]?.delta?.tool_calls;
                        if (deltaToolCalls && deltaToolCalls.length > 0 && deltaToolCalls[0]?.function?.arguments) {
                           const argsChunk = deltaToolCalls[0].function.arguments;
                           if (typeof argsChunk === 'string') {
                               accumulatedToolArgs += argsChunk;
                           }
                        }
                      }
                    } catch (e) {
                      console.warn(`[${currentModel.name}] Failed to parse JSON chunk:`, dataStr, e);
                    }
                  } else {
                     console.warn(`[${currentModel.name}] Received non-JSON, non-[DONE] data line:`, dataStr);
                  }
                }
              }
            }
            if (done) break;
          }

          if (accumulatedContent) {
             setMessages(prev => prev.map(msg => 
               msg.id === tempAiMessageId ? { ...msg, content: accumulatedContent } : msg
             ));
          }
        }
      }
      console.log(`[${currentModel.name}] Stream processing finished.`);

      if (accumulatedToolArgs) {
         console.log(`[${currentModel.name}] FINAL accumulated tool arguments string:`, accumulatedToolArgs);
         try {
             const finalArgs = JSON.parse(accumulatedToolArgs);
             console.log(`[${currentModel.name}] Parsed final tool arguments object:`, finalArgs);
             console.log(`[${currentModel.name}] Tool arguments were accumulated but no specific handling implemented.`);
         } catch(parseError) {
             console.error(`[${currentModel.name}] Failed to parse final accumulated tool arguments:`, parseError, accumulatedToolArgs);
         }
      }

      if (accumulatedContent) {
           setMessages(prev =>
                  prev.map((msg) =>
                    msg.id === tempAiMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
      }

      const finalContent = accumulatedContent;
      const finalDbAiMessage = await saveAiPlaceholderPromise;
      if (finalDbAiMessage?.data?.id) {
         dbAiMessageId = finalDbAiMessage.data.id;
         console.log(`Updating final AI message in DB (ID: ${dbAiMessageId}) for model ${currentModel.name}`);
         if (dbAiMessageId !== null) {
           await updateMessage(dbAiMessageId, { content: finalContent });
           setMessages(prev => prev.map(msg => 
              msg.id === tempAiMessageId ? { ...msg, content: finalContent, id: dbAiMessageId! } : msg
           ));
          } else {
            console.error("DB Message ID became null unexpectedly before update.");
            setError("Error preparing to save final AI response.");
          }
        } else {
          console.error("Failed to get DB ID for AI placeholder message, cannot update final content.", finalDbAiMessage?.error);
          setError("Error saving final AI response.");
      }

    } catch (error: any) {
      console.error("Error during message send/stream:", error);
      setError(error.message || "Failed to get response from AI");
      if (initialAiMessage) { 
          setMessages(prev => prev.map(msg => 
             msg.id === initialAiMessage!.id 
               ? { ...msg, content: `Error: ${error.message}`, metadata: { ...(msg.metadata || {}), error: true } } 
               : msg
          ));
      }
    } finally {
      setIsSubmitting(false);
        setIsStreaming(false);
      inputAreaRef.current?.focus(); 
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
          onGenerateImage={handleGenerateImage} 
          onGenerateAudio={handleGenerateAudio} 
        />
      </div>
    </div>
  )
}