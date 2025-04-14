import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const audioGenerationSchema = z.object({
  text: z.string().min(1, 'Text cannot be empty.'),
  model: z.string().optional().default('openai-tts-1'), // Default TTS model (check APIDOCS)
  voice: z.string().optional().default('nova'), // Default voice (check APIDOCS)
});

export async function POST(request: Request) {
  try {
    // 1. Validate Input
    const rawBody = await request.json();
    const validation = audioGenerationSchema.safeParse(rawBody);

    if (!validation.success) {
      console.error("Invalid request body:", validation.error.flatten());
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { text, model, voice } = validation.data;

    console.log(`API Route /generate/audio: Generating audio for text: \"${text.substring(0, 50)}...\" using model ${model} and voice ${voice}`);

    // 2. Call Pollinations API
    const pollinationsUrl = 'https://text.pollinations.ai/openai';
    const requestBody = {
      model: model,
      messages: [ // Use messages structure even for TTS via OpenAI endpoint
        { role: 'user', content: text }
      ],
      voice: voice,
      private: false, // Example, make configurable if needed
      referrer: 'QanduApp'
    };

    const aiApiCall = await fetch(pollinationsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      // Consider adding a timeout signal here
    });

    // Log the raw response status and headers from Pollinations
    console.log(`API Route /generate/audio: Pollinations response status: ${aiApiCall.status}`);
    console.log(`API Route /generate/audio: Pollinations response Content-Type: ${aiApiCall.headers.get('Content-Type')}`);

    // 3. Handle Pollinations API Error Response
    if (!aiApiCall.ok) {
      let errorDetail = `Pollinations API failed with status ${aiApiCall.status}`;
      try {
        const errorText = await aiApiCall.text();
        console.error(`Pollinations TTS API error (${aiApiCall.status}):`, errorText);
        const jsonError = JSON.parse(errorText);
        errorDetail = jsonError?.error?.message || errorText;
      } catch (parseError) {
         console.error("Failed to parse Pollinations error response:", parseError);
         // Use the status text if parsing fails
         errorDetail = aiApiCall.statusText || errorDetail;
      }
      // Return JSON error to our frontend
      return NextResponse.json({ error: `AI service request failed: ${errorDetail}` }, { status: aiApiCall.status });
    }

    // 4. Handle Successful Response (Audio Blob)
    const audioBlob = await aiApiCall.blob();

    if (!audioBlob || audioBlob.size === 0) {
        console.error("Pollinations TTS API returned empty blob.");
        return NextResponse.json({ error: 'AI service returned empty audio data.' }, { status: 500 });
    }

    // --- DEBUGGING --- Log Blob type received from Pollinations
    // console.log(`API Route /generate/audio: Received audio blob, size: ${audioBlob.size}, type: ${audioBlob.type}`);
    // --- END DEBUGGING ---

    // Return the audio blob directly with correct Content-Type
    const headers = new Headers();
    // Get Content-Type from Pollinations response, default if missing/invalid
    let returnedContentType = aiApiCall.headers.get('Content-Type');
    if (!returnedContentType || !returnedContentType.startsWith('audio/')) {
        console.warn(`API Route /generate/audio: Received invalid/missing Content-Type from Pollinations ('${returnedContentType}'), defaulting to audio/mpeg`);
        returnedContentType = 'audio/mpeg'; // Default if needed
    }
    headers.set('Content-Type', returnedContentType);

    return new Response(audioBlob, {
      status: 200,
      headers: headers,
    });

  } catch (error: any) {
    // 5. Handle Internal Server Errors
    console.error('Internal error in /api/generate/audio:', error);
    let errorMessage = 'Internal Server Error';
     if (error instanceof SyntaxError) { // Error parsing the initial request from frontend
       errorMessage = 'Invalid request JSON payload';
       return NextResponse.json({ error: errorMessage }, { status: 400 });
     }
    // Return JSON error for other internal errors
    return NextResponse.json({ error: errorMessage, detail: error.message }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler if needed for CORS
// export async function OPTIONS(request: Request) { ... } 