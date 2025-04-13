import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types'; // Corrected import path
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

// Force dynamic rendering (server-side)
export const dynamic = 'force-dynamic';

// PATCH handler for updating a workspace (e.g., renaming)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const workspaceId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('PATCH /api/workspaces/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the new data from the request body
    let updateData: { name?: string; description?: string | null }; // Add other updatable fields if needed
    try {
        updateData = await request.json();
        if (!updateData || (!updateData.name && typeof updateData.description === 'undefined')) {
            return NextResponse.json({ error: 'Missing required fields (name or description)' }, { status: 400 });
        }
    } catch (error) {
        console.error('PATCH /api/workspaces/[id]: Invalid JSON', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 3. Perform the update operation
    console.log(`Attempting PATCH on workspace ${workspaceId} by user ${user.id} with data:`, updateData);
    const { data, error } = await supabase
        .from('workspaces')
        .update(updateData)
        .eq('id', workspaceId)
        .select('id') // Select something to confirm the update happened based on RLS
        .single(); // Use single() as we expect 0 or 1 row due to RLS + eq

    // 4. Handle results and errors
    if (error) {
        console.error(`PATCH /api/workspaces/[id]: Supabase Error updating workspace ${workspaceId}`, error);
        // RLS errors often appear as 'PGRST116' or simply return no data
        if (error.code === 'PGRST116' || !data) {
             // This likely means RLS prevented the update (user not owner or workspace doesn't exist)
             return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 }); // 403 Forbidden is often more appropriate than 404 if RLS is the cause
        }
        // If error is not null, use type assertion to access message
        const errorMessage = (error as PostgrestError)?.message || 'Unknown error during workspace update';
        return NextResponse.json({ error: 'Failed to update workspace', details: errorMessage }, { status: 500 });
    }

    if (!data) {
         // Should have been caught by error handling, but double-check RLS/existence
         console.warn(`PATCH /api/workspaces/[id]: No data returned after update for workspace ${workspaceId}, likely RLS`);
         return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
    }


    console.log(`Successfully PATCHed workspace ${workspaceId}`);
    return NextResponse.json({ message: 'Workspace updated successfully', id: data.id });
}


// DELETE handler for deleting a workspace
export async function DELETE(
    request: Request, // Request object might not be needed but is standard
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const workspaceId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('DELETE /api/workspaces/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Perform the delete operation
    // We select 'id' *before* delete to check RLS first (optional, delete has implicit check)
    // Or just attempt delete directly and check affected rows/error
    console.log(`Attempting DELETE on workspace ${workspaceId} by user ${user.id}`);
    const { error, count } = await supabase
        .from('workspaces')
        .delete({ count: 'exact' }) // Request the count of deleted rows
        .eq('id', workspaceId);

    // 3. Handle results and errors
    if (error) {
        console.error(`DELETE /api/workspaces/[id]: Supabase Error deleting workspace ${workspaceId}`, error);
         // RLS errors might appear here too, often resulting in count 0 or specific error codes
         if (error.code === 'PGRST116') { // Check if this code applies to DELETE RLS
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
         }
         // If error is not null, use type assertion to access message
         const errorMessage = (error as PostgrestError)?.message || 'Unknown error during workspace deletion';
        return NextResponse.json({ error: 'Failed to delete workspace', details: errorMessage }, { status: 500 });
    }

    // Check if exactly one row was deleted
    if (count === 0) {
        // This means either the workspace didn't exist OR RLS prevented the deletion (user not owner)
        console.warn(`DELETE /api/workspaces/[id]: Workspace ${workspaceId} not found or RLS prevented deletion (count: 0).`);
        return NextResponse.json({ error: 'Workspace not found or user lacks permission' }, { status: 404 }); // Or 403, depending on desired info exposure
    }

    if (count === null || count > 1) {
        // This shouldn't happen with .eq('id', workspaceId) but good to handle
        console.error(`DELETE /api/workspaces/[id]: Unexpected delete count (${count}) for workspace ${workspaceId}`);
        // Potentially don't return success here, investigate
    }

    console.log(`Successfully DELETEd workspace ${workspaceId}`);
    return NextResponse.json({ message: 'Workspace deleted successfully' });
} 