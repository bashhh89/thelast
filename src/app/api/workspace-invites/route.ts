import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types';
import { PostgrestError } from '@supabase/supabase-js';

// Type for the expected request body
interface InviteRequestBody {
  workspace_id: string;
  invited_email: string;
  role_to_assign?: 'owner' | 'member'; // Optional, defaults to 'member' in DB
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST handler - Create a new workspace invite
export async function POST(request: Request) {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // 1. Check user authentication (the inviter)
    const { data: { user: inviter }, error: authError } = await supabase.auth.getUser();
    if (authError || !inviter) {
        console.error('POST /api/workspace-invites: Auth Error', authError);
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    let inviteRequest: InviteRequestBody;
    try {
        inviteRequest = await request.json();
        if (!inviteRequest.workspace_id || !inviteRequest.invited_email) {
             return NextResponse.json({ error: 'Missing required fields: workspace_id, invited_email' }, { status: 400 });
        }
        // Basic email format check (not exhaustive)
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteRequest.invited_email)) {
            return NextResponse.json({ error: 'Invalid invited_email format' }, { status: 400 });
        }

    } catch (error) {
        console.error('POST /api/workspace-invites: Invalid JSON', error);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { workspace_id, invited_email, role_to_assign = 'member' } = inviteRequest;

    try {
        // 3. Check if inviter is owner (optional check, RLS should enforce on insert)
        //    We might do this check upfront for a clearer error message.
        const { data: ownerCheck, error: ownerCheckError } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspace_id)
            .eq('user_id', inviter.id)
            .eq('role', 'owner')
            .maybeSingle(); // Use maybeSingle as RLS might block if not member

        if (ownerCheckError) {
            console.error(`POST /api/workspace-invites: Error checking owner status for workspace ${workspace_id}`, ownerCheckError);
            // Don't expose detailed error, RLS on insert will be the final check
            // return NextResponse.json({ error: 'Failed to verify permissions', details: ownerCheckError.message }, { status: 500 });
        }

        if (!ownerCheck) {
             console.warn(`POST /api/workspace-invites: User ${inviter.id} is not owner of workspace ${workspace_id} or RLS prevented check.`);
             // RLS on the actual insert will provide the definitive block
             // return NextResponse.json({ error: 'Forbidden: Inviter is not workspace owner' }, { status: 403 });
        }

        // 4. Check if the invited email corresponds to an existing user already in the workspace
        // Find profile ID for the invited email
        const { data: invitedProfile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', invited_email)
            .single();
           
        let isAlreadyMember = false;
        if (invitedProfile && !profileError) {
            const { data: memberCheck, error: memberCheckError } = await supabase
                .from('workspace_members')
                .select('user_id')
                .eq('workspace_id', workspace_id)
                .eq('user_id', invitedProfile.id)
                .maybeSingle();
            if (memberCheck) {
                isAlreadyMember = true;
            }
            if (memberCheckError) {
                 console.error(`POST /api/workspace-invites: Error checking existing membership for workspace ${workspace_id}`, memberCheckError);
                 // Proceed cautiously, insert might fail if they are already a member
            }
        } else if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = 0 rows returned
             console.error(`POST /api/workspace-invites: Error fetching profile for email ${invited_email}`, profileError);
             // Proceed with invite, user might not exist yet
        }
       
        if (isAlreadyMember) {
            return NextResponse.json({ error: 'User with this email is already a member of the workspace' }, { status: 409 }); // 409 Conflict
        }
       
        // 5. Check for existing *pending* invite for this email/workspace
        const { data: existingInvite, error: existingInviteError } = await supabase
            .from('workspace_invites')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('invited_email', invited_email)
            .eq('status', 'pending')
            .maybeSingle();

        if (existingInviteError) {
             console.error(`POST /api/workspace-invites: Error checking existing invites for workspace ${workspace_id}`, existingInviteError);
             // Proceed, insert might fail if unique constraint exists
        }
       
        if (existingInvite) {
             return NextResponse.json({ error: 'A pending invite already exists for this email address in this workspace' }, { status: 409 });
        }

        // 6. Create the invite record
        // RLS policy "Allow workspace owners to INSERT invites" will be enforced here
        const { data: newInvite, error: insertError } = await supabase
            .from('workspace_invites')
            .insert({
                workspace_id: workspace_id,
                invited_email: invited_email,
                inviter_id: inviter.id,
                role_to_assign: role_to_assign
                // token, status, expires_at have defaults
            })
            .select()
            .single();

        // 7. Handle insert results
        if (insertError) {
            console.error(`POST /api/workspace-invites: Supabase error creating invite in workspace ${workspace_id}`, insertError);
            if (insertError.code === '23503') { // Foreign key violation (e.g., workspace_id doesn't exist)
                 return NextResponse.json({ error: 'Invalid workspace ID' }, { status: 400 });
            }
             if (insertError.code === 'PGRST116') { // RLS violation is often PGRST116 on insert/update/delete if USING fails
                return NextResponse.json({ error: 'Forbidden. Ensure you are an owner of this workspace.' }, { status: 403 });
            }
            return NextResponse.json({ error: 'Failed to create invite', details: insertError.message }, { status: 500 });
        }

        if (!newInvite) {
            console.error(`POST /api/workspace-invites: No data returned after insert for workspace ${workspace_id}`);
            return NextResponse.json({ error: 'Failed to create invite, no data returned.' }, { status: 500 });
        }

        // 8. TODO: Trigger email sending (e.g., via Supabase Edge Function or other service)
        console.log(`TODO: Trigger email invite for token ${newInvite.token}`);

        console.log(`Successfully created invite ${newInvite.id} for ${invited_email} to workspace ${workspace_id}`);
        // Return minimal confirmation, don't leak token etc.
        return NextResponse.json({ message: 'Invite created successfully' }, { status: 201 });

    } catch (error: any) {
        // Catch unexpected errors
        console.error("POST /api/workspace-invites: Unexpected error", error);
        return NextResponse.json({ error: 'An unexpected server error occurred.', details: error.message }, { status: 500 });
    }
} 