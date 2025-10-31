-- =========================================
-- KB PUBLIC READ ACCESS MIGRATION
-- =========================================
-- Purpose: Enable public read access to KB entries marked as public
-- Adds is_public column and updates RLS policies

-- Add is_public column to kb_entries
ALTER TABLE public.kb_entries 
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Remove old anon policies (if they exist - they were dropped in previous migration)
DROP POLICY IF EXISTS "anon_kb_entries_no_access" ON public.kb_entries;
DROP POLICY IF EXISTS "anon_kb_notes_no_access" ON public.kb_notes;

-- =========================================
-- KB ENTRIES - NEW ANON POLICY
-- =========================================
-- Anonymous users can view only public KB entries
CREATE POLICY "anon can view public KB entries"
  ON public.kb_entries
  FOR SELECT
  TO anon
  USING (is_public = true);

-- =========================================
-- KB ENTRIES - UPDATE AUTHENTICATED POLICY
-- =========================================
-- Authenticated users can view their own entries OR public entries OR all entries if admin
DROP POLICY IF EXISTS "Users can view their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_entries_select_own" ON public.kb_entries;
CREATE POLICY "authenticated can view own, public, or all entries if admin"
  ON public.kb_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true OR is_admin(auth.uid()));

-- =========================================
-- KB NOTES - NEW ANON POLICY
-- =========================================
-- Anonymous users can view notes only for public KB entries
CREATE POLICY "anon can view notes for public KB entries"
  ON public.kb_notes
  FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.kb_entries ke
      WHERE ke.id = kb_notes.entry_id 
        AND ke.is_public = true
    )
  );

-- =========================================
-- KB NOTES - UPDATE AUTHENTICATED POLICY
-- =========================================
-- Authenticated users can view notes for their own entries OR public entries OR all notes if admin
DROP POLICY IF EXISTS "Users can view notes for their own KB entries" ON public.kb_notes;
DROP POLICY IF EXISTS "kb_notes_select_own" ON public.kb_notes;
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
-- NOTE: INSERT/UPDATE/DELETE policies remain unchanged
-- Users can still only create/update/delete their own entries
-- =========================================

