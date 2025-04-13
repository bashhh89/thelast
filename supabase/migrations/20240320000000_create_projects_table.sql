-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
-- ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY; -- Temporarily Disabled for debugging
ALTER TABLE public.projects DISABLE ROW LEVEL SECURITY; -- Temporarily Disable RLS

-- Create policies
-- CREATE POLICY "Users can view projects in their workspaces"
--     ON public.projects
--     FOR SELECT
--     USING (
--         workspace_id IN (
--             SELECT id FROM public.workspaces
--             WHERE id IN (
--                 SELECT workspace_id FROM public.workspace_members
--                 WHERE user_id = auth.uid()
--             )
--         )
--     );
--
-- CREATE POLICY "Users can create projects in their workspaces"
--     ON public.projects
--     FOR INSERT
--     WITH CHECK (
--         workspace_id IN (
--             SELECT id FROM public.workspaces
--             WHERE id IN (
--                 SELECT workspace_id FROM public.workspace_members
--                 WHERE user_id = auth.uid()
--             )
--         )
--     );
--
-- CREATE POLICY "Users can update projects in their workspaces"
--     ON public.projects
--     FOR UPDATE
--     USING (
--         workspace_id IN (
--             SELECT id FROM public.workspaces
--             WHERE id IN (
--                 SELECT workspace_id FROM public.workspace_members
--                 WHERE user_id = auth.uid()
--             )
--         )
--     )
--     WITH CHECK (
--         workspace_id IN (
--             SELECT id FROM public.workspaces
--             WHERE id IN (
--                 SELECT workspace_id FROM public.workspace_members
--                 WHERE user_id = auth.uid()
--             )
--         )
--     );
--
-- CREATE POLICY "Users can delete projects in their workspaces"
--     ON public.projects
--     FOR DELETE
--     USING (
--         workspace_id IN (
--             SELECT id FROM public.workspaces
--             WHERE id IN (
--                 SELECT workspace_id FROM public.workspace_members
--                 WHERE user_id = auth.uid()
--             )
--         )
--     );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 