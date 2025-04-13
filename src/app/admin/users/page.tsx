import React from 'react';
import { cookies } from 'next/headers'; // Needed for server client
import { createServerComponentClient } from "@/core/supabase/server"; // Use server client helper
import { Database } from '@/core/supabase/database.types';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from 'lucide-react';

// Combine User and Profile data for display
type UserWithProfile = Database["public"]["Tables"]["profiles"]["Row"] & {
   auth_user: { email?: string | null; created_at: string; last_sign_in_at?: string | null; } | null; // Include relevant auth fields
};

async function fetchUsersWithProfiles() {
   const cookieStore = cookies();
   const supabase = createServerComponentClient(cookieStore);

   // Fetch profiles and join with auth.users table
   // Note: This requires access to auth.users, which might need elevated privileges or specific RLS.
   // A safer alternative is fetching profiles and then making separate auth calls if needed,
   // or creating a DB function/view.
   // For simplicity, let's try a direct join assuming admin privileges allow it.
   const { data, error } = await supabase
    .from('profiles')
    .select(`
      *,
      auth_user: users(email, created_at, last_sign_in_at) 
    `); // This assumes a relationship named 'users' exists or can be inferred.
        // It might need to be explicitly defined or use auth.users directly if permissions allow.
        // If this join fails due to permissions, we need to fetch separately or use a view/function.

  if (error) {
    console.error("Error fetching users with profiles:", error);
    throw new Error(`Failed to fetch users: ${error.message}`); // Throw error to be caught by page
  }

   // Explicit type assertion needed as Supabase join type inference can be tricky
  return data as UserWithProfile[]; 
}


export default async function AdminUsersPage() {
  let users: UserWithProfile[] = [];
  let fetchError: string | null = null;

  try {
    users = await fetchUsersWithProfiles();
  } catch (error: any) {
    fetchError = error.message || "An unknown error occurred while fetching users.";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      
      {fetchError && (
         <Alert variant="destructive">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{fetchError}</AlertDescription>
        </Alert>
      )}

      {!fetchError && (
        <Table>
          <TableCaption>A list of registered users.</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Full Name</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Joined At</TableHead>
              <TableHead>Last Sign In</TableHead>
              {/* Add more columns as needed */}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.auth_user?.email ?? 'N/A'}</TableCell>
                <TableCell>{user.username ?? '-'}</TableCell>
                <TableCell>{user.full_name ?? '-'}</TableCell>
                <TableCell>
                    {user.is_admin ? <Badge variant="destructive">Admin</Badge> : <Badge variant="outline">User</Badge>}
                 </TableCell>
                <TableCell>{user.auth_user?.created_at ? new Date(user.auth_user.created_at).toLocaleDateString() : '-'}</TableCell>
                <TableCell>{user.auth_user?.last_sign_in_at ? new Date(user.auth_user.last_sign_in_at).toLocaleString() : '-'}</TableCell>
                {/* Add actions cell later (view details, edit role etc) */}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 