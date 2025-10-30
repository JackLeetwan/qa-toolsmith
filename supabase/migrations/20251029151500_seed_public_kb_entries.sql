-- =========================================
-- SEED PUBLIC KB ENTRIES FOR E2E TESTS
-- =========================================
-- Purpose: ensure there are a few public KB entries visible to anonymous users.
-- Notes:
--  - Runs with superuser, bypassing RLS.
--  - Does NOT insert into auth.users/profiles; instead, reuses an existing profile as owner.
--  - Skips seeding if database appears to be production (has multiple users or non-test data)

-- Ensure is_public column exists (in case prior migration not yet applied)
ALTER TABLE public.kb_entries
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

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


