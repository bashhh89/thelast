'use client' // Need client component for hooks and store interaction

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation'; // Import navigation hooks
import { useWorkspaceStore } from "@/features/workspaces/store/workspace-store";
import { useChatSessionStore } from "@/features/chat/store/chat-session-store"; // Import chat session store
import { useProjectStore } from "@/features/projects/store/project-store"; // Import project store
import { useAuthStore } from "@/features/auth/store/auth-store"; // Import auth store for user ID
import { WorkspaceList } from "@/features/workspaces/components/workspace-list";
import { CreateWorkspaceDialog } from "@/features/workspaces/components/create-workspace-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button"; // For New Chat button
import { Skeleton } from "@/components/ui/skeleton"; // For chat list loading
import { Alert, AlertDescription } from "@/components/ui/alert"; // For chat list error
import { MessageSquarePlus, MessageSquareText, FolderKanban, Plus, Trash2, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react'; // Icons
import { cn } from "@/lib/utils"; // Import cn for conditional classes
import { ChatSession } from '@/features/chat/types'; // <-- Import ChatSession type
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu" // Import DropdownMenu components
import { Input } from '@/components/ui/input'; // Import Input

interface SidebarProps {
  isOpen: boolean;
  // We might not need onToggle here if the button is in the Header
  // onToggle: () => void; 
}

export const Sidebar = ({ isOpen }: SidebarProps) => { // Accept isOpen prop
  const router = useRouter();
  const params = useParams(); // Get current route params (like sessionId)
  const currentSessionId = params?.sessionId as string | undefined;

  const { user } = useAuthStore();
  const {
    workspaces,
    selectedWorkspaceId,
    isLoading: isWorkspaceLoading,
    error: workspaceError,
    fetchWorkspaces,
    selectWorkspace,
    createWorkspace,
    deleteWorkspace
  } = useWorkspaceStore();

  const {
    sessions,
    isLoading: isSessionsLoading,
    error: sessionsError,
    fetchSessionsForWorkspace,
    createSession,
    clearSessions,
    deleteSession,
    updateSessionTitle
  } = useChatSessionStore();

  // Get project state and actions
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
    fetchProjects,
  } = useProjectStore();

  // State for inline editing
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null); // Ref for focus

  // State for collapsible sections
  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(true);
  const [isProjectsOpen, setIsProjectsOpen] = useState(true);
  const [isChatsOpen, setIsChatsOpen] = useState(true);

  // Fetch workspaces on mount
  useEffect(() => {
    fetchWorkspaces();
  }, [fetchWorkspaces]);

  // Fetch chat sessions AND projects when selected workspace changes
  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchSessionsForWorkspace(selectedWorkspaceId);
      fetchProjects(selectedWorkspaceId); // Fetch projects for the selected workspace
    } else {
      clearSessions(); // Clear sessions if no workspace selected
      // Consider clearing projects too, or handle display logic differently
      // useProjectStore.setState({ projects: [] }); // Example: Clear projects
    }
  }, [selectedWorkspaceId, fetchSessionsForWorkspace, fetchProjects, clearSessions]);

  const handleCreateWorkspace = async (values: { name: string; description: string | null }) => {
    // Simple error handling, could be enhanced (e.g., showing toast notifications)
    try {
      await createWorkspace(values);
    } catch (err) {
      console.error("Create workspace failed in Sidebar:", err);
      // Error state is handled within the store/dialog, but you could add global notifications here
    }
  };

  // Updated handleCreateChat to accept optional projectId
  const handleCreateChat = async (projectId?: string) => {
    if (!selectedWorkspaceId || !user?.id) {
      console.error("Cannot create chat: No workspace selected or user not found.");
      // TODO: Show user feedback (e.g., toast notification)
      return;
    }
    try {
      console.log(`Attempting to create chat for workspace ${selectedWorkspaceId}, user ${user.id}, project ${projectId}`);
      // Pass projectId to the createSession function
      const newSession = await createSession(selectedWorkspaceId, user.id, projectId);
      if (newSession) {
        console.log(`Chat created successfully: ${newSession.id}, navigating...`);
        router.push(`/chat/${newSession.id}`); // Navigate to the new chat
      } else {
        // This case occurs if createSession returns null (due to caught error)
        console.error("handleCreateChat: createSession returned null, indicating an error occurred.");
        // Optionally show a user-facing error message here
      }
    } catch (err: any) {
      // Catch errors that might occur *before* createSession is called, or if createSession re-throws
      console.error("!!! UNEXPECTED ERROR in handleCreateChat:", err);
      console.error("!!! typeof err:", typeof err);
      console.error("!!! err.message:", err?.message);
      console.error("!!! JSON.stringify(err):", JSON.stringify(err)); 
      // TODO: Show user feedback
    }
  };

  const handleStartEdit = (session: ChatSession) => {
    setEditingSessionId(session.id);
    setEditText(session.title || '');
    // Focus the input after state updates
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (!editingSessionId || !editText.trim()) {
      handleCancelEdit(); // Cancel if empty or invalid state
      return;
    }
    const originalTitle = sessions.find(s => s.id === editingSessionId)?.title;
    if (editText.trim() !== originalTitle) {
      await updateSessionTitle(editingSessionId, editText.trim());
    }
    handleCancelEdit(); // Exit editing mode
  };

  const handleEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveEdit();
    } else if (event.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    // Use cn to conditionally apply width and potentially other styles
    <aside className={cn(
      "fixed top-14 z-30 h-[calc(100vh-3.5rem)] shrink-0 md:sticky border-r",
      "transition-all duration-300 ease-in-out", // Add transition
      // Removed -ml-2 and hidden, control visibility/width directly
      isOpen ? "w-72 md:block" : "w-0 md:w-0 overflow-hidden" // Collapse width
    )}>
      {/* Content only renders or is visible when open */}
      <ScrollArea className={cn(
        "relative overflow-hidden h-full py-6 pr-4 lg:py-8",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none" // Fade out content
      )}>
        <div className="flex flex-col space-y-4">
          {/* Workspace Section */}
          <div className="px-3">
            <Button variant="ghost" size="sm" className="w-full justify-start text-left font-semibold mb-1" onClick={() => setIsWorkspacesOpen(!isWorkspacesOpen)}>
              {isWorkspacesOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              Workspaces
            </Button>
            {isWorkspacesOpen && (
              <>
                <WorkspaceList
                  workspaces={workspaces}
                  isLoading={isWorkspaceLoading && workspaces.length === 0}
                  error={workspaceError}
                  onSelectWorkspace={selectWorkspace}
                  selectedWorkspaceId={selectedWorkspaceId}
                  onDeleteWorkspace={deleteWorkspace}
                />
                <CreateWorkspaceDialog onCreate={handleCreateWorkspace} />
              </>
            )}
          </div>

          <hr className="border-border mx-3" />

          {/* Projects Section */}
          {selectedWorkspaceId && (
            <div className="px-3">
              <Button variant="ghost" size="sm" className="w-full justify-start text-left font-semibold mb-1" onClick={() => setIsProjectsOpen(!isProjectsOpen)}>
                {isProjectsOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Projects
              </Button>
              {isProjectsOpen && (
                <div className="space-y-1">
                  {/* View All Button */}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="w-full justify-end text-xs text-muted-foreground h-7"
                    onClick={() => router.push('/projects')}
                  >
                    View All / Create New
                    <FolderKanban className="ml-2 h-3 w-3" />
                  </Button>
                  {/* Project List (Limited) */}
                  {isProjectsLoading && <Skeleton className="h-6 w-full mt-1" />}
                  {projectsError && <Alert variant="destructive" className="mt-1 text-xs p-2"><AlertDescription>Failed load.</AlertDescription></Alert>}
                  {!isProjectsLoading && projects.length === 0 && !projectsError && 
                    <p className="text-xs text-muted-foreground mt-1 italic px-2">No projects yet.</p>}
                  <div className="mt-1 space-y-1">
                    {projects.slice(0, 5).map(project => ( // Show first 5
                      <Button 
                        key={project.id} 
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start text-muted-foreground hover:text-foreground font-normal text-xs pl-4" // Indent slightly
                        // TODO: Project click action?
                      >
                        <FolderKanban className="mr-2 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{project.name}</span>
                      </Button>
                    ))}
                    {projects.length > 5 && <p className="text-xs text-muted-foreground italic px-2">(...and more)</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          {selectedWorkspaceId && <hr className="border-border mx-3" />} {/* Divider only if Projects shown */}

          {/* Chat Session Section (only if a workspace is selected) */}
          {selectedWorkspaceId && (
            <div className="px-3">
              <div className="flex items-center justify-between mb-1">
                <Button variant="ghost" size="sm" className="justify-start text-left font-semibold" onClick={() => setIsChatsOpen(!isChatsOpen)}>
                {isChatsOpen ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
                Chats
                    </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCreateChat()}>
                  <MessageSquarePlus className="h-4 w-4" />
                  <span className="sr-only">New Chat</span>
              </Button>
              </div>
              {isChatsOpen && (
                <div className="space-y-1">
                  {isSessionsLoading && <Skeleton className="h-6 w-full" />}
                  {sessionsError && <Alert variant="destructive" className="text-xs p-2"><AlertDescription>Failed to load chats.</AlertDescription></Alert>}
                  {!isSessionsLoading && sessions.length === 0 && !sessionsError && 
                    <p className="text-xs text-muted-foreground italic px-2">No chats yet.</p>}
                  {sessions.map(session => (
                    <div key={session.id} className="group relative">
                          {editingSessionId === session.id ? (
                        <div className="flex items-center gap-1">
                              <Input 
                                ref={inputRef}
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={handleEditKeyDown}
                            className="h-7 text-xs"
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleSaveEdit}>
                                <Check className="h-4 w-4" />
                            <span className="sr-only">Save</span>
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCancelEdit}>
                                <X className="h-4 w-4" />
                            <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          ) : (
                        <div className="flex items-center">
                          <Button
                            variant={currentSessionId === session.id ? "secondary" : "ghost"}
                            size="sm"
                            className="flex-1 justify-start text-muted-foreground hover:text-foreground font-normal text-xs"
                                onClick={() => router.push(`/chat/${session.id}`)}
                              >
                                <MessageSquareText className="mr-2 h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{session.title || 'Untitled Chat'}</span>
                              </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <div className="h-7 w-7 opacity-0 group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <ChevronDown className="h-4 w-4" />
                                  <span className="sr-only">More options</span>
                              </Button>
                              </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => handleStartEdit(session)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span>Rename</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteSession(session.id)}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                        </div>
                      ))}
                </div>
              )}
            </div>
          )}

        </div>
      </ScrollArea>
    </aside>
  );
}; 