'use client' // Make page client component to use hooks and Supabase client

import Image from "next/image";
import { useRouter } from 'next/navigation';
import { useAuthStore } from "@/features/auth/store/auth-store";
import { createClient } from "@/core/supabase/client";
import { Button } from "@/components/ui/button";
import Link from 'next/link';

export default function Home() {
  const { user, clearAuth } = useAuthStore();
  const supabase = createClient();
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuth(); // Clear user from Zustand store
    router.push('/login'); // Redirect to login after logout
    // No router.refresh() needed usually after sign out
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Qandu Platform</h1>

      {user ? (
        <div className="text-center">
          <p className="mb-4">Welcome, {user.email}!</p>
          <p className="mb-4">Your User ID: {user.id}</p>
          {/* Placeholder for redirecting to actual app content */}
          <Link href="/app"> 
            <Button className="mb-4">Go to App</Button>
          </Link>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>
      ) : (
        <div className="text-center">
          <p className="mb-4">You are not logged in.</p>
          <Link href="/login">
            <Button className="mr-2">Login</Button>
          </Link>
          <Link href="/register">
            <Button variant="secondary">Register</Button>
          </Link>
        </div>
      )}

      {/* Keep original content below for now, or remove */}
      <div className="mt-16 text-center text-sm text-muted-foreground">
        (Original Next.js template content below)
      </div>
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex mt-8">
        {/* Original content... */}
      </div>
       {/* ... rest of original content ... */}
    </main>
  );
}
