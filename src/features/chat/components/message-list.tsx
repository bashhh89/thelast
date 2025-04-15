'use client'

import * as React from 'react'
import { ChatMessage } from "@/features/chat/types"
import { MessageItem } from "@/features/chat/components/message-item"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from 'lucide-react'

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}

export function MessageList({ messages, isLoading, error }: MessageListProps) {
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change or loading state finishes
  React.useEffect(() => {
    if (!isLoading) {
       messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, isLoading])

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error Loading Messages</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }
  
  // Show enhanced skeleton loader while messages are initially loading
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-4 overflow-y-auto">
          <div className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full border" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" /> {/* Username/timestamp */}
              <Skeleton className="h-16 w-3/4" /> {/* Message content */}
            </div>
          </div>
          <div className="flex items-start space-x-3 justify-end">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24 ml-auto" /> {/* Username/timestamp */}
              <Skeleton className="h-12 w-2/3 ml-auto" /> {/* Message content */}
            </div>
            <Skeleton className="h-8 w-8 rounded-full border" />
          </div>
          <div className="flex items-start space-x-3">
            <Skeleton className="h-8 w-8 rounded-full border" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-5/6" />
            </div>
          </div>
      </div>
    )
  }

  // Show a message if no messages exist (even after loading)
  if (!isLoading && messages.length === 0) {
     return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Start Conversation</AlertTitle>
          <AlertDescription>Send a message to begin the chat.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-2 p-4 overflow-y-auto">
      {messages.map((message) => (
        <MessageItem key={message.id} message={message} />
      ))}
      {/* Enhanced loading indicator for streaming/new messages */}
      {isLoading && messages.length > 0 && (
         <div className="flex items-start space-x-3 animate-pulse">
            <div className="h-8 w-8 rounded-full border bg-accent flex items-center justify-center">
              <div className="h-4 w-4 rounded-full bg-muted-foreground/20 animate-ping" />
            </div>
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-1/2 rounded-lg px-4 py-2">
                <span className="text-muted-foreground/50">AI is typing...</span>
              </Skeleton>
            </div>
         </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
} 