-- Disable row level security on messages table
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- Grant access to messages table for all users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated;

-- Update the sequence for messages id
GRANT USAGE, SELECT ON SEQUENCE messages_id_seq TO anon, authenticated; 