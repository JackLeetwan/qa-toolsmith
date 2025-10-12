-- migration: 20251011120000_initial_schema.sql
-- description: creates the initial database schema for qa-toolsmith
-- author: qa-toolsmith-ai
-- affected: all tables in the schema (profiles, templates, drafts, charters, charter_notes, kb_entries, kb_notes, ai_invocations, ai_daily_usage, usage_events)

-- enable required extensions
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
create extension if not exists "btree_gin";
create extension if not exists "citext";

-- set up schema and common functions
-- timestamp trigger function for created_at/updated_at
create or replace function public.set_timestamps()
returns trigger as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' then
    new.created_at = now();
  end if;
  return new;
end;
$$ language plpgsql;

-- admin check function (security definer)
create or replace function public.is_admin(uid uuid)
returns boolean as $$
begin
  return exists (select 1 from public.profiles where id = uid and role = 'admin');
end;
$$ language plpgsql security definer stable set search_path = public;

-- function to canonicalize urls
create or replace function public.canonicalize_url(url_input text)
returns text as $$
declare
  clean_url text;
begin
  -- basic canonicalization logic
  -- remove trailing slashes, lowercase, remove www prefix, etc.
  if url_input is null then
    return null;
  end if;
  
  clean_url := lower(url_input);
  clean_url := regexp_replace(clean_url, '^https?://(www\.)?', '', 'i');
  clean_url := regexp_replace(clean_url, '/$', '');
  
  return clean_url;
end;
$$ language plpgsql immutable;

-- ai usage check function
create or replace function public.can_invoke_ai(uid uuid)
returns boolean as $$
declare
  daily_limit constant int := 10; -- configurable limit
  current_usage int;
begin
  -- upsert into ai_daily_usage and check limit
  insert into public.ai_daily_usage (user_id, day, used)
  values (uid, current_date, 1)
  on conflict (user_id, day)
  do update set used = ai_daily_usage.used + 1
  returning used into current_usage;
  
  -- if over limit, roll back the increment
  if current_usage > daily_limit then
    update public.ai_daily_usage 
    set used = used - 1
    where user_id = uid and day = current_date;
    return false;
  end if;
  
  return true;
end;
$$ language plpgsql security definer;

-- 1. profiles table (managed by supabase auth)
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique,
  role text not null check (role in ('admin', 'user')),
  org_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fk_user_id foreign key (id) references auth.users(id) on delete cascade
);

create trigger set_profiles_timestamps
before insert or update on public.profiles
for each row execute function set_timestamps();

-- 2. templates table
create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name citext not null,
  scope text not null check (scope in ('global', 'user')),
  owner_id uuid null references public.profiles(id) on delete cascade,
  preset text null check (preset in ('ui_bug', 'api_bug')),
  fields jsonb not null check (jsonb_typeof(fields) = 'array'),
  required_fields text[] not null default '{}',
  attachments text[] not null default '{}' check (array_length(attachments, 1) is null or array_length(attachments, 1) <= 10),
  origin_template_id uuid null references public.templates(id) on delete set null,
  is_readonly boolean not null default false,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint global_template_no_owner check (scope != 'global' or owner_id is null)
);

create trigger set_templates_timestamps
before insert or update on public.templates
for each row execute function set_timestamps();

-- function to ensure required fields are part of the fields array
create or replace function public.ensure_required_fields_consistency()
returns trigger as $$
declare
  field_key text;
  field_keys text[] := '{}';
  field_obj jsonb;
begin
  -- extract all field keys from the fields array
  for i in 0..jsonb_array_length(new.fields) - 1 loop
    field_obj := jsonb_array_element(new.fields, i);
    field_key := field_obj->>'key';
    field_keys := array_append(field_keys, field_key);
  end loop;
  
  -- check if all required fields are in the field_keys array
  -- skip check if required_fields is empty
  if array_length(new.required_fields, 1) is not null then
    for i in 1..array_length(new.required_fields, 1) loop
      if not new.required_fields[i] = any(field_keys) then
        raise exception 'Required field % is not present in fields', new.required_fields[i];
      end if;
    end loop;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger ensure_required_fields_trigger
before insert or update of fields, required_fields on public.templates
for each row execute function ensure_required_fields_consistency();

-- function to validate attachment urls
create or replace function public.validate_attachments_urls()
returns trigger as $$
declare
  url text;
  valid_url_regex text := '^(https?://)([\da-z\.-]+)\.([a-z\.]{2,6})([/\w \.-]*)*/?$';
begin
  -- check each url in attachments array
  if new.attachments is not null and array_length(new.attachments, 1) is not null then
    for i in 1..array_length(new.attachments, 1) loop
      url := new.attachments[i];
      if url !~ valid_url_regex then
        raise exception 'Invalid URL format in attachments: %', url;
      end if;
    end loop;
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger validate_attachments_urls_trigger
before insert or update of attachments on public.templates
for each row execute function validate_attachments_urls();

