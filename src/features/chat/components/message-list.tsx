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
  
  // Show skeleton loader while messages are initially loading
  if (isLoading && messages.length === 0) {
    return (
      <div className="flex-1 space-y-4 p-4 overflow-y-auto">
          <Skeleton className="h-16 w-3/4" />
          <Skeleton className="h-16 w-3/4 ml-auto" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-16 w-3/4 ml-auto" />
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
       {/* Render additional skeleton if loading more messages or assistant response */} 
      {isLoading && messages.length > 0 && (
         <div className="flex items-start space-x-3 py-4">
            <Skeleton className="h-8 w-8 rounded-full border" /> 
            <Skeleton className="h-10 w-1/2 rounded-lg px-4 py-2" />
         </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  )
} 