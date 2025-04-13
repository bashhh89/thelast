'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useWorkspaceStore } from '@/features/workspaces/store/workspace-store';
import { MemberManager } from '@/features/workspaces/components/member-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Settings } from 'lucide-react';

export default function WorkspaceSettingsPage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  // We can get the workspace name from the store if already loaded
  const { workspaces, isLoading: isLoadingWorkspaces, error: workspaceError } = useWorkspaceStore();
  const [workspaceName, setWorkspaceName] = useState<string | null>(null);

  useEffect(() => {
    const currentWorkspace = workspaces.find(ws => ws.id === workspaceId);
    if (currentWorkspace) {
      setWorkspaceName(currentWorkspace.name);
    } 
    // We might need a way to fetch a single workspace if it's not in the list
    // (e.g., if the user navigates directly to the settings page)
    // For now, rely on the main list being loaded.
  }, [workspaceId, workspaces]);

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <Settings className="mr-3 h-6 w-6" /> Workspace Settings
        </h1>
        {isLoadingWorkspaces && !workspaceName && (
          <Skeleton className="h-6 w-1/2" />
        )}
        {!isLoadingWorkspaces && workspaceName && (
          <p className="text-xl text-muted-foreground">{workspaceName}</p>
        )}
         {!isLoadingWorkspaces && !workspaceName && workspaceError && (
           <p className="text-sm text-destructive">Could not load workspace details.</p>
         )}
          {!isLoadingWorkspaces && !workspaceName && !workspaceError && (
           <p className="text-sm text-muted-foreground">Loading workspace details...</p>
         )}
      </div>

      <hr />

      {/* Only render manager if workspaceId is valid */}
      {workspaceId ? (
        <MemberManager workspaceId={workspaceId} />
      ) : (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Invalid Workspace ID.</AlertDescription>
        </Alert>
      )}

      {/* TODO: Add other workspace settings sections here later */}

    </div>
  );
} 