-- 3. drafts table (optional in MVP)
create table if not exists public.drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid null references public.templates(id) on delete set null,
  title text not null check (length(title) between 1 and 200),
  content jsonb not null,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_drafts_timestamps
before insert or update on public.drafts
for each row execute function set_timestamps();

-- 4. charters table
create table if not exists public.charters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  goal text not null check (length(goal) between 1 and 500),
  hypotheses text null,
  summary_notes text null,
  status text not null check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz null,
  version int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint status_ended_at_check check (
    (status = 'active' and ended_at is null) or
    (status = 'closed' and ended_at is not null and ended_at >= started_at)
  )
);

create trigger set_charters_timestamps
before insert or update on public.charters
for each row execute function set_timestamps();

-- unique index for ensuring one active charter per user
create unique index charters_active_user_idx on public.charters (user_id) where status = 'active';

-- 5. charter_notes table
create table if not exists public.charter_notes (
  id uuid primary key default gen_random_uuid(),
  charter_id uuid not null references public.charters(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  tag text not null check (tag in ('bug', 'idea', 'question', 'risk')),
  body text not null check (length(body) <= 5000),
  noted_at timestamptz not null default now()
);

-- 6. kb_entries table
create table if not exists public.kb_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (length(title) between 1 and 200),
  url_original text not null,
  url_canonical text null,
  tags text[] not null default '{}',
  search_vector tsvector not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_kb_entries_timestamps
before insert or update on public.kb_entries
for each row execute function set_timestamps();

-- canonicalize url before insert/update
create or replace function public.canonicalize_kb_url()
returns trigger as $$
begin
  new.url_canonical := canonicalize_url(new.url_original);
  return new;
end;
$$ language plpgsql;

create trigger canonicalize_kb_url_trigger
before insert or update on public.kb_entries
for each row execute function canonicalize_kb_url();

-- function to maintain search vector
create or replace function public.maintain_kb_search_vector()
returns trigger as $$
begin
  new.search_vector := to_tsvector('english', coalesce(new.title, ''));
  
  -- add notes to search vector if we're updating an existing entry
  if tg_op = 'UPDATE' then
    new.search_vector := new.search_vector || (
      select coalesce(to_tsvector('english', string_agg(body, ' ')), to_tsvector(''))
      from public.kb_notes
      where entry_id = new.id
    );
  end if;
  
  return new;
end;
$$ language plpgsql;

create trigger maintain_kb_search_vector_trigger
before insert or update on public.kb_entries
for each row execute function maintain_kb_search_vector();

-- 7. kb_notes table
create table if not exists public.kb_notes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.kb_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) <= 5000),
  created_at timestamptz not null default now()
);

-- update kb_entries search vector when notes change
create or replace function public.update_kb_entry_search_vector()
returns trigger as $$
begin
  update public.kb_entries
  set search_vector = to_tsvector('english', title) || (
    select coalesce(to_tsvector('english', string_agg(body, ' ')), to_tsvector(''))
    from public.kb_notes
    where entry_id = new.entry_id
  )
  where id = new.entry_id;
  
  return new;
end;
$$ language plpgsql;

create trigger update_kb_entry_search_vector_trigger
after insert or update or delete on public.kb_notes
for each row execute function update_kb_entry_search_vector();

-- 8. ai_invocations table
create table if not exists public.ai_invocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (action in ('improve', 'expand')),
  model text null,
  tokens_prompt int null,
  tokens_completion int null,
  success boolean not null default true,
  error_code text null,
  meta jsonb null,
  created_at timestamptz not null default now()
);

-- 9. ai_daily_usage table
create table if not exists public.ai_daily_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  day date not null,
  used int not null default 0,
  primary key (user_id, day)
);

-- 10. usage_events table
create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('charter', 'generator', 'kb')),
  meta jsonb null,
  created_at timestamptz not null default now()
);

-- create indexes
create index templates_owner_updated_idx on public.templates (owner_id, updated_at desc, id desc);
create index templates_preset_scope_idx on public.templates (preset, scope, updated_at desc);
-- create unique functional index for case-insensitive template names
create unique index templates_name_unique_idx on public.templates (scope, lower(name::text), owner_id);

create index charters_user_updated_idx on public.charters (user_id, updated_at desc, id desc);

create index kb_entries_user_updated_idx on public.kb_entries (user_id, updated_at desc, id desc);
create index kb_entries_search_idx on public.kb_entries using gin(search_vector);
create index kb_entries_title_trgm_idx on public.kb_entries using gin(title gin_trgm_ops);
create index kb_entries_tags_idx on public.kb_entries using gin(tags);
-- create conditional unique index for canonical URLs
create unique index kb_entries_canonical_url_idx on public.kb_entries (user_id, url_canonical) where url_canonical is not null;

