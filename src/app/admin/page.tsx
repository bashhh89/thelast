'use client' // Or keep as server component if no client interaction needed initially

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Settings } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the admin area. Manage users and system settings here.
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* User Management Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                User Management
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">...</div> {/* TODO: Add user count */} 
              <p className="text-xs text-muted-foreground">
                View and manage user accounts.
              </p>
               <Link href="/admin/users" className="mt-4 block">
                  <Button variant="outline" size="sm">Manage Users</Button>
               </Link>
            </CardContent>
          </Card>

         {/* Endpoint Management Card */}
         <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Endpoint Status</CardTitle>
               <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">...</div> {/* TODO: Add status indicators */} 
              <p className="text-xs text-muted-foreground">
                View status of external services.
              </p>
               <Link href="/admin/endpoints" className="mt-4 block">
                  <Button variant="outline" size="sm">View Status</Button>
               </Link>
            </CardContent>
          </Card>

         {/* Add more cards for other admin sections as needed */}

      </div>
    </div>
  );
} 