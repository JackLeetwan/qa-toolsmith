# KB: Admin-only public entries — summary

## Goal

Only admins can create, edit, or delete public KB entries (`is_public = true`). Regular users can work only with their own private entries.

## Final behavior

- Unauthenticated: can read only public entries.
- Authenticated (user):
  - Read: own + public.
  - Create: private only (attempt to create public → 403).
  - Update: only own private; cannot edit any public nor set `is_public: true` → 403.
  - Delete: only own private; deleting public → 403.
- Admin: full CRUD on both private and public entries.

## API (authoritative examples)

See `docs/api.md`:

- POST `/api/kb/entries` → 403 for non-admin creating with `is_public: true` (message: "Only admins can create public KB entries").
- PUT `/api/kb/entries/[id]` → 403 for non-admin editing public or setting `is_public: true` (message: "Only admins can edit public KB entries").
- DELETE `/api/kb/entries/[id]` → 403 for non-admin deleting public (message: "Only admins can delete public KB entries").
- GET endpoints unchanged; internal `search_vector` is never returned.

Error format (snake_case):

```json
{ "error": { "code": "FORBIDDEN", "message": "...", "details": null } }
```

## RLS overview

Policies on `public.kb_entries` enforce:

- SELECT: anon → public only; authenticated → own or public.
- INSERT: admin any; user only own with `is_public = false`.
- UPDATE: admin any; user only own private and cannot flip to public.
- DELETE: admin any; user only own private.

Implemented in migrations:

- `20251029144603_kb_public_read_access.sql` (public read)
- `20251029150000_kb_admin_public_access.sql` (admin-only writes to public)

## UI impact

- Checkbox `is_public` visible/enabled only for admins.
- Non-admins do not see edit/delete for public entries.

## Testing pointers

- Unit/integration: POST/PUT/DELETE 403 cases for non-admin; 200/201/204 for admin.
- RLS: verify user cannot modify public rows; admin can.
- E2E: non-admin cannot publish or modify public; admin full control.

This document replaces detailed analysis/plan with a concise reference. For full request/response samples, use `docs/api.md`.