create index kb_notes_entry_created_idx on public.kb_notes (entry_id, created_at desc);

create index usage_events_user_created_idx on public.usage_events (user_id, created_at desc);

-- create views
create or replace view public.templates_effective as
select t.*
from public.templates t
where t.scope = 'global'
union all
select t.*
from public.templates t
where t.scope = 'user'
and t.owner_id = auth.uid();

-- seed default templates
insert into public.templates (name, scope, preset, fields, required_fields, is_readonly)
values 
('UI Bug Template', 'global', 'ui_bug', 
  '[
    {"key": "title", "type": "text", "label": "Title", "help": "Short description of the issue", "default": ""},
    {"key": "steps", "type": "textarea", "label": "Steps to reproduce", "help": "Numbered list of steps", "default": "1. \n2. \n3. "},
    {"key": "expected", "type": "textarea", "label": "Expected result", "help": "What should happen", "default": ""},
    {"key": "actual", "type": "textarea", "label": "Actual result", "help": "What actually happens", "default": ""},
    {"key": "environment", "type": "text", "label": "Environment", "help": "Browser, OS, resolution", "default": ""},
    {"key": "severity", "type": "select", "label": "Severity", "options": ["Critical", "Major", "Minor", "Trivial"], "default": "Minor"}
  ]'::jsonb,
  ARRAY['title','steps','expected','actual'],
  true),
('API Bug Template', 'global', 'api_bug', 
  '[
    {"key": "title", "type": "text", "label": "Title", "help": "Short description of the issue", "default": ""},
    {"key": "endpoint", "type": "text", "label": "Endpoint", "help": "API endpoint with method", "default": ""},
    {"key": "request", "type": "code", "label": "Request", "help": "Request payload", "default": "{\n  \n}"},
    {"key": "expected", "type": "textarea", "label": "Expected response", "help": "Expected API response", "default": ""},
    {"key": "actual", "type": "textarea", "label": "Actual response", "help": "Actual API response with status code", "default": ""},
    {"key": "environment", "type": "text", "label": "Environment", "help": "API version, test environment", "default": ""},
    {"key": "severity", "type": "select", "label": "Severity", "options": ["Critical", "Major", "Minor", "Trivial"], "default": "Minor"}
  ]'::jsonb,
  ARRAY['title','endpoint','request','expected','actual'],
  true);

-- enable row level security on all tables
alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.drafts enable row level security;
alter table public.charters enable row level security;
alter table public.charter_notes enable row level security;
alter table public.kb_entries enable row level security;
alter table public.kb_notes enable row level security;
alter table public.ai_invocations enable row level security;
alter table public.ai_daily_usage enable row level security;
alter table public.usage_events enable row level security;

-- create row level security policies for profiles
-- anon policies
create policy "anon_profiles_no_access" on public.profiles
for select using (false);

-- authenticated policies
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (id = auth.uid() or is_admin(auth.uid()));

create policy "profiles_update_own" on public.profiles
for update to authenticated
using (id = auth.uid() or is_admin(auth.uid()))
with check (id = auth.uid() or is_admin(auth.uid()));

-- create row level security policies for templates
-- anon policies
create policy "anon_templates_no_access" on public.templates
for select using (false);

-- authenticated policies
create policy "templates_select_global_or_own" on public.templates
for select to authenticated
using (scope = 'global' or (scope = 'user' and owner_id = auth.uid()));

create policy "templates_insert_own" on public.templates
for insert to authenticated
with check ((scope = 'user' and owner_id = auth.uid()) or (scope = 'global' and is_admin(auth.uid())));

create policy "templates_update_own" on public.templates
for update to authenticated
using ((scope = 'user' and owner_id = auth.uid()) or (scope = 'global' and is_admin(auth.uid())))
with check ((scope = 'user' and owner_id = auth.uid()) or (scope = 'global' and is_admin(auth.uid())));

create policy "templates_delete_own" on public.templates
for delete to authenticated
using ((scope = 'user' and owner_id = auth.uid()) or (scope = 'global' and is_admin(auth.uid())));

-- create row level security policies for drafts
-- anon policies
create policy "anon_drafts_no_access" on public.drafts
for select using (false);

-- authenticated policies
create policy "drafts_select_own" on public.drafts
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "drafts_insert_own" on public.drafts
for insert to authenticated
with check (user_id = auth.uid());

create policy "drafts_update_own" on public.drafts
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "drafts_delete_own" on public.drafts
for delete to authenticated
using (user_id = auth.uid());

-- create row level security policies for charters
-- anon policies
create policy "anon_charters_no_access" on public.charters
for select using (false);

-- authenticated policies
create policy "charters_select_own" on public.charters
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "charters_insert_own" on public.charters
for insert to authenticated
with check (user_id = auth.uid());

