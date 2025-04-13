-- Create workspace_members table
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(workspace_id, user_id)
);

-- Enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their workspace memberships"
    ON public.workspace_members
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Workspace owners can manage members"
    ON public.workspace_members
    FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM public.workspaces
            WHERE owner_id = auth.uid()
        )
    );

-- Create updated_at trigger
CREATE TRIGGER handle_workspace_members_updated_at
    BEFORE UPDATE ON public.workspace_members
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 