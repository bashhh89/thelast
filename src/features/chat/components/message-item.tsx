'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm' // Import remark-gfm
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import Image from 'next/image' // Import Next Image
import { ChatMessage } from "@/features/chat/types"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar" // Add avatar component
import { User, Bot, ClipboardCopy, Check } from 'lucide-react' // Icons for user/assistant, ClipboardCopy, Check
import { Button } from '@/components/ui/button' // Import Button

// TODO: Add syntax highlighting later (Phase 2)
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
// import { coldarkDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

interface MessageItemProps {
  message: ChatMessage;
  // Add user profile info if needed for avatar/name display
  // userProfile?: { full_name?: string | null; avatar_url?: string | null }; 
}

// Helper to check if content is likely an image or audio URL
const isImageUrl = (url: string): boolean => /\.(jpeg|jpg|gif|png|webp)$/i.test(url);
const isAudioUrl = (url: string): boolean => /\.(mp3|wav|ogg|m4a)$/i.test(url);

export function MessageItem({ message }: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  // Placeholder for avatar logic
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };
  // const avatarName = isUser ? (userProfile?.full_name || 'You') : 'AI';
  // const avatarUrl = isUser ? userProfile?.avatar_url : undefined;
  const avatarName = isUser ? 'You' : 'AI';
  const avatarUrl = undefined; // Replace with actual URLs later

  const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({}); // State to track copied status per code block

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedStates(prev => ({ ...prev, [index]: true }));
      setTimeout(() => {
        setCopiedStates(prev => ({ ...prev, [index]: false }));
      }, 2000); // Reset icon after 2 seconds
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      // Optionally show an error message to the user
    });
  };

  // Define Markdown components with custom styling
  const markdownComponents = {
    pre: ({ node, children, ...props }: any) => {
      // Access the properties of the child code element directly
      const codeElement = React.Children.toArray(children).find(
        (child: any) => React.isValidElement(child) && child.type === 'code'
      ) as React.ReactElement<any> | undefined;
      
      // Extract props from the code element if it exists
      const codeProps = codeElement?.props || {};
      const codeString = codeProps.children ? String(codeProps.children).replace(/\n$/, '') : '';
      
      const codeBlockIndex = node.position?.start.line || Math.random();
      const hasCopied = copiedStates[codeBlockIndex];

      return (
        <div className="relative group">
          <pre {...props} className="!bg-black rounded-md p-4 pt-8 overflow-x-auto text-sm mb-4"> {/* Added mb-4 */} 
            {children}
          </pre>
          <Button
             variant="ghost"
             size="icon"
             className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600"
             onClick={() => handleCopy(codeString, codeBlockIndex)}
          >
            {hasCopied ? <Check className="h-4 w-4 text-green-400" /> : <ClipboardCopy className="h-4 w-4 text-gray-300" />}
            <span className="sr-only">Copy code</span>
          </Button>
        </div>
      );
    },
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      // If it's a block code (has language) and not inline, render with SyntaxHighlighter
      if (!inline && match) {
        return (
          <SyntaxHighlighter
            style={coldarkDark} 
            language={match[1]}
            // Do not render PreTag here, it's handled by the custom `pre` component
            className="syntax-highlighter"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        );
      }
      // Otherwise, render as inline code
      return (
        <code className={cn("font-mono text-sm bg-muted px-1 py-0.5 rounded", className)} {...props}>
          {children}
        </code>
      );
    },
    // Existing table components (keep as they are)
    table: ({ node, ...props }: any) => <div className="overflow-x-auto"><table className="table-auto w-full my-4 border-collapse border border-border" {...props} /></div>, // Added my-4, border styles
    thead: ({ node, ...props }: any) => <thead className="bg-muted/50" {...props} />, 
    th: ({ node, ...props }: any) => <th className="border border-border px-4 py-2 text-left font-semibold" {...props} />, // Added font-semibold, border style
    td: ({ node, ...props }: any) => <td className="border border-border px-4 py-2 align-top" {...props} />, 

    // NEW components based on user prompt
    p: ({ node, ...props }: any) => <p className="mb-4 leading-relaxed" {...props} />, // Added margin-bottom and line-height
    ul: ({ node, ...props }: any) => <ul className="list-disc pl-5 mb-4" {...props} />, // Added list style, padding, margin
    ol: ({ node, ...props }: any) => <ol className="list-decimal pl-5 mb-4" {...props} />, // Added list style, padding, margin
    li: ({ node, ...props }: any) => <li className="mb-1" {...props} />, // Added margin-bottom for list items
    blockquote: ({ node, ...props }: any) => <blockquote className="my-4 border-l-4 border-border pl-4 italic text-muted-foreground" {...props} />, // Added styling
    a: ({ node, ...props }: any) => <a className="text-primary underline hover:text-primary/80" {...props} />, // Added styling
    h1: ({ node, ...props }: any) => <h1 className="text-2xl font-bold my-4" {...props} />, 
    h2: ({ node, ...props }: any) => <h2 className="text-xl font-semibold my-3" {...props} />, 
    h3: ({ node, ...props }: any) => <h3 className="text-lg font-semibold my-3" {...props} />, 
    h4: ({ node, ...props }: any) => <h4 className="text-base font-semibold my-2" {...props} />, 
    h5: ({ node, ...props }: any) => <h5 className="text-sm font-semibold my-2" {...props} />, 
    h6: ({ node, ...props }: any) => <h6 className="text-xs font-semibold my-2" {...props} />, 
  }

  // Determine content type for assistant messages
  let contentElement: React.ReactNode;
  if (isAssistant && isImageUrl(message.content)) {
    contentElement = (
       <Image 
          src={message.content} 
          alt="Generated Image" 
          width={300} // Adjust size as needed
          height={300} 
          className="rounded-md object-cover"
       />
    );
  } else if (isAssistant && isAudioUrl(message.content)) {
    contentElement = (
      <audio controls src={message.content} className="w-full">
        Your browser does not support the audio element.
      </audio>
    );
  } else {
    // Render markdown with plugins and components
    contentElement = (
      <ReactMarkdown 
         remarkPlugins={[remarkGfm]} 
         components={markdownComponents}
      >
        {message.content}
      </ReactMarkdown>
    );
  }

  return (
    <div className={cn("flex items-start space-x-3 py-4", isUser ? "justify-end" : "")}>
      {!isUser && (
        <Avatar className="h-8 w-8 border">
          {/* <AvatarImage src={avatarUrl} alt={avatarName} /> */}
          <AvatarFallback className="bg-primary text-primary-foreground">
            {/* {getInitials(avatarName)} */}
            <Bot size={16} />
          </AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        // Remove prose class as we are handling styling manually now
        "max-w-[75%] rounded-lg",
        // Add padding unless it's an image/audio
        (isAssistant && (isImageUrl(message.content) || isAudioUrl(message.content))) ? "" : "px-4 py-2", 
        isUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        {contentElement}
      </div>

      {isUser && (
         <Avatar className="h-8 w-8 border">
          {/* <AvatarImage src={avatarUrl} alt={avatarName} /> */}
          <AvatarFallback className="bg-secondary text-secondary-foreground">
            {/* {getInitials(avatarName)} */}
            <User size={16} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
} 