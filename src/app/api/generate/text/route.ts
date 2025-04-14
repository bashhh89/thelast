import { NextResponse } from 'next/server';
import { z } from 'zod';
import { Readable } from 'stream'; // Import for stream checking
import { createClient } from '@supabase/supabase-js'; // Import Supabase client
import { Database } from '@/core/supabase/database.types'; // Import DB types

// Define structure for Google Gemini generateContent request body
interface GoogleGenerateContentRequest {
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  // Add generationConfig, safetySettings etc. later if needed
}

// Type definition for our dynamic endpoint
type AiEndpoint = Database['public']['Tables']['ai_endpoints']['Row'];

// TODO: Securely manage API keys if needed for the actual service
// const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

// --- Supabase Admin Client Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('FATAL: Missing Supabase URL or Service Role Key in API route environment.');
  // In a real app, you might want to prevent startup or have more robust handling
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});
// --- End Supabase Admin Client Setup ---

// Schema for request coming from our frontend
const frontendRequestSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.'),
  endpointId: z.string().min(1, 'Endpoint ID cannot be empty.'), 
  modelId: z.string().min(1, 'Model ID cannot be empty.'),
  systemPrompt: z.string().optional(),
  // Add message history (optional array of messages)
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).optional(), 
});

// Define the built-in model IDs from the list you provided
const builtInPollinationsModels: string[] = [
  'openai', 'qwen-coder', 'llama', 'llamascout', 'mistral', 'unity', 'midijourney',
  'rtist', 'searchgpt', 'evil', 'deepseek-reasoning', 'deepseek-reasoning-large',
  'llamalight', 'phi', 'llama-vision', 'pixtral', 'hormoz', 'hypnosis-tracy',
  'mistral-roblox', 'roblox-rp', 'sur', 'llama-scaleway', 'openai-audio'
];

// Refactored helper function
async function callAiEndpoint(
  endpoint: AiEndpoint, 
  apiKey: string, // Pass the direct key here
  modelId: string, 
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
): Promise<Response> {
  console.log(`[callAiEndpoint] Preparing request for endpoint type: ${endpoint.type}, name: ${endpoint.name}, modelId: ${modelId}`);

  let fetchUrl: string;
  let requestBody: Record<string, any>;
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': stream ? 'text/event-stream' : 'application/json',
  };
  const actualModelId = modelId; // Usually the same, but might differ if endpoint config overrides

  // --- Google Gemini Specific Logic --- 
  if (endpoint.type === 'google') {
    if (!apiKey) throw new Error('API key is required for Google endpoint.');
    // Construct Google-specific URL and body
    // NOTE: modelId here should be like 'gemini-1.5-pro', not 'models/gemini-1.5-pro'
    // The route handler sending the request should ensure this.
    const modelNameOnly = actualModelId.startsWith('models/') ? actualModelId.substring(7) : actualModelId;
    fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelNameOnly}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;
    
    // Convert OpenAI message format to Google's format
    const googleMessages = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role, // Map 'assistant' to 'model'
        parts: [{ text: msg.content }]
    }));

    requestBody = { contents: googleMessages };
    // No Authorization header for Google key-based auth
  } 
  // --- Pollinations Specific Logic --- 
  else if (endpoint.type === 'pollinations') {
    fetchUrl = 'https://text.pollinations.ai/openai'; 
    requestBody = {
      model: actualModelId, 
      messages: messages,
      stream: stream,
      referrer: 'QanduApp'
    };
    // No Authorization header needed
  } 
  // --- OpenAI Compatible / Other Logic --- 
  else {
    // Assume OpenAI compatible /chat/completions path for others
    if (!endpoint.base_url) {
      throw new Error(`Endpoint '${endpoint.name}' (type: ${endpoint.type}) is missing Base URL.`);
    }
    fetchUrl = `${endpoint.base_url.replace(/\/$/, '')}/chat/completions`; 
    requestBody = {
      model: actualModelId,
      messages: messages,
      stream: stream,
    };
    // Add Auth headers IF apiKey exists 
    if (apiKey) {
        if (endpoint.type === 'anthropic') { // Special case for Anthropic headers
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else {
            // Default to Bearer token for others (openai, openrouter, custom, etc.)
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
    } else if (endpoint.type !== 'custom') {
        // Throw error if key is missing for non-custom types that need it
        console.warn(`[callAiEndpoint] API key missing for required endpoint type ${endpoint.type}, name ${endpoint.name}.`);
        throw new Error(`API key configuration missing for endpoint '${endpoint.name}'.`);
    }
  }

  console.log(`[callAiEndpoint] Making fetch request to URL: ${fetchUrl}`);
  const requestOptions: RequestInit = {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody),
  };

  return await fetch(fetchUrl, requestOptions);
}

