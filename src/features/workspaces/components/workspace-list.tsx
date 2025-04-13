'use client'

import * as React from 'react'
import { Workspace } from "@/features/workspaces/types"
import { Skeleton } from "@/components/ui/skeleton" // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // For error/empty state
import { Terminal, Trash2 } from 'lucide-react' // Icon for Alert and Trash2
import { Button } from "@/components/ui/button" // Ensure Button is imported

interface WorkspaceListProps {
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  onSelectWorkspace: (workspaceId: string) => void; // Function to handle selection
  selectedWorkspaceId?: string | null; // Currently selected workspace ID
  onDeleteWorkspace: (workspaceId: string) => void; // Add callback for deletion
}

export function WorkspaceList({
  workspaces,
  isLoading,
  error,
  onSelectWorkspace,
  selectedWorkspaceId,
  onDeleteWorkspace
}: WorkspaceListProps) {

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-5/6" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load workspaces: {error}
        </AlertDescription>
      </Alert>
    )
  }

  if (!workspaces || workspaces.length === 0) {
    return (
       <Alert>
        <Terminal className="h-4 w-4" />
        <AlertTitle>No Workspaces</AlertTitle>
        <AlertDescription>
          You haven't created any workspaces yet. Get started by creating one!
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-1">
      {workspaces.map((ws) => (
        <div key={ws.id} className="flex items-center gap-1"> { /* Flex container */}
          <Button
            variant={selectedWorkspaceId === ws.id ? "secondary" : "ghost"}
            className="w-full justify-start flex-1" // Button takes available space
            onClick={() => onSelectWorkspace(ws.id)}
            size="sm"
          >
            <span className="truncate">{ws.name}</span>
          </Button>
          {/* Delete Button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 flex-shrink-0" // Smaller icon button
            onClick={(e) => { 
              e.stopPropagation(); // Prevent selecting workspace when deleting
              if (window.confirm(`Are you sure you want to delete workspace "${ws.name}"? This cannot be undone.`)) {
                onDeleteWorkspace(ws.id);
              }
            }}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete Workspace</span>
          </Button>
        </div>
      ))}
    </div>
  )
} 