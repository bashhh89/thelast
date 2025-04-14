import { NextResponse } from 'next/server';

async function fetchGoogleModels(baseUrl: string, apiKey: string) {
  // Ensure we use v1beta, overriding any potentially passed v1 baseUrl
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=100`;
  console.log(`Requesting Google models from: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('Google API error:', data.error);
      throw new Error(`Failed to fetch Google models: ${errorMessage}`);
    }

    if (!Array.isArray(data.models)) {
      console.error('Invalid Google API response format:', data);
      throw new Error('Invalid response format from Google API');
    }

    console.log(`Successfully fetched ${data.models.length} Google models`);
    
    return data.models.map((model: any) => ({
      id: model.name.split('/').pop(),
      name: model.displayName || model.name.split('/').pop()
    }));
  } catch (error: any) {
    console.error('Error in fetchGoogleModels:', error);
    throw error;
  }
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error('OpenAI API error:', data.error);
    throw new Error(`Failed to fetch OpenAI models: ${errorMessage}`);
  }

  return data.data?.map((model: any) => ({
    id: model.id,
    name: model.id
  })) || [];
}

async function fetchAnthropicModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Anthropic API error:', data.error);
    throw new Error(`Failed to fetch Anthropic models: ${errorMessage}`);
  }

  return data.models?.map((model: any) => ({
    id: model.id,
    name: model.name || model.id
  })) || [];
}

async function fetchMistralModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Mistral API error:', data.error);
    throw new Error(`Failed to fetch Mistral models: ${errorMessage}`);
  }

  return data.data?.map((model: any) => ({
    id: model.id,
    name: model.name || model.id
  })) || [];
}

async function fetchGroqModels(baseUrl: string, apiKey: string) {
  const response = await fetch(`${baseUrl}/models`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }
  });
  const data = await response.json();

  if (!response.ok) {
    const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    console.error('Groq API error:', data.error);
    throw new Error(`Failed to fetch Groq models: ${errorMessage}`);
  }

  return data.models?.map((model: any) => ({
    id: model.id,
    name: model.name || model.id
  })) || [];
}

async function fetchCustomModels(baseUrl: string, apiKey: string) {
  // Try OpenAI format first
  try {
    return await fetchOpenAIModels(baseUrl, apiKey);
  } catch (error) {
    console.log('OpenAI format failed, trying generic format...');
    
    // Try generic format
    const response = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    });
    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('Custom API error:', data.error);
      throw new Error(`Failed to fetch models: ${errorMessage}`);
    }

    // Try to parse response in a flexible way
    const modelList = data.models || data.data || [];
    if (!Array.isArray(modelList)) {
      throw new Error('Invalid response format: expected array of models');
    }

    return modelList.map((model: any) => ({
      id: model.id || model.name || String(model),
      name: model.name || model.id || String(model)
    }));
  }
}

export async function POST(req: Request) {
  try {
    const { provider, apiKey, baseUrl } = await req.json();

    if (!provider || !apiKey || !baseUrl) {
      return NextResponse.json({ 
        error: 'Missing required fields: provider, apiKey, and baseUrl are required' 
      }, { status: 400 });
    }

    console.log(`Fetching models from ${provider} at ${baseUrl}...`);

    let models;
    try {
      switch (provider) {
        case 'google':
          models = await fetchGoogleModels(baseUrl, apiKey);
          break;
        case 'openai':
          models = await fetchOpenAIModels(baseUrl, apiKey);
          break;
        case 'anthropic':
          models = await fetchAnthropicModels(baseUrl, apiKey);
          break;
        case 'mistral':
          models = await fetchMistralModels(baseUrl, apiKey);
          break;
        case 'groq':
          models = await fetchGroqModels(baseUrl, apiKey);
          break;
        default:
          models = await fetchCustomModels(baseUrl, apiKey);
      }

      // Validate models structure
      if (!Array.isArray(models)) {
        throw new Error(`Invalid models format returned from ${provider} provider`);
      }
      
      // Ensure each model has id and name
      models = models.map(model => ({
        id: model.id || 'unknown',
        name: model.name || model.id || 'Unknown Model'
      }));

      console.log(`Successfully fetched ${models.length} models from ${provider}`);
      return NextResponse.json({ models });
      
    } catch (error: any) {
      console.error(`Error fetching models from ${provider}:`, error);
      return NextResponse.json({ 
        error: error.message,
        provider,
        baseUrl
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Server error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
} 