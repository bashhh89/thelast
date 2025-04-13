'use client'

import React from 'react'
import { useParams } from 'next/navigation'
import { ChatInterface } from "@/features/chat/components/chat-interface"
import { useAuthStore } from "@/features/auth/store/auth-store"
import { Skeleton } from "@/components/ui/skeleton"

// This page will render the chat interface for a specific session ID.

export default function ChatSessionPage() {
  const params = useParams();
  const { user, isLoading: isAuthLoading } = useAuthStore();
  const sessionId = params?.sessionId as string | undefined;

  // Handle cases where user is loading or not logged in (though middleware should prevent this)
  if (isAuthLoading) {
    // Provide a layout-aware skeleton
    return (
       <div className="h-full flex flex-col">
         <div className="flex-1 space-y-4 p-4 overflow-y-auto">
            <Skeleton className="h-16 w-3/4" />
            <Skeleton className="h-16 w-3/4 ml-auto" />
            <Skeleton className="h-10 w-1/2" />
          </div>
          <div className="flex items-center gap-2 border-t p-4">
            <Skeleton className="flex-1 h-10" />
            <Skeleton className="h-10 w-10" />
          </div>
       </div>
    );
  }
  if (!user) {
     // Should be redirected by middleware, but show message just in case
     return <div className="flex h-full items-center justify-center"><p>Redirecting to login...</p></div>;
  }

  // Handle case where sessionId is missing from URL somehow
  if (!sessionId) {
    return <div className="flex h-full items-center justify-center"><p>Invalid chat session ID.</p></div>;
  }

  return (
    // Calculate height: 100% viewport height minus approx header height (h-16 = 4rem)
    // Ensure the parent layout gives this element space to fill.
     <div className="h-[calc(100vh-4rem)] flex flex-col">
         {/* Remove userId prop, ChatInterface gets it from store */}
         <ChatInterface chatSessionId={sessionId} />
     </div>
  );
} 