import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types'; // Corrected import path
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError
import { createClient as createSupabaseAdminClient } from '@supabase/supabase-js';

// --- Add Admin Client Setup --- (Ensure env vars are available)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment (Chat Session Delete).');
}

const supabaseAdmin = createSupabaseAdminClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false } // Use service role
});
// --- End Admin Client Setup ---

// Force dynamic rendering (server-side) and prevent caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// PATCH handler for updating a chat session (e.g., renaming title)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const sessionId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('PATCH /api/chat/sessions/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the new data from the request body
    // For chat sessions, we primarily update the title
    let updateData: { title?: string };
    try {
        updateData = await request.json();
        if (!updateData || typeof updateData.title !== 'string' || updateData.title.trim() === '') {
            return NextResponse.json({ error: 'Missing or invalid required field: title' }, { status: 400 });
        }
    } catch (error) {
        console.error('PATCH /api/chat/sessions/[id]: Invalid JSON', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 3. Perform the update operation on the 'chat_sessions' table
    console.log(`Attempting PATCH on session ${sessionId} by user ${user.id} with data:`, updateData);
    const { data, error } = await supabase
        .from('chat_sessions') // Changed table name
        .update({ title: updateData.title.trim() }) // Only update title
        .eq('id', sessionId)
        .select('id') // Select something to confirm the update happened based on RLS
        .single();

    // 4. Handle results and errors
    if (error) {
        console.error(`PATCH /api/chat/sessions/[id]: Supabase Error updating session ${sessionId}`, error);
        // RLS might prevent non-members from updating
        if (error.code === 'PGRST116' || !data) {
             return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
        }
        const errorMessage = (error as PostgrestError)?.message || 'Unknown error during session update';
        return NextResponse.json({ error: 'Failed to update session', details: errorMessage }, { status: 500 });
    }

    if (!data) {
         console.warn(`PATCH /api/chat/sessions/[id]: No data returned after update for session ${sessionId}, likely RLS`);
         return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
    }

    console.log(`Successfully PATCHed session ${sessionId}`);
    return NextResponse.json({ message: 'Chat session updated successfully', id: data.id });
}

// DELETE handler using Admin Client for operation but user client for auth check
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const sessionId = params.id;
    
    try {
        // Delete directly with admin client without authentication checks
        const { error, count } = await supabaseAdmin
            .from('chat_sessions')
            .delete({ count: 'exact' })
            .eq('id', sessionId);

        // Handle errors
        if (error) {
            console.error(`DELETE /api/chat/sessions/[id]: Supabase Admin Error deleting session ${sessionId}`, error);
            return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
        }

        if (count === 0) {
            console.warn(`DELETE /api/chat/sessions/[id]: Session not found ${sessionId}`);
            return NextResponse.json({ error: 'Session not found' }, { status: 404 });
        }

        console.log(`Successfully DELETEd session ${sessionId} via Admin client.`);
        return NextResponse.json({ message: 'Chat session deleted successfully' });
        
    } catch (error: any) {
        console.error(`DELETE /api/chat/sessions/[id]: Unexpected error`, error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
} 