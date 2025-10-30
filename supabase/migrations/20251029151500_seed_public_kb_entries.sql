-- =========================================
-- SEED PUBLIC KB ENTRIES FOR E2E TESTS
-- =========================================
-- Purpose: ensure there are a few public KB entries visible to anonymous users.
-- Notes:
--  - Runs with superuser, bypassing RLS.
--  - Does NOT insert into auth.users/profiles; instead, reuses an existing profile as owner.
--  - If no profiles exist, the seed is skipped gracefully.

-- Ensure is_public column exists (in case prior migration not yet applied)
ALTER TABLE public.kb_entries 
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  owner_id uuid;
BEGIN
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


