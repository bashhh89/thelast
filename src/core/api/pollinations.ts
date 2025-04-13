// Define a simple APIError class
class APIError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.data = data;
  }
}

// Remove direct Pollinations URL
// const POLLINATIONS_API_URL = 'https://pollinations.ai'; 

// --- Configuration ---

// API key MUST be available client-side, so use NEXT_PUBLIC_
const POLLINATIONS_API_KEY = process.env.NEXT_PUBLIC_POLLINATIONS_API_KEY;
// Define separate base URLs for different services if needed
const POLLINATIONS_TEXT_BASE_URL = 'https://text.pollinations.ai';
const POLLINATIONS_IMAGE_BASE_URL = 'https://image.pollinations.ai'; // Keep for image function
const POLLINATIONS_AUDIO_BASE_URL = 'https://audio.pollinations.ai'; // Assuming an audio base URL

if (!POLLINATIONS_API_KEY) {
    console.warn("Pollinations API Key not found. Please set NEXT_PUBLIC_POLLINATIONS_API_KEY in your .env.local file.");
}

// --- Helper Function for API Calls ---

async function callPollinationsAPI<T = any>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: Record<string, any> | null,
    baseUrl?: string,
    expectStream: boolean = false
): Promise<T | ReadableStream<Uint8Array>> {
    const resolvedBaseUrl = baseUrl || (endpoint.includes('/tts') ? POLLINATIONS_AUDIO_BASE_URL : endpoint.startsWith('/prompt') ? POLLINATIONS_IMAGE_BASE_URL : POLLINATIONS_TEXT_BASE_URL);
    const url = endpoint.startsWith('http') ? endpoint : `${resolvedBaseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

    try {
        console.log(`Calling Pollinations: ${method} ${url}`);
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : null,
            signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            let errorData: any;
            try {
                errorData = await response.json();
            } catch {
                errorData = await response.text();
            }
            console.error("Pollinations API Error Response:", response.status, errorData);
            throw new APIError(
                response.status,
                errorData?.message || errorData?.error || `Pollinations API request failed: ${response.statusText}`,
                errorData
            );
        }

        if (expectStream) {
            if (!response.body) {
                throw new APIError(500, "Response body is null for stream request.");
            }
            // Create a new ReadableStream to handle the response
            const reader = response.body.getReader();
            return new ReadableStream({
                async start(controller) {
                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) {
                                controller.close();
                                break;
                            }
                            controller.enqueue(value);
                        }
                    } catch (error) {
                        controller.error(error);
                    }
                },
                cancel() {
                    reader.cancel();
                }
            });
        } else {
            const contentType = response.headers.get('content-type');
            if (contentType?.includes('application/json')) {
                return await response.json() as T;
            } else if (contentType?.includes('image/') || contentType?.includes('audio/')) {
                return await response.blob() as T;
            } else {
                return await response.text() as T;
            }
        }

    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof APIError) {
            throw error;
        } else if (error instanceof Error && error.name === 'AbortError') {
            throw new APIError(408, 'Pollinations API request timed out.');
        } else {
            console.error("Unexpected error calling Pollinations API:", error);
            throw new APIError(500, 'An unexpected error occurred while contacting Pollinations.', error);
        }
    }
}

// --- API Functions ---

/**
 * Generates text using Pollinations via the OpenAI Compatible Endpoint, supporting streaming.
 */
export async function generateTextPollinations(
    currentPrompt: string,
    model: string, 
    chatHistory: Array<{ role: string; content: string }>,
    userName: string | null,
    stream: boolean = false,
    parameters: Record<string, any> = {},
    isWebSearchEnabled: boolean = false
): Promise<ReadableStream | string> {
    if (!model) {
        throw new APIError(400, "Model ID is required for text generation.");
    }

    // --- Special handling for searchgpt model --- 
    if (model === 'searchgpt') {
        console.log(`Generating text via special GET endpoint for searchgpt (Query: ${currentPrompt})`);
        const endpointUrl = `/${encodeURIComponent(currentPrompt)}?model=searchgpt`;
        // Assume searchgpt always streams plain text
        const response = await callPollinationsAPI<any>(
            endpointUrl,
            'GET',
            null,
            POLLINATIONS_TEXT_BASE_URL,
            true // Expect a stream
        );
        if (!response || !(response instanceof ReadableStream)) {
            throw new APIError(500, "Invalid stream response from searchgpt endpoint.");
        }
        return response;
    }
    // --- End special handling for searchgpt --- 
    
    // --- Standard OpenAI endpoint logic for other models --- 
    // Use the original logging and include web_search_enabled based on flag
    console.log(`Generating text via standard POST /openai endpoint (Model: ${model}, Stream: ${stream}, WebSearch: ${isWebSearchEnabled}) with history for user: ${userName || 'Unknown'}`);
    
    const messages: Array<{ role: string; content: string }> = [];

    if (userName) {
        messages.push({ role: "system", content: `You are chatting with ${userName}. Respond cordially.` });
    }

    chatHistory.forEach(msg => {
        if (msg.role === 'user' || msg.role === 'assistant') { 
            messages.push({ role: msg.role, content: msg.content });
        }
    });

    messages.push({ role: "user", content: currentPrompt });

    const requestBody = {
        model: model,
        messages: messages,
        stream: stream,
        ...parameters,
        // Conditionally add web_search_enabled (original simple logic)
        ...(isWebSearchEnabled && { web_search_enabled: true })
    };

    console.log("API Request Body:", JSON.stringify(requestBody));

    const response = await callPollinationsAPI<any>(
        `/openai`,
        'POST',
        requestBody,
        POLLINATIONS_TEXT_BASE_URL,
        stream
    );

    // Original return logic for standard models
    if (stream) {
        if (!response || !(response instanceof ReadableStream)) {
            throw new APIError(500, "Invalid stream response from Pollinations API.");
        }
        return response;
    } else {
        const textResponse = response?.choices?.[0]?.message?.content;
        if (typeof textResponse !== 'string') {
            console.error("Could not parse text from Pollinations response:", response);
            throw new APIError(500, "Failed to parse response from Pollinations API.");
        }
        return textResponse.trim();
    }
}

/**
 * Generates an image using Pollinations.
 */
export async function generateImagePollinations(
    prompt: string,
    model: string = 'stable-diffusion',
    parameters: Record<string, any> = { width: 512, height: 512 }
): Promise<Blob> {
    console.log(`Generating image with Pollinations (Model: ${model}) for prompt: "${prompt.substring(0, 50)}..."`);
    const endpoint = `/prompt/${encodeURIComponent(prompt)}?model=${model}&width=${parameters.width}&height=${parameters.height}`;
    const response = await callPollinationsAPI<Blob>(
        endpoint,
        'POST',
        null,
        POLLINATIONS_IMAGE_BASE_URL,
        false
    );
    return response as Blob;
}

export async function generateAudioPollinations(
    text: string,
    voice: string = 'default',
    parameters: Record<string, any> = {}
): Promise<Blob> {
    console.log(`Generating audio with Pollinations for text: "${text.substring(0, 50)}..."`);
    const response = await callPollinationsAPI<Blob>(
        '/tts',
        'POST',
        {
            text: text,
            voice: voice,
            ...parameters,
        },
        POLLINATIONS_AUDIO_BASE_URL,
        false
    );
    return response as Blob;
}

// ... generateAudioPollinations (using appropriate base URL if different) ... 