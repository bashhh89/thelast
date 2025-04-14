import { NextResponse } from 'next/server';

const PROVIDER_CONFIGS = {
  anthropic: {
    headers: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    modelsUrl: 'https://api.anthropic.com/v1/models'
  },
  google: {
    headers: () => ({ 'Content-Type': 'application/json' }),
    modelsUrl: (apiKey: string) => `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
  },
  groq: {
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    modelsUrl: 'https://api.groq.com/v1/models'
  },
  openai: {
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    modelsUrl: 'https://api.openai.com/v1/models'
  },
  mistral: {
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    modelsUrl: 'https://api.mistral.ai/v1/models'
  },
  custom: {
    headers: (apiKey: string) => ({ 'Authorization': `Bearer ${apiKey}` }),
    modelsUrl: (baseUrl: string) => `${baseUrl}/models`
  }
};

// Helper function to extract model IDs from various API response formats
function extractModelIds(data: any): string[] {
  if (Array.isArray(data?.data)) {
    // OpenAI, Groq, OpenRouter, etc. (often use `data` array)
    return data.data.map((m: any) => m.id).filter(Boolean);
  } else if (Array.isArray(data?.models)) {
    // Google, Mistral (use `models` array)
    // Google uses 'name' like 'models/gemini-pro', Mistral uses 'id'
    return data.models.map((m: any) => m.id || m.name).filter(Boolean);
  } else if (Array.isArray(data)) {
      // Handle cases where the root response is the array (less common)
      return data.map((m:any) => m.id).filter(Boolean);
  }
  // Add more specific handlers if needed for other providers
  console.warn("Could not find standard 'data' or 'models' array in response:", data);
  return []; // Return empty array if format is unexpected
}

export async function POST(request: Request) {
  try {
    const { provider, api_key, base_url } = await request.json();

    // Basic validation
    if (!provider || !api_key) {
      return NextResponse.json({ error: 'Provider and API Key are required.' }, { status: 400 });
    }
    if (provider === 'custom' && !base_url) {
        return NextResponse.json({ error: 'Base URL is required for custom providers.' }, { status: 400 });
    }

    // Determine the correct configuration and URL
    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS] || PROVIDER_CONFIGS.custom;
    let modelsUrl = '';
    if (typeof config.modelsUrl === 'function') {
        modelsUrl = provider === 'google'
            ? config.modelsUrl(api_key) // Google needs API key in URL
            : config.modelsUrl(base_url || ''); // Custom needs base_url
    } else {
        modelsUrl = config.modelsUrl;
    }

    if (!modelsUrl) {
         return NextResponse.json({ error: 'Could not determine models URL.' }, { status: 400 });
    }

    console.log(`Testing connection to: ${modelsUrl}`);

    // Make the API call to the provider
    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: config.headers(api_key),
      // Add timeout? Consider request cancellation on client disconnect?
    });

    const responseBodyText = await response.text(); // Read body once

    if (!response.ok) {
        console.error(`Provider API error (${response.status}): ${responseBodyText}`);
        let errorDetails = `Provider API returned status ${response.status}`;
        try {
           const errorJson = JSON.parse(responseBodyText);
           // Try to extract a meaningful error message
           errorDetails = errorJson?.error?.message || errorJson?.error || errorJson?.message || errorDetails;
        } catch (parseError) {
           // Use raw text if not JSON
           errorDetails = responseBodyText || errorDetails;
        }
        return NextResponse.json({ error: 'Failed to connect to provider API', details: errorDetails }, { status: response.status });
    }

    // Parse the successful response
    let data;
    try {
        data = JSON.parse(responseBodyText);
    } catch (e) {
        console.error("Failed to parse successful response as JSON:", responseBodyText);
        return NextResponse.json({ error: 'Received invalid JSON response from provider.' , details: responseBodyText }, { status: 500 });
    }

    // Extract model IDs using the helper function
    const modelIds = extractModelIds(data);

    console.log(`Successfully connected. Found ${modelIds.length} models.`);

    if (modelIds.length === 0) {
         console.warn("Provider connection successful, but no models extracted. Response data:", data);
         // Return success but indicate no models found
         return NextResponse.json({ 
             success: true, 
             message: 'Successfully connected, but no models found or extracted.', 
             models: [] // Return empty array
         });
    }

    // Return the actual model IDs in the correct format
    return NextResponse.json({
      success: true,
      message: `Successfully connected and found ${modelIds.length} models.`, // More informative message
      models: modelIds // Return the array of model ID strings
    });

  } catch (error: any) {
    console.error('Internal server error in /api/admin/endpoints/test:', error);
    return NextResponse.json({
      error: 'Internal server error while testing endpoint',
      details: error.message
    }, { status: 500 });
  }
} 