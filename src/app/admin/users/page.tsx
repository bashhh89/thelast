import React from 'react';
// Removed cookies import as we'll use service role client
// import { cookies } from 'next/headers'; 
// Removed server component client import
// import { createServerComponentClient } from "@/core/supabase/server"; 
import { createClient } from '@supabase/supabase-js'; // Import standard client
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
import type { User } from '@supabase/supabase-js'; // Import User type for auth data

// Define types explicitly
type Profile = Database["public"]["Tables"]["profiles"]["Row"];
// Select relevant fields from Supabase User type
type AuthUser = Pick<User, 'id' | 'email' | 'created_at' | 'last_sign_in_at'>;

type UserWithProfile = Profile & {
   auth_user: AuthUser | null; // Combine profile with auth user data
};

async function fetchUsersWithProfiles(): Promise<UserWithProfile[]> {
   // Use Service Role Key for admin access to users table
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
   const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

   if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key for admin user fetching');
      throw new Error('Server configuration error for admin access.');
   }

   // Create admin client
   const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false }
   });

   // 1. Fetch all profiles
   const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('*');

   if (profilesError) {
      console.error("Error fetching profiles (admin):", profilesError);
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
   }
   if (!profiles) {
       return []; // No profiles found
   }

   // 2. Fetch all authentication users (requires admin privileges)
   // Warning: Fetching all users might be slow/resource-intensive for large user bases.
   // Consider pagination or fetching only users corresponding to fetched profiles if needed.
   const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers();

   if (authError) {
       console.error("Error fetching auth users (admin):", authError);
       throw new Error(`Failed to fetch authentication users: ${authError.message}`);
   }
   const authUsers = authData.users;

   // 3. Combine data
   const authUserMap = new Map<string, AuthUser>();
   authUsers.forEach(user => {
       authUserMap.set(user.id, {
           id: user.id,
           email: user.email,
           created_at: user.created_at,
           last_sign_in_at: user.last_sign_in_at,
       });
   });

   const combinedUsers: UserWithProfile[] = profiles.map(profile => ({
      ...profile,
      auth_user: authUserMap.get(profile.id) || null // Find matching auth user
   }));

   return combinedUsers;
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