export async function POST(request: Request) {
  console.log("[API /generate/text] Received POST request");

  try {
    // Log the raw body first
    const requestBodyRaw = await request.json();
    console.log("[API /generate/text] Raw request body received:", JSON.stringify(requestBodyRaw, null, 2));

    // Now validate the parsed body
    const validation = frontendRequestSchema.safeParse(requestBodyRaw);

    if (!validation.success) {
      console.error("[API /generate/text] Invalid request body schema:", validation.error.flatten());
      return NextResponse.json({ error: 'Invalid request body structure', details: validation.error.flatten() }, { status: 400 });
    }

    const { prompt, endpointId, modelId, systemPrompt, chatHistory } = validation.data;
    console.log(`[API /generate/text] Received request for endpointId '${endpointId}', modelId '${modelId}'. History length: ${chatHistory?.length ?? 0}`);

    // --- Prepare messages (Includes history, handles system prompt) --- 
    let messagesForApi: Array<{ role: string; content: string }> = [];
    // Add System Prompt (needs specific handling for Google later if needed)
    if (systemPrompt && systemPrompt.trim() !== '') {
        // For OpenAI compatible, add as system message
        messagesForApi.push({ role: 'system', content: systemPrompt });
        // Google's 'system' instruction is separate - handle in callAiEndpoint if needed
    }
    if (chatHistory) {
      messagesForApi = messagesForApi.concat(
          chatHistory.filter(msg => msg.role === 'user' || msg.role === 'assistant')
                     .map(msg => ({ role: msg.role, content: msg.content }))
      );
    }
    messagesForApi.push({ role: 'user', content: prompt });

    console.log(`[API /generate/text] Total messages prepared for AI: ${messagesForApi.length}`);
    // console.log("[API /generate/text] Prepared messages:", messagesForApi); // Log if needed for debugging

    let aiApiCall: Response;
    let endpointNameForLogging: string = modelId;

    // --- Handle ALL requests by fetching Custom Endpoint config from DB --- 
    console.log(`[API /generate/text] Handling request for endpoint: ${endpointId}, model: ${modelId}`);
    console.log(`[API /generate/text] Fetching details for endpoint configuration ${endpointId}...`);
    const { data: fetchedEndpoint, error: endpointError } = await supabaseAdmin
      .from('ai_endpoints')
      // Select all fields needed for the AiEndpoint type, even if not directly used
      .select('id, name, type, base_url, api_key, enabled, api_key_env_var, created_at, owner_id, updated_at') 
      .eq('id', endpointId)
      .single();

    if (endpointError || !fetchedEndpoint) {
      console.error(`[API /generate/text] Error fetching endpoint configuration details for ${endpointId}:`, endpointError);
      // Add more context to the error
      const errorMsg = endpointError?.message 
          ? `Database error fetching config: ${endpointError.message}` 
          : `Endpoint configuration not found or inaccessible: ${endpointId}`;
      return NextResponse.json({ error: errorMsg }, { status: 404 }); // 404 is appropriate here
    }
    console.log(`[API /generate/text] Endpoint config fetched: ${fetchedEndpoint.name} (Type: ${fetchedEndpoint.type})`);

    if (!fetchedEndpoint.enabled) {
        return NextResponse.json({ error: `Endpoint configuration '${fetchedEndpoint.name}' is currently disabled.` }, { status: 403 });
    }

    console.log(`[API /generate/text] Using API key directly from database for '${fetchedEndpoint.name}'.`);
    
    // --- Call Helper --- 
    console.log(`[API /generate/text] Calling generic endpoint helper for: ${fetchedEndpoint.name} using model ${modelId}`);
    
    // Ensure modelId format is correct for Google (remove 'models/' prefix)
    const effectiveModelId = (fetchedEndpoint.type === 'google' && modelId.startsWith('models/'))
      ? modelId.substring(7)
      : modelId;

    // Pass the fully typed object (already done)
    const endpointForHelper: AiEndpoint = {
      ...fetchedEndpoint,
      // Ensure all required fields for AiEndpoint type are present
      // Nullish coalescing might not be needed if select('*') or all fields are used
      // api_key_env_var: fetchedEndpoint.api_key_env_var ?? '', 
      // created_at: fetchedEndpoint.created_at ?? new Date().toISOString(), 
      // owner_id: fetchedEndpoint.owner_id ?? '', 
      // updated_at: fetchedEndpoint.updated_at ?? new Date().toISOString(), 
    };

    aiApiCall = await callAiEndpoint(
      endpointForHelper, 
      fetchedEndpoint.api_key || "", // Pass the direct key (or empty if missing and allowed)
      effectiveModelId, // Pass potentially cleaned model ID
      messagesForApi,  
      true             
    );
    endpointNameForLogging = `${modelId} via ${fetchedEndpoint.name}`;
    
    // --- Common Response Handling --- 
    if (!aiApiCall.ok) {
      const errorText = await aiApiCall.text();
      console.error(`[API /generate/text] AI service error (${aiApiCall.status}) for endpoint ${endpointNameForLogging}:`, errorText);
      let errorDetail = errorText;
      try {
        const jsonError = JSON.parse(errorText);
        errorDetail = jsonError.error?.message || jsonError.message || errorText;
      } catch (parseError) { /* Ignore */ }
      return NextResponse.json({ error: `AI service request failed: ${errorDetail}` }, { status: aiApiCall.status });
    }

    const finalResponseStream = aiApiCall.body;
    if (!finalResponseStream) {
      console.error(`[API /generate/text] AI service response body is null for endpoint ${endpointNameForLogging}.`);
      return NextResponse.json({ error: 'AI service returned an empty response.' }, { status: 500 });
    }

    console.log(`[API /generate/text] Streaming final response back to frontend (endpoint: ${endpointNameForLogging})...`);
    const passthroughStream = new ReadableStream({
      async start(controller) {
        if (!finalResponseStream) {
          console.error('Backend API Route: finalResponseStream is null before reading');
          controller.error(new Error('AI service returned null stream.'));
          return;
        }
        const reader = finalResponseStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log('Backend API Route: Source stream finished.');
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          console.error(`Backend API Route: Error reading from AI service stream (endpoint: ${endpointNameForLogging}):`, error);
          controller.error(error); 
        }
      },
      cancel(reason) {
        console.log('Backend API Route: Client stream cancelled:', reason);
        // Attempt to cancel the underlying stream from the AI service
        if (finalResponseStream && typeof (finalResponseStream as any).cancel === 'function') {
            (finalResponseStream as any).cancel(reason);
        } else if (finalResponseStream && typeof finalResponseStream.cancel === 'function') {
            finalResponseStream.cancel(reason);
        }
      }
    });

    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });
    return new Response(passthroughStream, { status: 200, headers: headers });

  } catch (error: any) {
    console.error('[API /generate/text] Error processing request:', error);
    if (error instanceof SyntaxError) { 
      console.error("[API /generate/text] JSON Parsing Error.");
      // Attempt to log raw text if JSON fails
      try {
          const rawText = await request.text();
          console.error("Raw text causing parse error:", rawText);
      } catch (textErr) {
          console.error("Could not read raw text body after JSON parse error.");
      }
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    } else {
        // Log error for non-parsing issues
        console.error("Error occurred after parsing.");
    }
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}