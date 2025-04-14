import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '@/core/supabase/database.types';

// Assume admin client setup is similar to other admin routes
// Reuse environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Basic check for credentials
if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment.');
  // In a real app, you might throw or have a more robust setup
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

// Define the expected structure for OpenAI's /v1/models response
// Based on https://platform.openai.com/docs/api-reference/models/list
interface OpenAIModel {
    id: string;
    object: string;
    created: number;
    owned_by: string;
    // other potential fields are ignored for now
}

interface OpenAIModelsListResponse {
    object: string;
    data: OpenAIModel[];
}

// Handler to fetch and sync models for a specific endpoint
export async function POST(
  request: Request, // Keep request param even if unused for now
  { params }: { params: { id: string } }
) {
  const endpointId = params.id;
  console.log(`[API POST /admin/endpoints/${endpointId}/models] Received request`);

  // Middleware should have already verified admin status.

  if (!endpointId) {
    return NextResponse.json({ error: 'Endpoint ID is required' }, { status: 400 });
  }

  try {
    // 1. Fetch Endpoint Details
    console.log(`[API POST /admin/endpoints/${endpointId}/models] Fetching endpoint details...`);
    const { data: endpoint, error: fetchError } = await supabaseAdmin
      .from('ai_endpoints')
      .select('id, type, base_url, api_key_env_var')
      .eq('id', endpointId)
      .single();

    if (fetchError || !endpoint) {
      console.error(`[API POST /admin/endpoints/${endpointId}/models] Error fetching endpoint or not found:`, fetchError);
      return NextResponse.json({ error: fetchError?.message || 'Endpoint not found' }, { status: fetchError?.code === 'PGRST116' ? 404 : 500 });
    }
    console.log(`[API POST /admin/endpoints/${endpointId}/models] Found endpoint type: ${endpoint.type}`);

    // 2. Check Endpoint Type and Fetch Models
    let fetchedModels: { model_id: string; model_name?: string }[] = [];

    if (endpoint.type === 'openai_compatible') {
      if (!endpoint.base_url) {
          return NextResponse.json({ error: 'Missing base_url for openai_compatible endpoint' }, { status: 400 });
      }
      if (!endpoint.api_key_env_var) {
           return NextResponse.json({ error: 'Missing api_key_env_var for endpoint' }, { status: 400 });
      }

      const apiKey = process.env[endpoint.api_key_env_var];
      if (!apiKey) {
          console.error(`[API POST /admin/endpoints/${endpointId}/models] API key environment variable "${endpoint.api_key_env_var}" not set.`);
          return NextResponse.json({ error: `Server configuration error: API key for ${endpoint.api_key_env_var} not found.` }, { status: 500 });
      }

      // Construct the models URL (usually /v1/models)
      // Ensure base_url doesn't already end with a slash before adding /v1/models
      const modelsUrl = endpoint.base_url.endsWith('/')
          ? `${endpoint.base_url}v1/models`
          : `${endpoint.base_url}/v1/models`;

      console.log(`[API POST /admin/endpoints/${endpointId}/models] Fetching models from: ${modelsUrl}`);

      try {
          const response = await fetch(modelsUrl, {
              method: 'GET',
              headers: {
                  'Authorization': `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
              },
          });

          if (!response.ok) {
              const errorBody = await response.text();
              console.error(`[API POST /admin/endpoints/${endpointId}/models] Error fetching models from external API (${response.status}):`, errorBody);
              return NextResponse.json({ 
                  error: `Failed to fetch models from endpoint: ${response.status} ${response.statusText}`,
                  details: errorBody
              }, { status: 502 });
          }

          // Check if the response is JSON before trying to parse it
          const contentType = response.headers.get('content-type');
          if (!contentType || !contentType.includes('application/json')) {
              const errorBody = await response.text();
              console.error(`[API POST /admin/endpoints/${endpointId}/models] Unexpected content type: ${contentType}`);
              return NextResponse.json({ 
                  error: 'Endpoint returned non-JSON response',
                  details: errorBody
              }, { status: 502 });
          }

          let modelsResponse: OpenAIModelsListResponse;
          try {
              modelsResponse = await response.json();
          } catch (parseError) {
              console.error(`[API POST /admin/endpoints/${endpointId}/models] Failed to parse JSON response:`, parseError);
              return NextResponse.json({ 
                  error: 'Failed to parse endpoint response as JSON',
                  details: parseError instanceof Error ? parseError.message : 'Unknown parse error'
              }, { status: 502 });
          }

          if (!modelsResponse || !Array.isArray(modelsResponse.data)) {
               console.error(`[API POST /admin/endpoints/${endpointId}/models] Unexpected response format from models endpoint:`, modelsResponse);
               return NextResponse.json({ 
                   error: 'Invalid response format received from models endpoint',
                   details: modelsResponse
               }, { status: 502 });
          }

          // Map the response to our desired format
          fetchedModels = modelsResponse.data.map(model => ({
              model_id: model.id,
              // Use model.id as name if no specific name field exists in standard response
              model_name: model.id
          }));
          console.log(`[API POST /admin/endpoints/${endpointId}/models] Fetched ${fetchedModels.length} models.`);

      } catch (fetchModelsError: any) {
           console.error(`[API POST /admin/endpoints/${endpointId}/models] Error during model fetch:`, fetchModelsError);
           return NextResponse.json({ error: `Failed to communicate with the endpoint: ${fetchModelsError.message}` }, { status: 502 }); // 502 Bad Gateway might be appropriate
      }

    } else {
      console.log(`[API POST /admin/endpoints/${endpointId}/models] Endpoint type "${endpoint.type}" not supported for model fetching yet.`);
      // For now, just return empty - later could support other types
       return NextResponse.json({ message: 'Model fetching not supported for this endpoint type yet.', models_synced: 0 }, { status: 200 });
    }

    // 3. Upsert Models into Database
    if (fetchedModels.length > 0) {
      const modelsToUpsert = fetchedModels.map(model => ({
          endpoint_id: endpointId,
          model_id: model.model_id,
          model_name: model.model_name,
          // 'enabled' defaults to false in the DB, no need to set it here
      }));

      console.log(`[API POST /admin/endpoints/${endpointId}/models] Upserting ${modelsToUpsert.length} models into database...`);

      // Use upsert with ignoreDuplicates to avoid errors if a model already exists.
      // This effectively only inserts new models found.
      const { error: upsertError, count } = await supabaseAdmin
        .from('ai_endpoint_models')
        .upsert(modelsToUpsert, {
           onConflict: 'endpoint_id, model_id', // Specify unique constraint columns
           ignoreDuplicates: true, // If conflict, do nothing (don't update existing)
           // If you wanted to update existing (e.g., model_name), set ignoreDuplicates: false
           // count: 'exact' // Optional: Get precise count of rows affected
        });


      if (upsertError) {
          console.error(`[API POST /admin/endpoints/${endpointId}/models] Error upserting models:`, upsertError);
          return NextResponse.json({ error: `Failed to save models to database: ${upsertError.message}` }, { status: 500 });
      }
      console.log(`[API POST /admin/endpoints/${endpointId}/models] Database upsert successful. Count: ${count ?? 'N/A'}`); // Count might be null depending on upsert specifics
    } else {
        console.log(`[API POST /admin/endpoints/${endpointId}/models] No new models fetched to upsert.`);
    }

    // 4. Return Success Response
    return NextResponse.json({ message: 'Models refreshed successfully.', models_found: fetchedModels.length }, { status: 200 });

  } catch (error: any) {
    console.error(`[API POST /admin/endpoints/${endpointId}/models] Unexpected error in handler:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 