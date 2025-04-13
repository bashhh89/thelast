'use client'

import * as React from 'react'
import { useWorkspaceStore } from '@/features/workspaces/store/workspace-store'
import { ProjectList } from '@/features/projects/components/project-list'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

export default function ProjectsPage() {
  const { selectedWorkspaceId, workspaces } = useWorkspaceStore()
  const selectedWorkspace = workspaces.find(w => w.id === selectedWorkspaceId)

  if (!selectedWorkspace) {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <Alert className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Workspace Selected</AlertTitle>
          <AlertDescription>
            Please select a workspace to view and manage projects.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <ProjectList workspaceId={selectedWorkspace.id} />
    </div>
  )
} 