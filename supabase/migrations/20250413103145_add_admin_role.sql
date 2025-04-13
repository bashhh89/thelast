-- Add is_admin column to profiles table
alter table public.profiles
add column is_admin boolean default false not null;

-- Optional: RLS policy adjustment if needed (current policies might suffice initially)
-- Example: Allow admins to see all profiles (use with caution!)
-- create policy "Admins can view all profiles." on public.profiles for select
--  using ( (select is_admin from public.profiles where id = auth.uid()) = true );

-- Example: Allow admins to update any profile (use with caution!)
-- create policy "Admins can update any profile." on public.profiles for update
--  using ( (select is_admin from public.profiles where id = auth.uid()) = true );
