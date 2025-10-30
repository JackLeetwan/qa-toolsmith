-- =========================================
-- REMOVE SEED KB ENTRIES FROM PRODUCTION
-- =========================================
-- Purpose: Remove test seed data that was incorrectly added to production database
-- Notes:
--  - Safely removes only the specific seed entries by ID
--  - Preserves any real user data

-- Remove seed KB entries (only if they exist)
DELETE FROM public.kb_notes
WHERE entry_id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

DELETE FROM public.kb_entries
WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222'
);

-- Log what was removed
DO $$
DECLARE
  removed_entries int;
  removed_notes int;
BEGIN
  GET DIAGNOSTICS removed_entries = ROW_COUNT;
  SELECT COUNT(*) INTO removed_notes FROM public.kb_notes WHERE id = '33333333-3333-3333-3333-333333333333';

  IF removed_entries > 0 OR removed_notes > 0 THEN
    RAISE NOTICE 'Removed seed data: % KB entries and % notes', removed_entries, removed_notes;
  ELSE
    RAISE NOTICE 'No seed data found to remove';
  END IF;
END $$;
