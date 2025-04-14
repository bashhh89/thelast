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

// Define structure for Google's /v1beta/models response
// Based on https://ai.google.dev/api/rest/v1beta/models/list
interface GoogleModel {
    name: string; // e.g., "models/gemini-1.5-pro-latest"
    version: string;
    displayName: string;
    description: string;
    // We primarily need 'name'
}

interface GoogleModelsListResponse {
    models: GoogleModel[];
    nextPageToken?: string;
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
      .select('id, name, type, base_url, api_key')
      .eq('id', endpointId)
      .single();

    if (fetchError || !endpoint) {
      console.error(`[API POST /admin/endpoints/${endpointId}/models] Error fetching endpoint or not found:`, fetchError);
      return NextResponse.json({ error: fetchError?.message || 'Endpoint not found' }, { status: fetchError?.code === 'PGRST116' ? 404 : 500 });
    }
    console.log(`[API POST /admin/endpoints/${endpointId}/models] Found endpoint type: ${endpoint.type}`);

    // 2. Check Endpoint Type and Fetch Models
    let fetchedModels: { model_id: string; model_name?: string }[] = [];

    if (endpoint.type === 'openai_compatible' || endpoint.type === 'openrouter') {
      if (!endpoint.base_url) {
          return NextResponse.json({ error: `Missing base_url for ${endpoint.type} endpoint` }, { status: 400 });
      }
      const apiKey = endpoint.api_key;
      if (!apiKey) {
          console.error(`[API POST /admin/endpoints/${endpointId}/models] API key is missing in database for ${endpoint.type} endpoint.`);
          return NextResponse.json({ error: `API key not configured for endpoint ${endpoint.name}.` }, { status: 500 });
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
              model_name: model.id
          }));
          // --- Add Detailed Logging ---
          console.log(`[API POST /admin/endpoints/${endpointId}/models] Raw OpenAI-compatible response data:`, JSON.stringify(modelsResponse, null, 2)); // Log raw response
          console.log(`[API POST /admin/endpoints/${endpointId}/models] Parsed ${fetchedModels.length} models (OpenAI-compatible):`, JSON.stringify(fetchedModels));
          // --- End Detailed Logging ---

      } catch (fetchModelsError: any) {
           console.error(`[API POST /admin/endpoints/${endpointId}/models] Error during model fetch:`, fetchModelsError);
           return NextResponse.json({ error: `Failed to communicate with the endpoint: ${fetchModelsError.message}` }, { status: 502 }); // 502 Bad Gateway might be appropriate
      }

    } else if (endpoint.type === 'google') {
      // --- Google AI Model Fetching Logic --- 
      const apiKey = endpoint.api_key;
      if (!apiKey) {
          console.error(`[API POST /admin/endpoints/${endpointId}/models] API key is missing in database for Google endpoint.`);
          return NextResponse.json({ error: `API key not configured for endpoint ${endpoint.name}.` }, { status: 500 });
      }

      let allGoogleModels: GoogleModel[] = [];
      let nextPageToken: string | undefined = undefined;
      let page = 1;
      const MAX_PAGES = 5; // Safety break to prevent infinite loops

      console.log(`[API POST /admin/endpoints/${endpointId}/models] Fetching Google models (page 1)...`);

      do {
        // Construct URL with pagination token if available
        let modelsUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        if (nextPageToken) {
          modelsUrl += `&pageToken=${nextPageToken}`;
          console.log(`[API POST /admin/endpoints/${endpointId}/models] Fetching Google models (page ${page}, token: ${nextPageToken.substring(0, 10)}...)...`);
        }
        
        try {
            const response = await fetch(modelsUrl, { method: 'GET' });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`[API POST /admin/endpoints/${endpointId}/models] Error fetching Google models (page ${page}, status ${response.status}):`, errorBody);
                // Stop fetching on error, but maybe keep models from previous pages?
                nextPageToken = undefined; // Ensure loop terminates
                 // Decide whether to throw or just return partial results
                 // Throwing for now to indicate incomplete fetch
                 throw new Error(`Failed to fetch Google models page ${page}: ${response.status} ${response.statusText}`);
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                 const errorBody = await response.text();
                 console.error(`[API POST /admin/endpoints/${endpointId}/models] Google endpoint returned non-JSON (page ${page}): ${contentType}`);
                 nextPageToken = undefined; // Ensure loop terminates
                 throw new Error(`Google endpoint returned non-JSON response on page ${page}`);
            }
            
            let modelsResponse: GoogleModelsListResponse;
            try {
                modelsResponse = await response.json();
            } catch (parseError) {
                console.error(`[API POST /admin/endpoints/${endpointId}/models] Failed to parse Google JSON response (page ${page}):`, parseError);
                nextPageToken = undefined; // Ensure loop terminates
                throw new Error(`Failed to parse Google endpoint response on page ${page}`);
            }

            if (!modelsResponse || !Array.isArray(modelsResponse.models)) {
                 console.error(`[API POST /admin/endpoints/${endpointId}/models] Unexpected response format from Google models endpoint (page ${page}):`, modelsResponse);
                 nextPageToken = undefined; // Ensure loop terminates
                 throw new Error(`Invalid response format received from Google models endpoint on page ${page}`);
            }

            // Add fetched models to the list and get next token
            allGoogleModels = allGoogleModels.concat(modelsResponse.models);
            nextPageToken = modelsResponse.nextPageToken;
            page++;

        } catch (fetchPageError: any) {
             console.error(`[API POST /admin/endpoints/${endpointId}/models] Error during Google model fetch (page ${page}):`, fetchPageError);
             // Stop fetching on error
             nextPageToken = undefined;
             // Rethrow or handle as partial result
             throw fetchPageError; 
        }
      } while (nextPageToken && page <= MAX_PAGES);

      if (page > MAX_PAGES) {
           console.warn(`[API POST /admin/endpoints/${endpointId}/models] Reached max pages (${MAX_PAGES}) fetching Google models.`);
      }

      // Map the combined Google response
      fetchedModels = allGoogleModels.map(model => ({
          model_id: model.name, 
          model_name: model.displayName || model.name
      }));
      console.log(`[API POST /admin/endpoints/${endpointId}/models] Raw Google response data accumulated from ${page-1} pages.`); // Don't log potentially huge combined data
      console.log(`[API POST /admin/endpoints/${endpointId}/models] Parsed ${fetchedModels.length} total models (Google).`);

      // --- End Google AI Model Fetching Logic --- 

    } else {
      console.log(`[API POST /admin/endpoints/${endpointId}/models] Endpoint type "${endpoint.type}" not explicitly supported for model fetching yet.`);
      // For now, just return empty - later could support other types
       return NextResponse.json({ message: 'Model fetching not explicitly supported for this endpoint type yet.', models_synced: 0 }, { status: 200 });
    }

    // 3. Upsert Models into Database
    if (fetchedModels.length > 0) {
      const modelsToUpsert = fetchedModels.map(model => ({
          endpoint_id: endpointId,
          model_id: model.model_id,
          model_name: model.model_name,
          enabled: true // Enable newly fetched/found models by default
      }));

      console.log(`[API POST /admin/endpoints/${endpointId}/models] Upserting ${modelsToUpsert.length} models into database (enabled: true)...`);

      // Use upsert with ignoreDuplicates to avoid errors if a model already exists.
      // This effectively only inserts new models found.
      const { error: upsertError, count } = await supabaseAdmin
        .from('ai_endpoint_models')
        .upsert(modelsToUpsert, {
           onConflict: 'endpoint_id, model_id', // Specify unique constraint columns
           // If conflict, DO update the enabled status and name (don't ignore duplicates completely)
           ignoreDuplicates: false, 
           // We want to update existing records if found, primarily to ensure they are marked enabled=true
           // And update the name in case it changed upstream
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