create policy "charters_update_own" on public.charters
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "charters_delete_own" on public.charters
for delete to authenticated
using (user_id = auth.uid());

-- create row level security policies for charter_notes
-- anon policies
create policy "anon_charter_notes_no_access" on public.charter_notes
for select using (false);

-- authenticated policies
create policy "charter_notes_select_own" on public.charter_notes
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "charter_notes_insert_own" on public.charter_notes
for insert to authenticated
with check (user_id = auth.uid());

create policy "charter_notes_update_own" on public.charter_notes
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "charter_notes_delete_own" on public.charter_notes
for delete to authenticated
using (user_id = auth.uid());

-- create row level security policies for kb_entries
-- anon policies
create policy "anon_kb_entries_no_access" on public.kb_entries
for select using (false);

-- authenticated policies
create policy "kb_entries_select_own" on public.kb_entries
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "kb_entries_insert_own" on public.kb_entries
for insert to authenticated
with check (user_id = auth.uid());

create policy "kb_entries_update_own" on public.kb_entries
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "kb_entries_delete_own" on public.kb_entries
for delete to authenticated
using (user_id = auth.uid());

-- create row level security policies for kb_notes
-- anon policies
create policy "anon_kb_notes_no_access" on public.kb_notes
for select using (false);

-- authenticated policies
create policy "kb_notes_select_own" on public.kb_notes
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "kb_notes_insert_own" on public.kb_notes
for insert to authenticated
with check (user_id = auth.uid());

create policy "kb_notes_update_own" on public.kb_notes
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "kb_notes_delete_own" on public.kb_notes
for delete to authenticated
using (user_id = auth.uid());

-- create row level security policies for ai_invocations
-- anon policies
create policy "anon_ai_invocations_no_access" on public.ai_invocations
for select using (false);

-- authenticated policies
create policy "ai_invocations_select_own" on public.ai_invocations
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "ai_invocations_insert_own" on public.ai_invocations
for insert to authenticated
with check (user_id = auth.uid());

-- create row level security policies for ai_daily_usage
-- anon policies
create policy "anon_ai_daily_usage_no_access" on public.ai_daily_usage
for select using (false);

-- authenticated policies
create policy "ai_daily_usage_select_own" on public.ai_daily_usage
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

-- create row level security policies for usage_events
-- anon policies
create policy "anon_usage_events_no_access" on public.usage_events
for select using (false);

-- authenticated policies
create policy "usage_events_select_own" on public.usage_events
for select to authenticated
using (user_id = auth.uid() or is_admin(auth.uid()));

create policy "usage_events_insert_own" on public.usage_events
for insert to authenticated
with check (user_id = auth.uid());

-- create admin stats views
create or replace view public.admin_stats_users as
select 
  count(*) as total_users,
  count(*) filter (where role = 'admin') as admin_users,
  count(*) filter (where role = 'user') as regular_users
from public.profiles;

create or replace view public.admin_stats_templates as
select
  count(*) as total_templates,
  count(*) filter (where scope = 'global') as global_templates,
  count(*) filter (where scope = 'user') as user_templates
from public.templates;

create or replace view public.admin_stats_activity as
select
  (select count(*) from public.charters where created_at > now() - interval '30 days') as recent_charters,
  (select count(*) from public.kb_entries where created_at > now() - interval '30 days') as recent_kb_entries,
  (select count(*) from public.ai_invocations where created_at > now() - interval '30 days') as recent_ai_invocations
;

-- create a function to handle user profile creation after auth signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user');
  
  return new;
end;
$$ language plpgsql security definer;

-- create trigger for automatic profile creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- restrict access to admin views
alter view public.admin_stats_users set (security_invoker = on);
alter view public.admin_stats_templates set (security_invoker = on);
alter view public.admin_stats_activity set (security_invoker = on);

comment on view public.admin_stats_users is 'Admin statistics on user counts - requires admin role to access';
comment on view public.admin_stats_templates is 'Admin statistics on template usage - requires admin role to access';
comment on view public.admin_stats_activity is 'Admin statistics on recent activity - requires admin role to access';

-- explain each table's purpose with comments
comment on table public.profiles is 'User profiles linked to auth.users';
comment on table public.templates is 'Bug report templates with fields configuration';
comment on table public.drafts is 'Saved draft reports for later completion';
comment on table public.charters is 'Exploration testing charters/sessions';
comment on table public.charter_notes is 'Notes taken during exploration testing sessions';
comment on table public.kb_entries is 'Knowledge base entries with URLs';
comment on table public.kb_notes is 'Notes associated with knowledge base entries';
comment on table public.ai_invocations is 'Log of AI usage for content improvement';
comment on table public.ai_daily_usage is 'Daily AI usage tracking for limits';
comment on table public.usage_events is 'Usage telemetry for feature analytics';
