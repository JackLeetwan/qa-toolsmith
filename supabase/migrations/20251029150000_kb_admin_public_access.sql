-- =========================================
-- KB ADMIN PUBLIC ACCESS (WRITE RESTRICTIONS)
-- =========================================
-- Purpose: Enforce rule that only admins can create/update/delete public KB entries.
--          Regular users can only create/update/delete their own private entries (is_public = false).
-- Scope:   Updates RLS policies for INSERT/UPDATE/DELETE on public.kb_entries only.
-- Notes:   SELECT policies added in 20251029144603_kb_public_read_access.sql remain unchanged.

-- =========================================
-- PREREQUISITES / HELPERS
-- =========================================
-- Admin helper function already exists from initial schema:
--   create or replace function public.is_admin(uid uuid)
--   returns boolean ...
-- We intentionally do NOT override it here to avoid behavior changes.

-- =========================================
-- CLEANUP: DROP OLD CONFLICTING WRITE POLICIES ON kb_entries
-- =========================================
-- Keep SELECT policies intact (anon can view public; authenticated can view own or public)
-- Drop only write-related policies that previously allowed all own rows regardless of is_public
DROP POLICY IF EXISTS "Users can create their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can update their own KB entries" ON public.kb_entries;
DROP POLICY IF EXISTS "Users can delete their own KB entries" ON public.kb_entries;

-- (For idempotency in developer environments)
DROP POLICY IF EXISTS "kb_insert_admin_or_user_private" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_update_admin_or_user_private" ON public.kb_entries;
DROP POLICY IF EXISTS "kb_delete_admin_or_user_private" ON public.kb_entries;

-- =========================================
-- INSERT POLICY
-- =========================================
-- Admins: may insert any row, including is_public = true
-- Users:  may insert only their own row and must set is_public = false
CREATE POLICY "kb_insert_admin_or_user_private"
  ON public.kb_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  );

-- =========================================
-- UPDATE POLICY
-- =========================================
-- Admins: may update any row (public or private)
-- Users:  may update only their own row when it is private (is_public = false)
--         and cannot flip a private row to public (enforced by WITH CHECK)
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

-- =========================================
-- DELETE POLICY
-- =========================================
-- Admins: may delete any row (public or private)
-- Users:  may delete only their own private rows
CREATE POLICY "kb_delete_admin_or_user_private"
  ON public.kb_entries
  FOR DELETE
  TO authenticated
  USING (
    public.is_admin(auth.uid()) OR (auth.uid() = user_id AND is_public = false)
  );

-- =========================================
-- VALIDATION NOTES (manual quick checks)
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
--
-- SELECT policies remain unchanged from 20251029144603_kb_public_read_access.sql:
--  - anon can view public KB entries
--  - authenticated can view own or public KB entries


