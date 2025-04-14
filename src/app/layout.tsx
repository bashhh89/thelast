'use client' // Make layout a client component to use hooks

import * as React from 'react'; // Import React for state
import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google"
import "./globals.css";
import { cn } from "@/lib/utils"
import { ThemeProvider } from "@/shared/providers/theme-provider"
import { useInitializeAuthStore } from "@/features/auth/store/auth-store"; // Import the hook
import { Header } from "@/shared/ui/layout/header"; // Import Header
import { Sidebar } from "@/shared/ui/layout/sidebar"; // Import Sidebar
import { useAuthStore } from "@/features/auth/store/auth-store"; // Import auth store to conditionally render layout
import { Toaster } from "sonner"; // Import Toaster

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

// Metadata cannot be exported from client components.

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Initialize auth store state on mount
  useInitializeAuthStore();
  const { user, isLoading } = useAuthStore(); // Get user state
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true); // State for sidebar toggle

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen); // Toggle function

  // Don't render Header/Sidebar on initial load or if user is not logged in
  const showAppLayout = user && !isLoading; // Restore original logic
  // const showAppLayout = true; // DEBUG: Force layout to show

  // Dynamically adjust grid columns based on sidebar state
  const sidebarWidth = isSidebarOpen ? "288px" : "0px"; // 288px = w-72 + gap
  const gridTemplateColumns = showAppLayout ? `[sidebar-start] ${sidebarWidth} [sidebar-end main-start] minmax(0, 1fr) [main-end]` : 'minmax(0, 1fr)';

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          fontSans.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {showAppLayout ? (
            <div className="relative flex min-h-screen flex-col">
              <Header onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
              {/* Updated grid definition */}
              <div 
                className="flex-1 items-start md:grid md:gap-6 lg:gap-10 h-[calc(100vh-3.5rem)]" 
                style={{ gridTemplateColumns: gridTemplateColumns }}
              >
                {/* Pass only isOpen state to Sidebar */}
                <Sidebar isOpen={isSidebarOpen} />
                {/* Main content area - Added h-full and overflow handling */}
                <main className="container h-full py-0 col-start-main-start col-end-main-end overflow-hidden">
                  {children}
                </main>
              </div>
              {/* TODO: Add Footer? */}
            </div>
          ) : (
            // Render children directly for non-authed routes (login, register) or during loading
            children
          )}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
