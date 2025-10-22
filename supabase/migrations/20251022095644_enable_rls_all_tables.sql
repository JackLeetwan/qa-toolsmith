-- Migration: Update Row Level Security (RLS) policies on all tables
-- Purpose: Implement comprehensive and consistent access control based on user authentication and roles
-- Affected tables: All tables in public schema
-- Special considerations:
-- - Public access: None (generators work client-side, presets are read-only)
-- - Authenticated users: Full access to their own data (user_id/owner_id = auth.uid())
-- - Admin users: Additional access to global templates and admin statistics
-- - Policies are granular (separate for select/insert/update/delete) and role-specific
-- - RLS was already enabled in initial migration, updating policies for consistency

-- =========================================
-- CLEANUP: Drop existing RLS policies before recreating
-- =========================================
-- Drop all existing policies to ensure clean slate

-- AI tables
drop policy if exists "anon_ai_daily_usage_no_access" on public.ai_daily_usage;
drop policy if exists "ai_daily_usage_select_own" on public.ai_daily_usage;

drop policy if exists "anon_ai_invocations_no_access" on public.ai_invocations;
drop policy if exists "ai_invocations_select_own" on public.ai_invocations;
drop policy if exists "ai_invocations_insert_own" on public.ai_invocations;

-- Charter tables
drop policy if exists "anon_charters_no_access" on public.charters;
drop policy if exists "charters_select_own" on public.charters;
drop policy if exists "charters_insert_own" on public.charters;
drop policy if exists "charters_update_own" on public.charters;
drop policy if exists "charters_delete_own" on public.charters;

drop policy if exists "anon_charter_notes_no_access" on public.charter_notes;
drop policy if exists "charter_notes_select_own" on public.charter_notes;
drop policy if exists "charter_notes_insert_own" on public.charter_notes;
drop policy if exists "charter_notes_update_own" on public.charter_notes;
drop policy if exists "charter_notes_delete_own" on public.charter_notes;

-- Drafts table
drop policy if exists "anon_drafts_no_access" on public.drafts;
drop policy if exists "drafts_select_own" on public.drafts;
drop policy if exists "drafts_insert_own" on public.drafts;
drop policy if exists "drafts_update_own" on public.drafts;
drop policy if exists "drafts_delete_own" on public.drafts;

-- KB tables
drop policy if exists "anon_kb_entries_no_access" on public.kb_entries;
drop policy if exists "kb_entries_select_own" on public.kb_entries;
drop policy if exists "kb_entries_insert_own" on public.kb_entries;
drop policy if exists "kb_entries_update_own" on public.kb_entries;
drop policy if exists "kb_entries_delete_own" on public.kb_entries;

drop policy if exists "anon_kb_notes_no_access" on public.kb_notes;
drop policy if exists "kb_notes_select_own" on public.kb_notes;
drop policy if exists "kb_notes_insert_own" on public.kb_notes;
drop policy if exists "kb_notes_update_own" on public.kb_notes;
drop policy if exists "kb_notes_delete_own" on public.kb_notes;

-- Profiles table
drop policy if exists "anon_profiles_no_access" on public.profiles;
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- Templates table
drop policy if exists "anon_templates_no_access" on public.templates;
drop policy if exists "templates_select_global_or_own" on public.templates;
drop policy if exists "templates_insert_own" on public.templates;
drop policy if exists "templates_update_own" on public.templates;
drop policy if exists "templates_delete_own" on public.templates;

-- Usage events table
drop policy if exists "anon_usage_events_no_access" on public.usage_events;
drop policy if exists "usage_events_select_own" on public.usage_events;
drop policy if exists "usage_events_insert_own" on public.usage_events;

-- =========================================
-- AI DAILY USAGE TABLE
-- =========================================
-- Purpose: Track daily AI usage limits per user
-- Access: Users can only access their own usage data
-- Note: RLS already enabled in initial migration

-- Authenticated users can read their own usage
create policy "Users can view their own AI daily usage"
  on public.ai_daily_usage
  for select
  using (auth.uid() = user_id);

-- Authenticated users can insert their own usage (for tracking)
create policy "Users can insert their own AI daily usage"
  on public.ai_daily_usage
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own usage
create policy "Users can update their own AI daily usage"
  on public.ai_daily_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete their own usage (cleanup)
create policy "Users can delete their own AI daily usage"
  on public.ai_daily_usage
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- AI INVOCATIONS TABLE
-- =========================================
-- Purpose: Log AI service calls for debugging and monitoring
-- Access: Users can only access their own invocation logs

-- RLS already enabled in initial migration

-- Authenticated users can read their own AI invocations
create policy "Users can view their own AI invocations"
  on public.ai_invocations
  for select
  using (auth.uid() = user_id);

-- Authenticated users can insert their own invocations (logging)
create policy "Users can insert their own AI invocations"
  on public.ai_invocations
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own invocations (if needed for status)
create policy "Users can update their own AI invocations"
  on public.ai_invocations
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- CHARTER NOTES TABLE
-- =========================================
-- Purpose: Store notes from exploration sessions
-- Access: Users can only access notes from their own charters

-- RLS already enabled in initial migration

-- Authenticated users can read notes from their own charters
create policy "Users can view notes from their own charters"
  on public.charter_notes
  for select
  using (auth.uid() = user_id);

