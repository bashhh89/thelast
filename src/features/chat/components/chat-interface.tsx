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
import { AiModel } from '@/core/store/model-store'

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
  const { isWebSearchEnabled, setIsWebSearchEnabled } = useSearchStore()

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

  const handleSendMessage = async (message: string) => {
    if (!chatSessionId || !selectedTextModelId || !userId) {
      setError("Cannot send message: Session, Selected Model, or User ID missing.")
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
        model_id: selectedTextModelId,
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
          model: selectedTextModelId, 
          webSearch: isWebSearchEnabled, 
        }
      };
      setMessages(prev => [...prev, initialAiMessage]);

      // Save both messages to database
      const saveInitialAiMsgPromise = createMessage(initialAiMessage);
      
      // Determine the model ID based on the Web Search toggle
      const useSearch = isWebSearchEnabled;
      const SEARCH_MODEL_ID = 'searchgpt'; 
      const modelToUse = useSearch ? SEARCH_MODEL_ID : selectedTextModelId;

      if (!modelToUse) {
        setError("No valid model selected for generation.");
        setIsSubmitting(false);
        setIsStreaming(false);
        return;
      }

      console.log(`[ChatInterface] Calling generateTextPollinations with model: ${modelToUse}`);

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
        let buffer = ""; // Buffer to handle fragmented SSE messages

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
           if (value) {
            const chunk = decoder.decode(value, { stream: true }); // Decode chunk
            console.log(`[${modelToUse}] Raw chunk received:`, chunk);

            if (modelToUse === SEARCH_MODEL_ID) {
              // Handle plain text stream directly for searchgpt
              accumulatedContent += chunk;
              setMessages((prev) =>
                prev.map((msg) =>
                  msg.id === initialAiMessage.id
                    ? { ...msg, content: accumulatedContent }
                    : msg
                )
              );
              // No buffering needed for plain text, process immediately
              buffer = ""; // Clear buffer as it's handled
            } else {
              // Handle SSE stream for other models
              buffer += chunk; // Add chunk to buffer for SSE processing
              console.log(`[${modelToUse}] SSE Buffer:`, buffer);

              // Process buffer line by line for SSE messages
              let boundary = buffer.indexOf('\\n\\n'); // SSE messages end with \n\n

              while (boundary !== -1) {
                  const message = buffer.substring(0, boundary);
                  buffer = buffer.substring(boundary + 2); // Remove message + \n\n
                  boundary = buffer.indexOf('\\n\\n'); // Find next boundary

                  const lines = message.split('\\n').filter(line => line.trim().startsWith("data: "));
                  for (const line of lines) {
                      const dataStr = line.substring(6).trim();
                      if (dataStr === "[DONE]") {
                          console.log(`[${modelToUse}] Received [DONE] signal.`);
                          break; // Exit inner loop, outer loop will handle done via readerDone
                      }
                      if (dataStr) {
                          try {
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
                              if (e instanceof SyntaxError) {
                                  console.warn(`[${modelToUse}] Incomplete JSON received, continuing buffer:`, dataStr);
                                  continue; // Continue buffering if JSON is incomplete
                              }
                              console.error("Error parsing SSE stream data line:", line, e);
                          }
                      }
                  }
              } // end inner while (boundary !== -1)
            } // end else (SSE handling)
          } // end if (value)
        } // end while (!done)

        // Ensure any final part of the buffer is processed for SSE (unlikely but possible)
        if (buffer && modelToUse !== SEARCH_MODEL_ID) {
             console.warn(`[${modelToUse}] Processing remaining buffer after stream end:`, buffer);
             // Basic handling for remaining buffer - might need refinement
             try {
                 // Attempt to process any final complete SSE messages
                 const lines = buffer.split('\\n').filter(line => line.trim().startsWith("data: "));
                 for (const line of lines) {
                     const dataStr = line.substring(6).trim();
                     if (dataStr && dataStr !== "[DONE]") {
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
                     }
                 }
             } catch (e) {
                 console.error("Error processing final SSE buffer:", buffer, e);
             }
        }

        console.log(`[${modelToUse}] Stream read loop finished. Accumulated:`, accumulatedContent);

        // --- Database Saving Logic --- 
        // Now that the stream is complete, set streaming to false and save the final message
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
          try {
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
          // Remove the placeholder AI message if nothing was received
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
      {/* Header Area within ChatInterface */}
      <div className="flex items-center justify-between border-b p-4 sticky top-0 bg-background z-10">
        <div className="flex-grow mr-4">
          <ModelSelector
            // No props needed here, component uses store internally
          />
        </div>

        {/* REMOVED Placeholder Buttons */}
        {/* <div className="flex space-x-2 flex-shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={handleGenerateImage} disabled>
                  <ImageIcon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Generate Image (Coming Soon)</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                 <Button variant="outline" size="icon" onClick={handleGenerateAudio} disabled>
                  <Mic className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
               <TooltipContent>
                 <p>Generate Audio (Coming Soon)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div> */}
      </div>

      {/* Message List Area */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList messages={messages} isLoading={isLoading} error={error} />
      </div>

      {/* Input Area */}
      <ChatInputArea
        ref={inputAreaRef}
        onSubmit={handleSendMessage}
        isLoading={isSubmitting}
        isWebSearchEnabled={isWebSearchEnabled}
        onWebSearchToggle={setIsWebSearchEnabled}
      />
    </div>
  )
} 