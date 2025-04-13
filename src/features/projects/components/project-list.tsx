'use client'

import * as React from 'react'
import { ProjectWithWorkspace } from '../types'
import { useProjectStore } from '../store/project-store'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Pencil } from 'lucide-react'
import { CreateProjectDialog } from './create-project-dialog'
import { EditProjectDialog } from './edit-project-dialog'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Terminal } from 'lucide-react'

interface ProjectListProps {
  workspaceId: string
}

export function ProjectList({ workspaceId }: ProjectListProps) {
  const { projects, isLoading, error, fetchProjects, deleteProject } = useProjectStore()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false)
  const [editingProject, setEditingProject] = React.useState<ProjectWithWorkspace | null>(null)

  React.useEffect(() => {
    fetchProjects(workspaceId)
  }, [workspaceId, fetchProjects])

  if (isLoading) {
    return <div className="p-4">Loading projects...</div>
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <Terminal className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  if (!isLoading && projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Alert className="max-w-md">
          <Terminal className="h-4 w-4" />
          <AlertTitle>No Projects</AlertTitle>
          <AlertDescription>
            Create your first project to get started.
          </AlertDescription>
        </Alert>
        <Button
          className="mt-4"
          onClick={() => {
            console.log("Create Project button clicked (empty list case)");
            setIsCreateDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Projects</h2>
        <Button onClick={() => {
           console.log("Create Project button clicked (header case)");
           setIsCreateDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <div
            key={project.id}
            className="border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{project.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.workspace.name}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditingProject(project)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteProject(project.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {project.description && (
              <p className="mt-2 text-sm text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>
        ))}
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        workspaceId={workspaceId}
      />

      {editingProject && (
        <EditProjectDialog
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
          project={editingProject}
        />
      )}
    </div>
  )
} 