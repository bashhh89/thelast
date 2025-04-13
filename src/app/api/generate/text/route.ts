import { NextResponse } from 'next/server';
import { z } from 'zod';

// TODO: Securely manage API keys if needed for the actual service
// const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY;

const textGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.'),
  modelId: z.string().min(1, 'Model ID must be provided.'),
  // Add other parameters like history, settings etc. later
});

export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = textGenerationSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, modelId } = validation.data;

    console.log(`API Route: Received request for model ${modelId} with prompt: "${prompt.substring(0, 50)}..."`);

    // --- Temporarily Reverted to Placeholder AI Call for Stability --- 
    // The actual call to Pollinations was failing due to receiving non-JSON responses.
    // This placeholder ensures the chat remains functional while the external API issue is investigated.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate short delay
    const aiResponse = `Placeholder response (temp): Model '${modelId}' received: "${prompt.substring(0, 30)}..."`;
    // --- End Placeholder ---

    /* --- Previous Actual AI Call (Commented Out) ---
    const pollinationsUrl = `https://pollinations.ai/prompt/${encodeURIComponent(modelId)}`;
    let aiResponse: string;
    try {
      const aiApiCall = await fetch(pollinationsUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt }),
      });
      if (!aiApiCall.ok) {
        const errorText = await aiApiCall.text(); // Log the actual text received
        console.error(`Pollinations API error (${aiApiCall.status}): Response Body:`, errorText);
        throw new Error(`AI service request failed with status ${aiApiCall.status}`);
      }
      const result = await aiApiCall.json(); 
      aiResponse = result?.output?.text || result?.text || JSON.stringify(result);
    } catch (aiError: any) {
        console.error("Error calling AI service:", aiError);
        return NextResponse.json({ error: `Failed to get response from AI service: ${aiError.message}` }, { status: 502 });
    }
    --- End Actual AI Call --- */

    return NextResponse.json({ response: aiResponse });

  } catch (error: any) {
    console.error('Error in /api/generate/text:', error);
    // Avoid leaking internal error details to the client
    let errorMessage = 'Internal Server Error';
    if (error instanceof SyntaxError) { // JSON parsing error
      errorMessage = 'Invalid JSON payload';
    }
    // TODO: Add more specific error handling (e.g., AI service unavailable)
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler if needed for CORS
// export async function OPTIONS(request: Request) {
//   // Handle CORS preflight requests
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*', // Adjust as needed
//       'Access-Control-Allow-Methods': 'POST, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     },
//   });
// } 