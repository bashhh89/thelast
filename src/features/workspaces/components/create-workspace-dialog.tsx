'use client'

import * as React from 'react'
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // Add textarea for description
import { WorkspaceCreateData } from "@/features/workspaces/types"
import { PlusCircle } from 'lucide-react' // Icon for button

const formSchema = z.object({
  name: z.string().min(1, { message: "Workspace name cannot be empty." }),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface CreateWorkspaceDialogProps {
  onCreate: (values: WorkspaceCreateData) => Promise<void>; // Make async to handle loading state
  children?: React.ReactNode; // Allow custom trigger
}

export function CreateWorkspaceDialog({ onCreate, children }: CreateWorkspaceDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  })

  const handleFormSubmit = async (values: FormData) => {
    setLoading(true);
    setError(null);
    try {
      // Ensure description is null if empty/undefined before passing to onCreate
      const createData: WorkspaceCreateData = {
        name: values.name,
        description: values.description || null, 
      };
      await onCreate(createData);
      setOpen(false);
      form.reset(); 
    } catch (err: any) {
      console.error("Failed to create workspace:", err);
      setError(err.message || "Failed to create workspace. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Reset form and error state when dialog is opened/closed
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setError(null);
      setLoading(false); // Ensure loading is reset if dialog closed early
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ? children : (
          <Button variant="outline" size="sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Workspace
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Workspace</DialogTitle>
          <DialogDescription>
            Give your new workspace a name and optional description.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="My Awesome Project" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="A brief description of this workspace."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {error && (
              <p className="text-sm font-medium text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
} 