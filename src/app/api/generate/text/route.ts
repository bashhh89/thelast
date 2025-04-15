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
  apiKey: string,
  modelId: string, 
  messages: Array<{ role: string; content: string }>,
  stream: boolean = true
): Promise<Response> {
  console.log(`[callAiEndpoint] Preparing request for endpoint type: ${endpoint.type}, modelId: ${modelId}`);

  let fetchUrl: string;
  let requestBody: Record<string, any>;
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': stream ? 'text/event-stream' : 'application/json',
  };

  // Google-specific logic
  if (endpoint.type === 'google') {
    if (!apiKey) throw new Error('API key required for Google endpoint');
    
    // Clean model ID (remove prefix/suffix)
    let cleanedModelId = modelId.startsWith('models/') ? modelId.substring(7) : modelId;
    cleanedModelId = cleanedModelId.replace(/\s+model$/i, '').trim();
    
    console.log(`[callAiEndpoint] Original Google modelId: '${modelId}', Cleaned: '${cleanedModelId}'`);
    fetchUrl = `https://generativelanguage.googleapis.com/v1beta/models/${cleanedModelId}:${stream ? 'streamGenerateContent' : 'generateContent'}?key=${apiKey}`;
    
    // Filter and map messages
    const googleMessages = messages
      .filter(msg => msg.content && msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role === 'system' ? 'user' : msg.role,
        parts: [{ text: msg.content.trim() }]
      }));

    if (googleMessages.length === 0) {
      throw new Error("No valid message content for Google API");
    }
    
    requestBody = { contents: googleMessages };
  } 
  // Pollinations-specific logic
  else if (endpoint.type === 'pollinations') {
    fetchUrl = 'https://text.pollinations.ai/openai'; 
    requestBody = {
      model: modelId,
      messages: messages,
      stream: stream,
      referrer: 'QanduApp'
    };
  } 
  // Other providers (OpenAI-compatible)
  else {
    if (!endpoint.base_url) {
      throw new Error(`Endpoint '${endpoint.name}' missing Base URL`);
    }
    fetchUrl = `${endpoint.base_url.replace(/\/$/, '')}/chat/completions`; 
    requestBody = {
      model: modelId,
      messages: messages,
      stream: stream,
    };
    
    if (apiKey) {
        if (endpoint.type === 'anthropic') {
            headers['x-api-key'] = apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else {
            headers['Authorization'] = `Bearer ${apiKey}`;
        }
    } else if (endpoint.type !== 'custom') {
        throw new Error(`API key missing for endpoint '${endpoint.name}'`);
    }
  }

  console.log(`[callAiEndpoint] Sending request to: ${fetchUrl}`);
  return fetch(fetchUrl, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(requestBody),
  });
}

