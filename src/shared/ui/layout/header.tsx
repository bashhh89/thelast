import React from 'react';
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void; // Function to toggle the sidebar
  isSidebarOpen: boolean; // Current state of the sidebar
}

export const Header = ({ onToggleSidebar, isSidebarOpen }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Sidebar Toggle Button */}
        <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="mr-4">
          {isSidebarOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>

        {/* TODO: Add Other Header Content (Logo, Nav, User Menu) */}
        <p>Qandu Header</p>
      </div>
    </header>
  );
}; 