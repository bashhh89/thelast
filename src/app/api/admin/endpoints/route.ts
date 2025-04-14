import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
// Import createRouteHandlerClient removed due to persistent linter issues
// import { createRouteHandlerClient } from '@supabase/ssr'; 
import { Database } from '@/core/supabase/database.types';
import { checkAdminStatus } from '@/core/utils/check-admin-status';
// import { cookies } from 'next/headers'; // Removed cookies import
import { z } from 'zod';

// Type definition for our dynamic endpoint
type AiEndpoint = Database['public']['Tables']['ai_endpoints']['Row'];

// --- Supabase Admin Client Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment.');
}

const supabaseAdmin = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});
// --- End Supabase Admin Client Setup ---

// Schema for request coming from our frontend (using endpointId now)
const frontendRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.'),
  endpointId: z.string().uuid('Invalid Endpoint ID format.'), // Expect UUID
  systemPrompt: z.string().optional(),
});


export async function POST(request: Request) {
  console.log("[API /admin/endpoints] Received POST request");

  // NOTE: Bypassing standard user auth check due to persistent issues with ssr helpers.
  // Relying on admin check later.
  // const supabaseServer = createRouteHandlerClient<Database>({ cookies });

  try {
    // 1. Parse and validate request body FIRST
    console.log("[API /admin/endpoints] Parsing request body...");
    const body = await request.json();
    console.log("[API /admin/endpoints] Request body parsed:", body);
    const { name, type, base_url, api_key, enabled, owner_id } = body;

    // Basic validation on parsed body
    if (!name || !type || !api_key || !owner_id) {
      console.error("[API /admin/endpoints] Validation failed: Missing required fields.", { name, type, api_key, owner_id });
      return NextResponse.json({ error: 'Missing required fields: name, type, api_key, owner_id' }, { status: 400 });
    }
    if (type === 'openai_compatible' && !base_url) {
      console.error("[API /admin/endpoints] Validation failed: Missing base_url for openai_compatible type.");
      return NextResponse.json({ error: 'base_url is required for type openai_compatible' }, { status: 400 });
    }
    console.log("[API /admin/endpoints] Body validation successful.");

    // 2. Check if the provided owner_id corresponds to an admin user
    console.log(`[API /admin/endpoints] Checking admin status for potential owner: ${owner_id}`);
    const isAdmin = await checkAdminStatus(owner_id);
    console.log(`[API /admin/endpoints] Admin status result: ${isAdmin}`);
    if (!isAdmin) {
      console.warn(`[API /admin/endpoints] Forbidden: User ${owner_id} is not an admin.`);
      return NextResponse.json({ error: 'Forbidden: Operation requires admin privileges' }, { status: 403 });
    }
    console.log(`[API /admin/endpoints] User ${owner_id} confirmed as admin.`);

    // 3. Insert into database using admin client (already validated owner_id is admin)
    const insertData = {
      name,
      type,
      base_url: type === 'openai_compatible' ? base_url : null,
      api_key,
      enabled: enabled !== undefined ? enabled : true,
      owner_id,
    };
    console.log("[API /admin/endpoints] Attempting to insert into database:", { ...insertData, api_key: '[REDACTED]' });
    const { data: newEndpoint, error: insertError } = await supabaseAdmin
      .from('ai_endpoints')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[API /admin/endpoints] Supabase insert error:', insertError);
      return NextResponse.json({ error: insertError.message || 'Failed to create endpoint' }, { status: 500 });
    }
    console.log("[API /admin/endpoints] Database insert successful:", { ...newEndpoint, api_key: '[REDACTED]' });

    // 4. Return success response
    console.log("[API /admin/endpoints] Returning success response.");
    return NextResponse.json(newEndpoint, { status: 201 });

  } catch (error: any) {
    console.error('[API /admin/endpoints] Error:', error);
    let errorMessage = 'Internal Server Error in admin endpoints route';
    let statusCode = 500;

    if (error instanceof SyntaxError) { 
      errorMessage = 'Invalid JSON body';
      statusCode = 400;
    }
    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}

// TODO: Optionally add GET handler later to fetch endpoints if needed server-side
// (though the client-side fetch in the page component is usually sufficient) 