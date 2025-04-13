'use client';

import React, { useEffect } from 'react';
import { usePersonaStore } from '../store/persona-store';
import { useWorkspaceStore } from '@/features/workspaces/store/workspace-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bot, PlusCircle } from 'lucide-react';

export const PersonaManager = () => {
  const {
    personas,
    isLoading,
    error,
    fetchPersonas
  } = usePersonaStore();
  const { selectedWorkspaceId } = useWorkspaceStore();

  useEffect(() => {
    if (selectedWorkspaceId) {
      fetchPersonas(selectedWorkspaceId);
    }
    // Add dependency on selectedWorkspaceId to refetch when it changes
  }, [selectedWorkspaceId, fetchPersonas]);

  const handleCreatePersona = () => {
    // TODO: Implement create persona dialog/logic
    console.log("TODO: Open create persona dialog");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold tracking-tight">Personas</h2>
        <Button onClick={handleCreatePersona}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create Persona
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
              <CardContent><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-5/6 mt-2" /></CardContent>
              <CardFooter><Skeleton className="h-8 w-1/4" /></CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && error && (
        <Alert variant="destructive">
          <Bot className="h-4 w-4" />
          <AlertTitle>Error Loading Personas</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && personas.length === 0 && (
        <Alert>
          <Bot className="h-4 w-4" />
          <AlertTitle>No Personas Yet</AlertTitle>
          <AlertDescription>Create your first custom AI persona for this workspace.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !error && personas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personas.map((persona) => (
            <Card key={persona.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {persona.name}
                  {/* TODO: Add Edit/Delete buttons here */}
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Bot size={16} /></Button> 
                </CardTitle>
                {persona.description && (
                  <CardDescription>{persona.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                 {/* Display part of the system prompt? */}
                 <p className="line-clamp-3">System Prompt: {persona.system_prompt}</p>
              </CardContent>
              <CardFooter>
                {/* Add actions later? e.g., Test Persona, Get Embed Code */}
                <Button variant="outline" size="sm" disabled>Actions</Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}; 