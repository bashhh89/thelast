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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog" // Import Alert Dialog
import { Checkbox } from "@/components/ui/checkbox" // Import Checkbox
import { Project } from '@/features/projects/types'; // <-- Add Project type import

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
    deleteWorkspace,
    updateWorkspace
  } = useWorkspaceStore();

  const {
    sessions,
    isLoading: isSessionsLoading,
    error: sessionsError,
    fetchSessionsForWorkspace,
    createSession,
    clearSessions,
    deleteSession,
    updateSessionTitle,
    // Get selection state and actions
    selectedSessionIds,
    toggleSessionSelection,
    selectAllSessions,
    deselectAllSessions,
    deleteSelectedSessions
  } = useChatSessionStore();

  // Get project state and actions
  const {
    projects,
    isLoading: isProjectsLoading,
    error: projectsError,
    fetchProjects,
    // Destructure project update/delete functions from store
    updateProject,
    deleteProject,
  } = useProjectStore();

  // State for inline editing CHATS
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editText, setEditText] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null); // Ref for focus

  // State for inline editing PROJECTS
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectName, setEditProjectName] = useState<string>('');
  const projectInputRef = useRef<HTMLInputElement>(null); // Ref for project input focus

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

  // --- Chat Edit Handlers ---
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
      console.log(`TODO: Call updateSessionTitle(${editingSessionId}, ${editText.trim()})`); // Keep log for now
      // Uncomment the store action call
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

  // --- Project Edit Handlers ---
  const handleStartProjectEdit = (project: Project) => {
    setEditingProjectId(project.id);
    setEditProjectName(project.name || '');
    // Focus the input after state updates
    setTimeout(() => projectInputRef.current?.focus(), 0);
  };

  const handleCancelProjectEdit = () => {
    setEditingProjectId(null);
    setEditProjectName('');
  };

  const handleSaveProjectEdit = async () => {
    if (!editingProjectId || !editProjectName.trim()) {
      handleCancelProjectEdit(); // Cancel if empty or invalid state
      return;
    }
    const originalName = projects.find(p => p.id === editingProjectId)?.name;
    if (editProjectName.trim() !== originalName) {
      console.log(`TODO: Call updateProject(${editingProjectId}, ${editProjectName.trim()})`); // Keep log for now
      // Call the store action
      await updateProject(editingProjectId, { name: editProjectName.trim() });
    }
    handleCancelProjectEdit(); // Exit editing mode
  };

  const handleProjectEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveProjectEdit();
    } else if (event.key === 'Escape') {
      handleCancelProjectEdit();
    }
  };

  // Determine if all current sessions are selected
  const areAllSessionsSelected = sessions.length > 0 && selectedSessionIds.size === sessions.length;

  // Handler for the master checkbox
  const handleSelectAllToggle = (checked: boolean) => {
    if (checked) {
      selectAllSessions();
    } else {
      deselectAllSessions();
    }
  };

  // State and handlers for the bulk delete confirmation dialog
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const confirmBulkDelete = async () => {
      await deleteSelectedSessions();
      setShowBulkDeleteDialog(false);
  };

  // --- Project Delete Handlers ---
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [showProjectDeleteDialog, setShowProjectDeleteDialog] = useState(false);

  const handleProjectDeleteClick = (project: Project) => {
    setDeletingProject(project);
    setShowProjectDeleteDialog(true);
  };

  const cancelProjectDelete = () => {
    setShowProjectDeleteDialog(false);
    setDeletingProject(null);
  };

  const confirmProjectDelete = async () => {
    if (deletingProject) {
      console.log(`TODO: Call deleteProject(${deletingProject.id})`); // Keep log for now
      // Call the store action
      await deleteProject(deletingProject.id);
      cancelProjectDelete(); // Close dialog
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
                  onUpdateWorkspace={updateWorkspace}
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
                  {/* Project List */}
                  {isProjectsLoading && projects.length === 0 && (
                    <>
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </>
                  )}
                  {!isProjectsLoading && projectsError && (
                    <Alert variant="destructive">
                      <AlertDescription>{projectsError.message || 'Failed to load projects.'}</AlertDescription>
                    </Alert>
                  )}
                  {!isProjectsLoading && !projectsError && projects.length === 0 && (
                    <p className="text-xs text-muted-foreground px-2">No projects yet.</p>
                  )}
                  {projects.map((project) => (
                    <div
                      key={project.id}
                      className={cn(
                        "group flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer",
                        // Add active state styling if needed, e.g., based on current route or selected project context
                        // currentProjectId === project.id ? "bg-accent font-semibold" : ""
                      )}
                      // onClick={() => {/* Handle project selection if needed */}} // Add later if needed
                    >
                      {editingProjectId === project.id ? (
                        <div className="flex-grow flex items-center mr-1">
                          <Input
                            ref={projectInputRef}
                            type="text"
                            value={editProjectName}
                            onChange={(e) => setEditProjectName(e.target.value)}
                            onKeyDown={handleProjectEditKeyDown}
                            onBlur={handleSaveProjectEdit} // Save on blur as well
                            className="h-7 px-1 text-sm flex-grow" // Adjust styling as needed
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-6 w-6 ml-1 text-green-500 hover:text-green-600" onClick={handleSaveProjectEdit}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={handleCancelProjectEdit}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center flex-grow overflow-hidden mr-1">
                            <FolderKanban className="h-4 w-4 mr-2 shrink-0" />
                            <span className="truncate flex-grow" title={project.name}>
                              {project.name}
                            </span>
                          </div>
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleStartProjectEdit(project); }}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive/80" onClick={(e) => { e.stopPropagation(); handleProjectDeleteClick(project); }}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                            </AlertDialog>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {/* Add Project Button - Placeholder/Example */}
                  {/* Consider moving project creation to a dedicated button/dialog */}
                  {/* <Button variant="ghost" size="sm" className="w-full justify-start mt-1">
                    <Plus className="h-4 w-4 mr-2" /> Add Project
                  </Button> */}
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
                {/* Buttons appear when section is open */} 
                {isChatsOpen && (
                    <div className="flex items-center gap-1">
                        {/* Bulk Delete Button (visible when items are selected) */} 
                        {selectedSessionIds.size > 0 && (
                            <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
                                <AlertDialogTrigger asChild>
                                     <Button variant="destructive" size="icon" className="h-7 w-7">
                                        <Trash2 className="h-4 w-4" />
                                        <span className="sr-only">Delete Selected</span>
                                     </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete {selectedSessionIds.size} Chat Sessions?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. All selected chat sessions and their messages will be permanently deleted.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive ...">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        {/* Select All Checkbox */} 
                        <Checkbox 
                            id="select-all-chats"
                            checked={areAllSessionsSelected}
                            onCheckedChange={handleSelectAllToggle}
                            disabled={sessions.length === 0} // Disable if no sessions
                            className="ml-1 mr-1 h-4 w-4"
                         />
                        {/* New Chat Button */} 
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleCreateChat()} disabled={!selectedWorkspaceId || isSessionsLoading}>
                            <MessageSquarePlus className="h-4 w-4" />
                            <span className="sr-only">New Chat</span>
                        </Button>
                    </div>
                )}
              </div>
              {isChatsOpen && (
                <div className="space-y-1">
                  {isSessionsLoading && <Skeleton className="h-6 w-full" />}
                  {sessionsError && <Alert variant="destructive" className="text-xs p-2"><AlertDescription>Failed to load chats.</AlertDescription></Alert>}
                  {!isSessionsLoading && sessions.length === 0 && !sessionsError && 
                    <p className="text-xs text-muted-foreground italic px-2">No chats yet.</p>}
                  {sessions.map(session => (
                    <div key={session.id} className="group flex items-center pr-1 rounded-md hover:bg-accent">
                      {/* Checkbox for individual selection */} 
                      <Checkbox 
                         id={`select-chat-${session.id}`}
                         checked={selectedSessionIds.has(session.id)}
                         onCheckedChange={() => toggleSessionSelection(session.id)}
                         className="ml-2 mr-2 h-4 w-4"
                      />
                      {editingSessionId === session.id ? (
                        // --- Edit Mode --- 
                        <div className="flex items-center w-full py-1 flex-grow">
                           <Input
                              ref={inputRef}
                              type="text"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={handleEditKeyDown}
                              onBlur={handleSaveEdit} // Save on blur
                              className="h-7 px-2 py-1 text-xs flex-grow mr-1"
                           />
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-green-500" onClick={handleSaveEdit}><Check size={14} /></Button>
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={handleCancelEdit}><X size={14} /></Button>
                        </div>
                      ) : (
                        // --- Display Mode --- 
                        <div className="flex items-center flex-grow w-full">
                          <Button
                            variant={currentSessionId === session.id ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                              "w-full h-7 justify-start text-left font-normal text-xs truncate pl-2 py-1 flex-grow", 
                              // Slightly adjust padding/width if needed due to checkbox
                              currentSessionId === session.id ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                            onClick={() => router.push(`/chat/${session.id}`)}
                          >
                            <MessageSquareText className="mr-2 h-4 w-4 flex-shrink-0" />
                            <span className="truncate flex-grow">{session.title || `Chat ${session.id.substring(0, 4)}...`}</span>
                          </Button>
                          {/* Edit and Delete Buttons - visible on hover */} 
                          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleStartEdit(session)}><Pencil size={14} /></Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600">
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    {/* ... Single delete dialog content ... */}
                                </AlertDialogContent>
                             </AlertDialog>
                          </div>
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

      {/* --- Delete Confirmation Dialogs --- */}

      {/* Bulk Chat Delete Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedSessionIds.size} Chat Sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All selected chat sessions and their messages will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Delete Confirmation Dialog */}
      <AlertDialog open={showProjectDeleteDialog} onOpenChange={setShowProjectDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the project
              <span className="font-semibold"> {deletingProject?.name}</span> and remove its association
              from any chat sessions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelProjectDelete}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmProjectDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </aside>
  );
}; 