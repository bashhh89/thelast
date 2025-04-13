// Page component for managing personas
import { PersonaManager } from '@/features/personas/components/persona-manager';
import React from 'react';

export default function PersonasPage() {
  return (
    <div className="container mx-auto py-10">
      <PersonaManager />
    </div>
  );
} 