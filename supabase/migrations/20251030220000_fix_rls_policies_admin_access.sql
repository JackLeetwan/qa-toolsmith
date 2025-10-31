-- Fix RLS policies to restore admin access
-- Previous migration removed admin access from RLS policies
-- This migration restores admin ability to view all entries and notes

-- =========================================
-- KB ENTRIES - FIX ADMIN ACCESS
-- =========================================
-- Drop the broken policy and recreate with admin access
DROP POLICY IF EXISTS "authenticated can view own or public KB entries" ON public.kb_entries;

CREATE POLICY "authenticated can view own, public, or all entries if admin"
  ON public.kb_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true OR is_admin(auth.uid()));

-- =========================================
-- KB NOTES - FIX ADMIN ACCESS
-- =========================================
-- Drop the broken policy and recreate with admin access
DROP POLICY IF EXISTS "authenticated can view notes for own or public KB entries" ON public.kb_notes;

CREATE POLICY "authenticated can view notes for own, public, or all if admin"
  ON public.kb_notes
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.kb_entries ke
      WHERE ke.id = kb_notes.entry_id
        AND ke.is_public = true
    )
  );

-- =========================================
-- VERIFICATION QUERIES
-- =========================================
-- Run these to verify the fix:
/*
-- Check kb_entries policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'kb_entries' AND cmd = 'SELECT';

-- Check kb_notes policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'kb_notes' AND cmd = 'SELECT';

-- Test with admin user (replace 'admin-user-id' with actual admin user ID)
-- This should return all entries
SELECT COUNT(*) FROM kb_entries WHERE is_admin('admin-user-id');

-- Test with regular user (replace 'regular-user-id' with actual user ID)
-- This should return only own + public entries
SELECT COUNT(*) FROM kb_entries WHERE auth.uid() = 'regular-user-id' OR is_public = true;
*/
