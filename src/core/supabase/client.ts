import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/core/supabase/database.types' // We'll generate this later

export function createClient() {
  // Create a supabase client on the browser with project specific api keys
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
} 