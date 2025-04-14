-- Disable row level security on messages table
alter table public.messages disable row level security;

-- Add anonymous access to the messages table
grant select, insert, update, delete on public.messages to anon, authenticated; 