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
    modelsUrl: (apiKey: string) => `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
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

export async function POST(request: Request) {
  try {
    const { provider, api_key, base_url } = await request.json();

    if (!provider || !api_key) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const config = PROVIDER_CONFIGS[provider as keyof typeof PROVIDER_CONFIGS] || PROVIDER_CONFIGS.custom;
    const modelsUrl = typeof config.modelsUrl === 'function' 
      ? config.modelsUrl(provider === 'google' ? api_key : base_url)
      : config.modelsUrl;

    console.log(`Testing connection to ${modelsUrl}`);

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: config.headers(api_key)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Provider API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });

      return NextResponse.json({
        error: 'Failed to connect to provider API',
        details: {
          status: response.status,
          message: errorData.error?.message || response.statusText
        }
      }, { status: response.status });
    }

    const data = await response.json();
    console.log('Successfully connected to provider API');

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to provider API',
      models: Array.isArray(data.models) ? data.models.length : 'unknown'
    });

  } catch (error: any) {
    console.error('Error testing endpoint:', error);
    return NextResponse.json({
      error: 'Failed to test endpoint',
      details: error.message
    }, { status: 500 });
  }
} 