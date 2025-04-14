import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment.');
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const updateModelSchema = z.object({
  enabled: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; modelId: string } }
) {
  const endpointId = params.id;
  const modelId = params.modelId;

  console.log(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Received request`);

  if (!endpointId || !modelId) {
    return NextResponse.json({ error: 'Endpoint ID and Model ID are required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const parseResult = updateModelSchema.safeParse(body);

    if (!parseResult.success) {
        console.error(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Invalid request body:`, parseResult.error.errors);
        return NextResponse.json({ error: 'Invalid request body', details: parseResult.error.errors }, { status: 400 });
    }

    const { enabled } = parseResult.data;
    console.log(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Updating enabled status to: ${enabled}`);

    const { data: updatedModel, error: updateError } = await supabaseAdmin
      .from('ai_endpoint_models')
      .update({ enabled: enabled })
      .eq('id', modelId)
      .eq('endpoint_id', endpointId)
      .select()
      .single();

    if (updateError) {
      console.error(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Supabase update error:`, updateError);
      if (updateError.code === 'PGRST116') {
           return NextResponse.json({ error: 'Model not found for this endpoint' }, { status: 404 });
      }
      return NextResponse.json({ error: updateError.message || 'Failed to update model status' }, { status: 500 });
    }

    if (!updatedModel) {
        return NextResponse.json({ error: 'Model not found or update failed unexpectedly' }, { status: 404 });
    }

    console.log(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Update successful.`);
    return NextResponse.json(updatedModel, { status: 200 });

  } catch (error: any) {
     if (error instanceof SyntaxError) {
         console.error(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Invalid JSON received.`);
         return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
     }
     console.error(`[API PATCH /admin/endpoints/${endpointId}/models/${modelId}] Unexpected error:`, error);
     return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 