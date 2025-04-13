import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// TODO: Fetch actual status from backend or environment variables
const endpointStatus = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    status: 'Operational', // Placeholder
  },
  pollinations: {
    url: 'https://pollinations.ai', // Placeholder
    status: 'Operational', // Placeholder
  },
  // Add other relevant endpoints
};

export default function AdminEndpointsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Endpoint Status & Configuration</h1>
      <p className="text-muted-foreground">
         Read-only view of connected services.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(endpointStatus).map(([key, value]) => (
           <Card key={key}>
             <CardHeader>
               <CardTitle className="capitalize">{key}</CardTitle>
               <CardDescription>{value.url || 'URL not configured'}</CardDescription>
             </CardHeader>
             <CardContent>
                <p>Status: <Badge variant={value.status === 'Operational' ? 'default' : 'destructive'}>{value.status}</Badge></p>
                {/* TODO: Add more configuration details if available */} 
             </CardContent>
           </Card>
        ))}
      </div>
       {/* TODO: Add configuration management section later */}
    </div>
  );
} 