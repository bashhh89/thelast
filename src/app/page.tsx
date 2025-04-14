'use client' // Need client component for auth state and potentially fetching dashboard data

import React from 'react';
import { useAuthStore } from "@/features/auth/store/auth-store";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Bot, FolderKanban, MessageSquarePlus, PlusCircle, Mail, Presentation, LayoutDashboard, Settings } from 'lucide-react';

// Note: This page should be protected by middleware for logged-in users.
// Logged-out users should be redirected to /login before reaching here.

export default function DashboardPage() { // Renamed component for clarity
  const { user } = useAuthStore();

  // If middleware somehow fails or user state is loading, show minimal loading
  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <p>Loading User...</p> 
      </div>
    );
  }

  // TODO: Fetch actual counts for workspaces, projects, personas
  const workspaceCount = 0;
  const projectCount = 0;
  const personaCount = 0;
  const chatCount = 0;

  return (
    // Using a container and padding consistent with other app pages
    <div className="container mx-auto py-10 space-y-8">
      
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Your Qandu Cockpit. Manage everything from here.
        </p>
      </div>

      <hr />

      {/* Quick Stats Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workspaceCount}</div>
            <p className="text-xs text-muted-foreground">Total active workspaces</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectCount}</div>
             <p className="text-xs text-muted-foreground">Across all workspaces</p>
          </CardContent>
        </Card>
         <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Chats</CardTitle>
            <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{chatCount}</div>
             <p className="text-xs text-muted-foreground">Total chat sessions</p>
          </CardContent>
        </Card>
        <Card>
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personas</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{personaCount}</div>
            <p className="text-xs text-muted-foreground">Custom AI agents</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area - Module Access & Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-3">
        
        {/* Left Column: Core Modules */}
        <div className="lg:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Your Modules</CardTitle>
                    <CardDescription>Access your core Qandu features.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button variant="outline" size="lg" className="justify-start h-auto py-4" asChild>
                        <Link href="/chat">
                            <MessageSquarePlus className="mr-3 h-5 w-5" />
                            <div>
                                <p className="font-semibold">Chat Interface</p>
                                <p className="text-xs text-muted-foreground">Engage with AI models.</p>
                            </div>
                        </Link>
                    </Button>
                    <Button variant="outline" size="lg" className="justify-start h-auto py-4" asChild>
                         <Link href="/personas">
                            <Bot className="mr-3 h-5 w-5" />
                             <div>
                                <p className="font-semibold">Personas</p>
                                <p className="text-xs text-muted-foreground">Manage custom AI agents.</p>
                            </div>
                        </Link>
                    </Button>
                     <Button variant="outline" size="lg" className="justify-start h-auto py-4" disabled> {/* Link to Project Management Page */}
                        {/* <Link href="/projects"> */}
                            <FolderKanban className="mr-3 h-5 w-5" />
                             <div>
                                <p className="font-semibold">Projects</p>
                                <p className="text-xs text-muted-foreground">Organize your work.</p>
                            </div>
                        {/* </Link> */}
                    </Button>
                    {/* Placeholder: Presentations */}
                    <Button variant="outline" size="lg" className="justify-start h-auto py-4" disabled>
                         <Presentation className="mr-3 h-5 w-5" />
                         <div>
                            <p className="font-semibold">Presentations</p>
                            <p className="text-xs text-muted-foreground">Coming Soon</p>
                        </div>
                    </Button>
                    {/* Placeholder: Kanban */}
                    <Button variant="outline" size="lg" className="justify-start h-auto py-4" disabled>
                         <LayoutDashboard className="mr-3 h-5 w-5" />
                         <div>
                            <p className="font-semibold">Kanban Boards</p>
                            <p className="text-xs text-muted-foreground">Coming Soon</p>
                        </div>
                    </Button>
                     {/* Placeholder: Content Gen */}
                    <Button variant="outline" size="lg" className="justify-start h-auto py-4" disabled>
                         <PlusCircle className="mr-3 h-5 w-5" />
                         <div>
                            <p className="font-semibold">Content Generation</p>
                            <p className="text-xs text-muted-foreground">Coming Soon</p>
                        </div>
                    </Button>
                     {/* Placeholder: Email Hub */}
                     <Button variant="outline" size="lg" className="justify-start h-auto py-4" disabled>
                         <Mail className="mr-3 h-5 w-5" />
                         <div>
                            <p className="font-semibold">Email Hub</p>
                            <p className="text-xs text-muted-foreground">Coming Soon</p>
                        </div>
                    </Button>
                    {/* Add more module links as needed */}
                </CardContent>
            </Card>
        </div>

        {/* Right Column: Quick Actions & Activity */}
        <div className="lg:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                    <Button variant="default" className="w-full justify-start" asChild>
                        <Link href="/chat"><MessageSquarePlus className="mr-2 h-4 w-4" /> Start New Chat</Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled> {/* Link to create workspace? */}
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Workspace
                    </Button>
                    <Button variant="outline" className="w-full justify-start" disabled> {/* Link to create project? */}
                        <PlusCircle className="mr-2 h-4 w-4" /> Create New Project
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                        <Link href="/(app)/personas"><Bot className="mr-2 h-4 w-4" /> Create New Persona</Link>
                    </Button>
                     {/* Link to global settings? */}
                     <Button variant="ghost" className="w-full justify-start" disabled>
                        <Settings className="mr-2 h-4 w-4" /> Account Settings
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center">
                        <Activity className="mr-2 h-5 w-5"/> Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground italic">Recent activity feed coming soon...</p>
                    {/* TODO: Implement recent activity list */}
                </CardContent>
            </Card>
        </div>

      </div>

    </div>
  );
}
