import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types'; // Corrected import path
import { PostgrestError } from '@supabase/supabase-js'; // Import PostgrestError

// Force dynamic rendering (server-side)
export const dynamic = 'force-dynamic';

// PATCH handler for updating a project (e.g., renaming)
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const projectId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('PATCH /api/projects/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the new data from the request body
    // Adjust fields based on what's updatable for a project
    let updateData: { name?: string; description?: string | null };
    try {
        updateData = await request.json();
        // Ensure at least one valid field is present
        if (!updateData || (!updateData.name && typeof updateData.description === 'undefined')) {
            return NextResponse.json({ error: 'Missing required fields (e.g., name)' }, { status: 400 });
        }
    } catch (error) {
        console.error('PATCH /api/projects/[id]: Invalid JSON', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 3. Perform the update operation on the 'projects' table
    console.log(`Attempting PATCH on project ${projectId} by user ${user.id} with data:`, updateData);
    const { data, error } = await supabase
        .from('projects') // Changed table name
        .update(updateData)
        .eq('id', projectId)
        .select('id') // Select something to confirm the update happened based on RLS
        .single(); // Use single() as we expect 0 or 1 row due to RLS + eq

    // 4. Handle results and errors
    if (error) {
        console.error(`PATCH /api/projects/[id]: Supabase Error updating project ${projectId}`, error);
        // RLS might prevent non-members from updating
        if (error.code === 'PGRST116' || !data) {
             return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
        }
        const errorMessage = (error as PostgrestError)?.message || 'Unknown error during project update';
        return NextResponse.json({ error: 'Failed to update project', details: errorMessage }, { status: 500 });
    }

    if (!data) {
         console.warn(`PATCH /api/projects/[id]: No data returned after update for project ${projectId}, likely RLS`);
         return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
    }

    console.log(`Successfully PATCHed project ${projectId}`);
    return NextResponse.json({ message: 'Project updated successfully', id: data.id });
}


// DELETE handler for deleting a project
export async function DELETE(
    request: Request, // Request object might not be needed but is standard
    { params }: { params: { id: string } }
) {
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const projectId = params.id;

    // 1. Check user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        console.error('DELETE /api/projects/[id]: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Perform the delete operation on the 'projects' table
    console.log(`Attempting DELETE on project ${projectId} by user ${user.id}`);
    const { error, count } = await supabase
        .from('projects') // Changed table name
        .delete({ count: 'exact' })
        .eq('id', projectId);

    // 3. Handle results and errors
    if (error) {
        console.error(`DELETE /api/projects/[id]: Supabase Error deleting project ${projectId}`, error);
         // RLS might prevent non-members from deleting
         if (error.code === 'PGRST116') {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
         }
         const errorMessage = (error as PostgrestError)?.message || 'Unknown error during project deletion';
        return NextResponse.json({ error: 'Failed to delete project', details: errorMessage }, { status: 500 });
    }

    // Check if exactly one row was deleted
    if (count === 0) {
        // This means either the project didn't exist OR RLS prevented the deletion (user not member)
        console.warn(`DELETE /api/projects/[id]: Project ${projectId} not found or RLS prevented deletion (count: 0).`);
        return NextResponse.json({ error: 'Project not found or user lacks permission' }, { status: 404 });
    }

    if (count === null || count > 1) {
        console.error(`DELETE /api/projects/[id]: Unexpected delete count (${count}) for project ${projectId}`);
        // Potentially don't return success here, investigate
    }

    console.log(`Successfully DELETEd project ${projectId}`);
    return NextResponse.json({ message: 'Project deleted successfully' });
} 