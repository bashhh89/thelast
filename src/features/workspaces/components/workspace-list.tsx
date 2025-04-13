'use client'

import * as React from 'react'
import { Workspace } from "@/features/workspaces/types"
import { Skeleton } from "@/components/ui/skeleton" // For loading state
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // For error/empty state
import { Terminal, Trash2, Pencil, Check, X } from 'lucide-react' // Added Pencil, Check, X
import { Button } from "@/components/ui/button" // Ensure Button is imported
import { Input } from "@/components/ui/input" // Added Input
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog" // Added Alert Dialog
import { cn } from "@/lib/utils" // Added cn

interface WorkspaceListProps {
  workspaces: Workspace[];
  isLoading: boolean;
  error: string | null;
  onSelectWorkspace: (workspaceId: string) => void; // Function to handle selection
  selectedWorkspaceId?: string | null; // Currently selected workspace ID
  onDeleteWorkspace: (workspaceId: string) => void; // Add callback for deletion
  onUpdateWorkspace: (workspaceId: string, name: string) => Promise<void>; // Add callback for updating
}

export function WorkspaceList({
  workspaces,
  isLoading,
  error,
  onSelectWorkspace,
  selectedWorkspaceId,
  onDeleteWorkspace,
  onUpdateWorkspace // Destructure new prop
}: WorkspaceListProps) {

  const [editingWorkspaceId, setEditingWorkspaceId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState<string>('');
  const inputRef = React.useRef<HTMLInputElement>(null); 

  const handleStartEdit = (ws: Workspace) => {
    setEditingWorkspaceId(ws.id);
    setEditText(ws.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setEditingWorkspaceId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingWorkspaceId || !editText.trim()) {
      handleCancelEdit(); 
      return;
    }
    const originalName = workspaces.find(ws => ws.id === editingWorkspaceId)?.name;
    if (editText.trim() !== originalName) {
      await onUpdateWorkspace(editingWorkspaceId, editText.trim());
    }
    handleCancelEdit(); 
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

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
        <div key={ws.id} className="group flex items-center gap-1 pr-1 rounded-md hover:bg-accent">
          {editingWorkspaceId === ws.id ? (
            // --- Edit Mode --- 
            <div className="flex items-center w-full pl-2 py-1">
              <Input
                ref={inputRef}
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={handleEditKeyDown}
                onBlur={handleSaveEdit}
                className="h-7 px-2 py-1 text-sm flex-grow mr-1"
              />
              <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleSaveEdit}><Check size={14} /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={handleCancelEdit}><X size={14} /></Button>
            </div>
          ) : (
            // --- Display Mode --- 
            <>
              <Button
                variant={selectedWorkspaceId === ws.id ? "secondary" : "ghost"}
                className={cn("w-full justify-start flex-1 truncate h-8", selectedWorkspaceId === ws.id ? "" : "text-muted-foreground hover:text-foreground")}
                onClick={() => onSelectWorkspace(ws.id)}
                size="sm"
              >
                <span className="truncate">{ws.name}</span>
              </Button>
              {/* Action Buttons */} 
              <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleStartEdit(ws)}><Pencil size={16} /></Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the workspace 
                        "<span className="font-semibold">{ws.name}</span>" 
                        and all associated projects, chats, and messages.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent selecting workspace
                          onDeleteWorkspace(ws.id);
                          // Note: We don't automatically navigate away here, 
                          // as deleting a workspace might not change the current view immediately.
                          // The parent component (Sidebar) should handle potentially clearing selection.
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
} 