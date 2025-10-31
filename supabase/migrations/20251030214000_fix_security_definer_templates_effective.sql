-- Fix SECURITY DEFINER view issue for templates_effective
-- This view was using SECURITY DEFINER which bypasses RLS policies
-- Changed to SECURITY INVOKER (default) for proper security

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.templates_effective;

CREATE OR REPLACE VIEW public.templates_effective
SECURITY INVOKER AS
SELECT t.*
FROM public.templates t
WHERE t.scope = 'global'
UNION ALL
SELECT t.*
FROM public.templates t
WHERE t.scope = 'user'
AND t.owner_id = auth.uid();

-- Add comment explaining the security choice
COMMENT ON VIEW public.templates_effective IS 'Templates view with SECURITY INVOKER - respects user permissions and RLS policies';
