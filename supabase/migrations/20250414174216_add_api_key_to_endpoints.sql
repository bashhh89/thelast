-- Add api_key column to ai_endpoints table
ALTER TABLE ai_endpoints ADD COLUMN IF NOT EXISTS api_key TEXT NOT NULL;

-- Add RLS policy to protect api_keys
ALTER TABLE ai_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own endpoints' api_keys"
    ON ai_endpoints
    FOR ALL
    USING (auth.uid() = owner_id);

