import React from 'react';

// This layout will wrap all pages within the /admin route group.
// The main root layout (app/layout.tsx) still applies its providers (ThemeProvider etc.)

// We could add admin-specific header/sidebar/navigation here later.

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/40">
       {/* Optional: Add Admin-specific Header/Navigation */}
       {/* <AdminHeader /> */}
       <main className="container py-8">
          {children} 
       </main>
       {/* Optional: Add Admin-specific Footer */}
    </div>
  );
} 