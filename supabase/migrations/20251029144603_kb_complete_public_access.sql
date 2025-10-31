-- =========================================
-- KB COMPLETE PUBLIC ACCESS MIGRATION
-- =========================================
-- Purpose: Complete Knowledge Base public access implementation
-- Includes: is_public column, all RLS policies, admin restrictions, and seed data
-- Scope: kb_entries and kb_notes tables

-- =========================================
-- SCHEMA CHANGES
-- =========================================

-- Add is_public column to kb_entries
ALTER TABLE public.kb_entries
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- =========================================
-- CLEANUP: DROP EXISTING POLICIES
-- =========================================

-- KB Entries policies
DROP POLICY IF EXISTS "anon_kb_entries_no_access" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can view their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_entries_select_own" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can create their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can update their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can delete their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "authenticated can view own, public, or all entries if admin" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_insert_admin_or_user_private" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_update_admin_or_user_private" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_delete_admin_or_user_private" ON public.kb_entries;

-- KB Notes policies
DROP POLICY IF EXISTS "anon_kb_notes_no_access" ON public.kb_notes;
DROP POLICY IF EXISTS "Users can view notes for their own KB entries" ON public.kb_notes;
DROP POLICY IF EXISTS "kb_notes_select_own" ON public.kb_notes;
DROP POLICY IF EXISTS "authenticated can view notes for own, public, or all if admin" ON public.kb_notes;

-- =========================================
-- KB ENTRIES - ANON POLICIES
-- =========================================
-- Anonymous users can view only public KB entries

CREATE POLICY "anon can view public KB entries"
  ON public.kb_entries
  FOR SELECT
  TO anon
  USING (is_public = true);

-- =========================================
-- KB ENTRIES - AUTHENTICATED POLICIES
-- =========================================

-- SELECT: Authenticated users can view their own entries OR public entries OR all entries if admin
CREATE POLICY "authenticated can view own, public, or all entries if admin"
  ON public.kb_entries
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true OR is_admin(auth.uid()));

-- INSERT: Admins may insert any row, Users may insert only their own row and must set is_public = false
CREATE POLICY "kb_insert_admin_or_user_private"
  ON public.kb_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  );

-- UPDATE: Admins may update any row, Users may update only their own row when it is private
CREATE POLICY "kb_update_admin_or_user_private"
  ON public.kb_entries
  FOR UPDATE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  );

-- DELETE: Admins may delete any row, Users may delete only their own private rows
CREATE POLICY "kb_delete_admin_or_user_private"
  ON public.kb_entries
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  );

-- =========================================
-- KB NOTES - ANON POLICIES
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
-- KB NOTES - AUTHENTICATED POLICIES
-- =========================================

-- SELECT: Authenticated users can view notes for their own entries OR public entries OR all notes if admin
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

-- INSERT/UPDATE/DELETE: Users can manage notes for their own entries only
-- (policies inherited from kb_entries access control)

-- =========================================
-- SEED DATA FOR E2E TESTS
-- =========================================
-- Purpose: ensure there are a few public KB entries visible to anonymous users.
-- Notes:
--  - Runs with superuser, bypassing RLS.
--  - Does NOT insert into auth.users/profiles; instead, reuses an existing profile as owner.
--  - Skips seeding if database appears to be production (has multiple users or non-test data)

DO $$
DECLARE
  owner_id uuid;
  user_count int;
  kb_count int;
BEGIN
  -- Check if seed data was already inserted (avoid duplicates)
  IF EXISTS (SELECT 1 FROM public.kb_entries WHERE id = '11111111-1111-1111-1111-111111111111') THEN
    RAISE NOTICE 'Skipping KB seed: seed data already exists';
    RETURN;
  END IF;

  -- Check if this looks like a production database
  -- If there are more than 5 users or more than 10 KB entries, skip seeding
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  SELECT COUNT(*) INTO kb_count FROM public.kb_entries;

  IF user_count > 5 OR kb_count > 10 THEN
    RAISE NOTICE 'Skipping KB seed: database appears to be production (users: %, kb_entries: %)', user_count, kb_count;
    RETURN;
  END IF;

  -- Pick any existing profile as the owner of seeded rows
  SELECT id INTO owner_id FROM public.profiles ORDER BY created_at LIMIT 1;

  IF owner_id IS NULL THEN
    RAISE NOTICE 'Skipping KB seed: no profiles found (create any user first).';
    RETURN;
  END IF;

  -- Seed a couple of public KB entries
  INSERT INTO public.kb_entries (
    id,
    user_id,
    title,
    url_original,
    url_canonical,
    tags,
    is_public,
    search_vector
  )
  VALUES
    (
      '11111111-1111-1111-1111-111111111111',
      owner_id,
      'Jak pisać dobre raporty błędów',
      'https://example.com/kb/reports',
      NULL,
      ARRAY['qa','reports'],
      true,
      NULL
    ),
    (
      '22222222-2222-2222-2222-222222222222',
      owner_id,
      'Przewodnik po testach eksploracyjnych',
      'https://example.com/kb/exploratory',
      NULL,
      ARRAY['qa','exploratory'],
      true,
      NULL
    )
  ON CONFLICT (id) DO NOTHING;

  -- Optional: a sample public note bound to first entry
  INSERT INTO public.kb_notes (id, entry_id, user_id, body)
  VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    owner_id,
    'Publiczna notatka do wpisu KB (seed)'
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- =========================================
-- VERIFICATION NOTES
-- =========================================
-- Examples (run with appropriate roles/JWT in Supabase SQL editor):
--
-- 1) As regular user U:
--    -- INSERT public -> should DENY
--    insert into public.kb_entries (user_id, is_public, title) values (auth.uid(), true, 'x');
--    -- INSERT private -> should ALLOW
--    insert into public.kb_entries (user_id, is_public, title) values (auth.uid(), false, 'y');
--    -- UPDATE own private title -> should ALLOW
--    update public.kb_entries set title = 'y2' where user_id = auth.uid() and is_public = false;
--    -- UPDATE own private set is_public=true -> should DENY
--    update public.kb_entries set is_public = true where user_id = auth.uid() and is_public = false;
--    -- UPDATE/DELETE any public row (even own) -> should DENY
--    update public.kb_entries set title = 'p' where is_public = true;
--    delete from public.kb_entries where is_public = true;
--
-- 2) As admin A:
--    -- INSERT/UPDATE/DELETE any (public/private) -> should ALLOW
--    insert into public.kb_entries (user_id, is_public, title) values (auth.uid(), true, 'pub');
--    update public.kb_entries set is_public = true;
--    delete from public.kb_entries where true;