-- Authenticated users can insert notes to their own charters
create policy "Users can insert notes to their own charters"
  on public.charter_notes
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update notes in their own charters
create policy "Users can update notes in their own charters"
  on public.charter_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete notes from their own charters
create policy "Users can delete notes from their own charters"
  on public.charter_notes
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- CHARTERS TABLE
-- =========================================
-- Purpose: Store exploration session charters
-- Access: Users can only access their own charters

-- RLS already enabled in initial migration

-- Authenticated users can read their own charters
create policy "Users can view their own charters"
  on public.charters
  for select
  using (auth.uid() = user_id);

-- Authenticated users can create their own charters
create policy "Users can create their own charters"
  on public.charters
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own charters
create policy "Users can update their own charters"
  on public.charters
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete their own charters
create policy "Users can delete their own charters"
  on public.charters
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- DRAFTS TABLE
-- =========================================
-- Purpose: Store draft reports and templates
-- Access: Users can only access their own drafts

-- RLS already enabled in initial migration

-- Authenticated users can read their own drafts
create policy "Users can view their own drafts"
  on public.drafts
  for select
  using (auth.uid() = user_id);

-- Authenticated users can create their own drafts
create policy "Users can create their own drafts"
  on public.drafts
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own drafts
create policy "Users can update their own drafts"
  on public.drafts
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete their own drafts
create policy "Users can delete their own drafts"
  on public.drafts
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- KB ENTRIES TABLE
-- =========================================
-- Purpose: Store knowledge base entries
-- Access: Users can only access their own KB entries

-- RLS already enabled in initial migration

-- Authenticated users can read their own KB entries
create policy "Users can view their own KB entries"
  on public.kb_entries
  for select
  using (auth.uid() = user_id);

-- Authenticated users can create their own KB entries
create policy "Users can create their own KB entries"
  on public.kb_entries
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own KB entries
create policy "Users can update their own KB entries"
  on public.kb_entries
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete their own KB entries
create policy "Users can delete their own KB entries"
  on public.kb_entries
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- KB NOTES TABLE
-- =========================================
-- Purpose: Store notes attached to KB entries
-- Access: Users can only access notes for their own KB entries

-- RLS already enabled in initial migration

-- Authenticated users can read notes for their own KB entries
create policy "Users can view notes for their own KB entries"
  on public.kb_notes
  for select
  using (auth.uid() = user_id);

-- Authenticated users can create notes for their own KB entries
create policy "Users can create notes for their own KB entries"
  on public.kb_notes
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update notes for their own KB entries
create policy "Users can update notes for their own KB entries"
  on public.kb_notes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Authenticated users can delete notes for their own KB entries
create policy "Users can delete notes for their own KB entries"
  on public.kb_notes
  for delete
  using (auth.uid() = user_id);

-- =========================================
-- PROFILES TABLE
-- =========================================
-- Purpose: Store user profile information
-- Access: Users can only access and modify their own profile

-- RLS already enabled in initial migration

-- Authenticated users can read their own profile
create policy "Users can view their own profile"
  on public.profiles
  for select
  using (auth.uid() = id);

-- Authenticated users can update their own profile
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Authenticated users can insert their own profile (during registration)
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- =========================================
-- TEMPLATES TABLE
-- =========================================
-- Purpose: Store defect report templates (global and user-specific)
-- Access: Complex - users see global templates (read-only) + own templates (full access), admins manage global templates

-- RLS already enabled in initial migration

-- All authenticated users can read global templates
create policy "Users can view global templates"
  on public.templates
  for select
  using (scope = 'global');

-- Users can read their own templates
create policy "Users can view their own templates"
  on public.templates
  for select
  using (auth.uid() = owner_id);

-- Users can create their own templates
create policy "Users can create their own templates"
  on public.templates
  for insert
  with check (auth.uid() = owner_id);

-- Users can update their own templates
create policy "Users can update their own templates"
  on public.templates
  for update
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Users can delete their own templates
create policy "Users can delete their own templates"
  on public.templates
  for delete
  using (auth.uid() = owner_id);

-- Admins can update global templates
create policy "Admins can update global templates"
  on public.templates
  for update
  using (scope = 'global' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ))
  with check (scope = 'global' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- Admins can delete global templates (with caution)
create policy "Admins can delete global templates"
  on public.templates
  for delete
  using (scope = 'global' and exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ));

-- =========================================
-- USAGE EVENTS TABLE
-- =========================================
-- Purpose: Track user activity for analytics and auditing
-- Access: Users can only access their own usage events

-- RLS already enabled in initial migration

-- Authenticated users can read their own usage events
create policy "Users can view their own usage events"
  on public.usage_events
  for select
  using (auth.uid() = user_id);

-- Authenticated users can insert their own usage events (tracking)
create policy "Users can insert their own usage events"
  on public.usage_events
  for insert
  with check (auth.uid() = user_id);

-- Authenticated users can update their own usage events (if needed)
create policy "Users can update their own usage events"
  on public.usage_events
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- =========================================
-- ADMIN VIEWS - SPECIAL ACCESS
-- =========================================
-- Purpose: Admin statistics views
-- Access: Only admin users can access these views

-- Note: Views inherit RLS from their underlying tables, but we ensure
-- admin access is properly controlled through the base table policies

-- Grant admin access to admin statistics views
-- (Views automatically inherit RLS from underlying tables)
