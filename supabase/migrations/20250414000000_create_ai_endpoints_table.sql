-- Create the ai_endpoints table
CREATE TABLE public.ai_endpoints (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    type text NOT NULL, -- e.g., 'openai_compatible', 'pollinations', 'anthropic'
    base_url text NULL,
    api_key text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL
);

-- Add comments to the table and columns
COMMENT ON TABLE public.ai_endpoints IS 'Stores configuration for different AI model endpoints.';
COMMENT ON COLUMN public.ai_endpoints.name IS 'User-friendly name for the endpoint.';
COMMENT ON COLUMN public.ai_endpoints.type IS 'Type of the endpoint (e.g., openai_compatible, specific provider).';
COMMENT ON COLUMN public.ai_endpoints.base_url IS 'The base URL for OpenAI-compatible endpoints.';
COMMENT ON COLUMN public.ai_endpoints.api_key IS 'The API key for the endpoint.';
COMMENT ON COLUMN public.ai_endpoints.enabled IS 'Whether the endpoint is currently active.';
COMMENT ON COLUMN public.ai_endpoints.owner_id IS 'The user who created the endpoint.';

-- Enable Row Level Security (RLS)
ALTER TABLE public.ai_endpoints ENABLE ROW LEVEL SECURITY;

-- Apply the updated_at trigger
CREATE TRIGGER handle_ai_endpoints_updated_at BEFORE UPDATE ON public.ai_endpoints
  FOR EACH ROW EXECUTE PROCEDURE moddatetime (updated_at);

-- RLS Policies
-- Allow authenticated users to read all endpoints (we will refine this to admins later)
CREATE POLICY "Allow authenticated users to read endpoints" ON public.ai_endpoints
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow owners to manage their own endpoints
CREATE POLICY "Allow owners to manage their endpoints" ON public.ai_endpoints
    FOR ALL USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id); 