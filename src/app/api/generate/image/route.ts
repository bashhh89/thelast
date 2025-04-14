import { NextResponse } from 'next/server';
import { z } from 'zod';

// Input validation schema
const imageGenerationSchema = z.object({
  prompt: z.string().min(1, 'Prompt cannot be empty.'),
  model: z.string().optional(),
  seed: z.number().int().positive().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  nologo: z.boolean().optional(),
  private: z.boolean().optional(),
  enhance: z.boolean().optional(),
  safe: z.boolean().optional(),
});

// Using GET as the external API uses GET, though our internal route could be POST
// Sticking to POST for consistency with the text generation route
export async function POST(request: Request) {
  try {
    const rawBody = await request.json();
    const validation = imageGenerationSchema.safeParse(rawBody);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { prompt, ...params } = validation.data;

    console.log(`API Route: Generating image URL for prompt: \"${prompt.substring(0, 50)}...\"`);

    // Construct the target Pollinations API URL
    const pollinationsBaseUrl = 'https://image.pollinations.ai/prompt/';
    const encodedPrompt = encodeURIComponent(prompt);
    const url = new URL(`${pollinationsBaseUrl}${encodedPrompt}`);

    // Add optional parameters from the request body
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });

    // Add referrer
    url.searchParams.append('referrer', 'QanduApp');

    const finalUrl = url.toString();
    console.log(`API Route: Constructed Pollinations URL: ${finalUrl}`);

    // Return the constructed URL
    return NextResponse.json({ imageUrl: finalUrl });

  } catch (error: any) {
    console.error('Error in /api/generate/image:', error);
    let errorMessage = 'Internal Server Error';
    if (error instanceof SyntaxError) { // JSON parsing error
      errorMessage = 'Invalid request JSON payload';
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Optional: Add OPTIONS handler if needed for CORS
// export async function OPTIONS(request: Request) { ... } 