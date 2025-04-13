import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types'; // Corrected import path
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

// Force dynamic rendering (server-side)
export const dynamic = 'force-dynamic';

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


// DELETE handler for deleting a chat session
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const sessionId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('DELETE /api/chat/sessions/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Perform the delete operation on the 'chat_sessions' table
    // Note: RLS policies on `messages` might require CASCADE delete or manual deletion first
    // depending on schema setup. Assuming CASCADE for now.
    console.log(`Attempting DELETE on session ${sessionId} by user ${user.id}`);
    const { error, count } = await supabase
        .from('chat_sessions') // Changed table name
        .delete({ count: 'exact' })
        .eq('id', sessionId);

    // 3. Handle results and errors
    if (error) {
        console.error(`DELETE /api/chat/sessions/[id]: Supabase Error deleting session ${sessionId}`, error);
         if (error.code === 'PGRST116') {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
         }
         const errorMessage = (error as PostgrestError)?.message || 'Unknown error during session deletion';
        return NextResponse.json({ error: 'Failed to delete session', details: errorMessage }, { status: 500 });
    }

    if (count === 0) {
        console.warn(`DELETE /api/chat/sessions/[id]: Session ${sessionId} not found or RLS prevented deletion (count: 0).`);
        return NextResponse.json({ error: 'Session not found or user lacks permission' }, { status: 404 });
    }

    if (count === null || count > 1) {
        console.error(`DELETE /api/chat/sessions/[id]: Unexpected delete count (${count}) for session ${sessionId}`);
    }

    console.log(`Successfully DELETEd session ${sessionId}`);
    return NextResponse.json({ message: 'Chat session deleted successfully' });
} 