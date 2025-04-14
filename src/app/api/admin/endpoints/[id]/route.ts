#!filename: src/app/api/admin/endpoints/[id]/route.ts
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types';
import { z } from 'zod';

// --- Supabase Admin Client Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment.');
  // Consider throwing an error or returning a 500 response
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false } // Don't persist session for service role
});
// --- End Supabase Admin Client Setup ---

// Route handler for deleting an AI endpoint
export async function DELETE(
  request: Request, // Keep request param for consistency, even if unused for now
  { params }: { params: { id: string } }
) {
  console.log(`[API DELETE /admin/endpoints/${params.id}] Received request`);

  // Middleware should have already verified admin status.
  // No need to fetch user or call checkAdminStatus here.

  // 1. Validate Endpoint ID from URL parameters
  const endpointId = params.id;
  if (!endpointId) {
    console.error('[API DELETE /admin/endpoints] Missing endpoint ID in request path.');
    return NextResponse.json({ error: 'Endpoint ID is required' }, { status: 400 });
  }
  // Optional: Add UUID validation if IDs should always be UUIDs
  // const parseResult = z.string().uuid().safeParse(endpointId);
  // if (!parseResult.success) {
  //   console.error(`[API DELETE /admin/endpoints] Invalid Endpoint ID format: ${endpointId}`);
  //   return NextResponse.json({ error: 'Invalid Endpoint ID format' }, { status: 400 });
  // }
  console.log(`[API DELETE /admin/endpoints/${params.id}] Validated endpoint ID.`);


  // 2. Perform Deletion using Admin Client
  try {
    console.log(`[API DELETE /admin/endpoints/${params.id}] Attempting deletion...`);
    const { error: deleteError } = await supabaseAdmin
      .from('ai_endpoints')
      .delete()
      .eq('id', endpointId);

    if (deleteError) {
      console.error(`[API DELETE /admin/endpoints/${params.id}] Supabase delete error:`, deleteError);
      // Handle specific errors like 'not found' if needed
      if (deleteError.code === 'PGRST116') { // Resource not found
          return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
      }
      return NextResponse.json({ error: deleteError.message || 'Failed to delete endpoint' }, { status: 500 });
    }

    console.log(`[API DELETE /admin/endpoints/${params.id}] Deletion successful.`);
    // Return 204 No Content on successful deletion
    return new Response(null, { status: 204 });

  } catch (error: any) {
    console.error(`[API DELETE /admin/endpoints/${params.id}] Unexpected error:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Optional: Add PUT/PATCH handler if needed
// export async function PUT(...) { ... } 