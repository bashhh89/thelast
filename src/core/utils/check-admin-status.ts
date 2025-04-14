import { createClient } from '@supabase/supabase-js';

// Ensure these are set in your environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

let supabaseAdmin: ReturnType<typeof createClient>;

function getSupabaseAdminClient() {
  if (!supabaseAdmin) {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase URL or Service Role Key for admin check');
      throw new Error('Server configuration error: Supabase credentials missing.');
    }
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false } // Don't persist session for service role
    });
  }
  return supabaseAdmin;
}

/**
 * Checks if a user has admin privileges.
 * IMPORTANT: This uses the service_role key and should ONLY be called from trusted server-side environments.
 * @param userId The UUID of the user to check.
 * @returns Promise<boolean> True if the user is an admin, false otherwise.
 */
export async function checkAdminStatus(userId: string): Promise<boolean> {
  if (!userId) {
    console.warn('checkAdminStatus called with no userId');
    return false;
  }

  try {
    const adminClient = getSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, they are not an admin
      if (error.code === 'PGRST116') { 
        console.log(`Profile not found for user ${userId}, assuming not admin.`);
        return false;
      }
      // Log other errors but assume not admin
      console.error(`Error checking admin status for user ${userId}:`, error);
      return false; 
    }

    return data?.is_admin === true;

  } catch (err) {
    console.error('Unexpected error in checkAdminStatus:', err);
    return false;
  }
} 