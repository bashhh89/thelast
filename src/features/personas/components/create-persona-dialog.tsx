'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // For system prompt
import { usePersonaStore } from '../store/persona-store'; // We might need the create action

interface CreatePersonaDialogProps {
  children: React.ReactNode; // To wrap the trigger button
  onCreate?: (newPersona: any) => void; // Optional callback
}

export const CreatePersonaDialog: React.FC<CreatePersonaDialogProps> = ({ children, onCreate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get createPersona action from the store
  // const createPersona = usePersonaStore((state) => state.createPersona);

  const resetForm = () => {
    setName('');
    setDescription('');
    setSystemPrompt('');
    setError(null);
    setIsLoading(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm(); // Reset form when closing
    }
    setIsOpen(open);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!name.trim() || !systemPrompt.trim()) {
      setError('Persona Name and System Prompt are required.');
      setIsLoading(false);
      return;
    }

    try {
      console.log('TODO: Call createPersona action from store', { name, description, systemPrompt });
      // ---- Placeholder for actual Store Call ----
      // const newPersona = await createPersona({ 
      //   name: name.trim(), 
      //   description: description.trim() || null,
      //   system_prompt: systemPrompt.trim()
      // });
      // if (!newPersona) { // Assuming store returns null on error
      //   throw new Error("Failed to create persona. See store logs.");
      // }
      // ---- End Placeholder ----
      
      // Simulate success
      await new Promise(res => setTimeout(res, 1000));
      const newPersona = { id: 'temp-' + Date.now(), name: name.trim(), description, system_prompt: systemPrompt.trim(), workspace_id:'test', user_id:'test', created_at:'test', updated_at:'test' }; // Mock

      console.log("Persona created (Simulated)", newPersona);
      onCreate?.(newPersona); // Optional callback
      setIsOpen(false); // Close dialog on success
      // No need to call resetForm here, handleOpenChange(false) will do it

    } catch (err: any) {
      console.error("Error creating persona:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Persona</DialogTitle>
            <DialogDescription>
              Define the name, behavior, and instructions for your custom AI persona.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder="e.g., Helpful Support Bot"
                disabled={isLoading}
                required
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="description" className="text-right pt-2">
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3"
                placeholder="(Optional) Briefly describe the persona's purpose."
                rows={2}
                disabled={isLoading}
              />
            </div>
             <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="systemPrompt" className="text-right pt-2">
                System Prompt
              </Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="col-span-3 min-h-[150px]"
                placeholder="Enter the core instructions for the AI. Define its role, personality, and constraints."
                disabled={isLoading}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive col-span-4 text-center">{error}</p>
            )}
          </div>
          <DialogFooter>
             <DialogClose asChild>
                 <Button type="button" variant="outline" disabled={isLoading}>
                     Cancel
                 </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Persona"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}; 