// Direct Google Stream Converter - transforms Google chunks to SSE format
function convertGoogleStreamToSSE(originalStream: ReadableStream): ReadableStream {
  return new ReadableStream({
    start(controller) {
      // Get a reader for the original stream
      const reader = originalStream.getReader();
      
      // Track accumulated content between chunks
      let buffer = "";
      let fullJsonString = "";
      
      // Process the stream chunks
      async function processStream() {
        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Parse the accumulated JSON if there's anything left
              if (fullJsonString.length > 0) {
                try {
                  // Try to parse the complete JSON string
                  const json = JSON.parse(fullJsonString);
                  
                  // Extract all text content from candidates
                  if (json && Array.isArray(json)) {
                    for (const item of json) {
                      if (item.candidates && Array.isArray(item.candidates)) {
                        for (const candidate of item.candidates) {
                          if (candidate.content && candidate.content.parts) {
                            for (const part of candidate.content.parts) {
                              if (part.text) {
                                // Send actual text content
                                controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(part.text)}\n\n`));
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                } catch (e) {
                  console.error("[Google Stream Converter] Failed to parse complete JSON:", e);
                }
              }
              
              // Send final DONE message and close
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }
            
            // Decode the chunk as text
            const text = new TextDecoder().decode(value);
            console.log(`[Google Stream Converter] Raw chunk: '${text.substring(0, 20)}${text.length > 20 ? '...' : ''}'`);
            
            // Accumulate the complete JSON string
            fullJsonString += text;
            
            // Also accumulate in buffer for potential extraction
            buffer += text;
            
            // Try to extract completed objects from the buffer
            try {
              // See if we have complete JSON objects or text fragments to extract
              if (buffer.includes('"text": "') && buffer.includes('"}')) {
                // Extract text content between "text": " and "}
                const matches = buffer.match(/"text": "([^"]+)"/g);
                if (matches) {
                  for (const match of matches) {
                    // Extract the actual text content
                    const textContent = match.substring(9, match.length - 1);
                    console.log(`[Google Stream Converter] Extracted text: '${textContent}'`);
                    
                    // Send the text content as an SSE event
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(textContent)}\n\n`));
                  }
                  
                  // Clear the processed content from buffer
                  const lastTextEnd = buffer.lastIndexOf('"}');
                  if (lastTextEnd > 0) {
                    buffer = buffer.substring(lastTextEnd + 2);
                  }
                }
              }
            } catch (error) {
              console.error("[Google Stream Converter] Error processing buffer:", error);
            }
          }
        } catch (error) {
          console.error("[Google Stream Converter] Error:", error);
          controller.error(error);
        }
      }
      
      // Start processing the stream
      processStream();
    }
  });
}

// Main API Handler
export async function POST(request: Request) {
  console.log("[API] Received text generation request");
  
  try {
    // Parse request body
    const requestData = await request.json();
    
    // Validate request
    const validation = frontendRequestSchema.safeParse(requestData);
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 });
    }
    
    const { prompt, endpointId, modelId, systemPrompt, chatHistory } = validation.data;
    
    // Prepare messages for AI
    let messagesForApi: Array<{ role: string; content: string }> = [];
    if (systemPrompt?.trim()) {
      messagesForApi.push({ role: 'system', content: systemPrompt });
    }
    
    if (chatHistory?.length) {
      messagesForApi = messagesForApi.concat(
        chatHistory.filter(msg => ['user', 'assistant'].includes(msg.role))
      );
    }
    
    messagesForApi.push({ role: 'user', content: prompt });
    
    // Get endpoint configuration
    const { data: endpoint, error: endpointError } = await supabaseAdmin
      .from('ai_endpoints')
      .select('*')
      .eq('id', endpointId)
      .single();
      
    if (endpointError || !endpoint) {
      console.error("Endpoint fetch error:", endpointError);
      return NextResponse.json({ 
        error: `Could not find endpoint: ${endpointError?.message || 'Unknown'}` 
      }, { status: 404 });
    }
    
    if (!endpoint.enabled) {
      return NextResponse.json({ 
        error: `Endpoint '${endpoint.name}' is disabled` 
      }, { status: 403 });
    }
    
    // Make API call
    const aiResponse = await callAiEndpoint(
      endpoint,
      endpoint.api_key || "",
      modelId,
      messagesForApi,
      true // Always stream
    );
    
    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      return NextResponse.json({ 
        error: `AI provider error: ${errorText}` 
      }, { status: aiResponse.status });
    }
    
    if (!aiResponse.body) {
      return NextResponse.json({ 
        error: 'AI provider returned empty response' 
      }, { status: 500 });
    }
    
    // Process response based on endpoint type
    let responseStream: ReadableStream;
    
    if (endpoint.type === 'google') {
      // For Google, convert chunks to SSE format
      responseStream = convertGoogleStreamToSSE(aiResponse.body);
    } else {
      // For others, pass through directly
      responseStream = aiResponse.body;
    }
    
    // Return streaming response
    return new Response(responseStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });
    
  } catch (error: any) {
    console.error("API error:", error);
    return NextResponse.json({ 
      error: error.message || 'Unknown error' 
    }, { status: 500 });
  }
}