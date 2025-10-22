/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";

/**
 * Global teardown for E2E tests
 *
 * This function runs once after all tests and performs:
 * 1. Authentication with test user account (required for RLS)
 * 2. Cleanup of test data from all relevant tables
 *
 * IMPORTANT: This teardown deletes ALL data created by the authenticated test user.
 * - For single-developer projects: Safe to run after test completion
 * - For multi-developer projects: Consider alternative strategies (e.g., time-based cleanup, Supabase branching)
 *
 * Reference: Playwright Global Teardown
 * https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalTeardown() {
  console.log("🧹 Starting E2E Global Teardown...");

  // Validate required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
    console.warn("⚠️  Missing Supabase credentials. Skipping teardown.");
    return;
  }

  if (!process.env.E2E_USERNAME || !process.env.E2E_PASSWORD) {
    console.warn("⚠️  Missing E2E test user credentials. Skipping teardown.");
    return;
  }

  // Initialize Supabase client with public anon key
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
  );

  try {
    // Step 1: Authenticate as test user (required for RLS policies)
    console.log("🔐 Authenticating as test user...");
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_USERNAME as string,
      password: process.env.E2E_PASSWORD as string,
    });

    if (signInError) {
      console.warn("⚠️  Authentication failed:", signInError.message);
      console.warn(
        "⚠️  Skipping data cleanup. This is OK for tests that don't create data.",
      );
      return;
    }

    console.log("✅ Authenticated successfully");

    // Step 2: Get authenticated user ID
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("⚠️  Failed to get user:", userError?.message);
      console.warn("⚠️  Skipping data cleanup.");
      return;
    }

    const userId = user.id;
    console.log(`👤 Cleaning data for user: ${userId}`);

    // Step 3: Clean test data from all tables
    // Order matters: child tables first (foreign key constraints)

    const cleanupResults = [];

    // 3.1. Charter notes (child of charters)
    const { error: charterNotesError, count: charterNotesCount } =
      await supabase.from("charter_notes").delete().eq("user_id", userId);

    if (charterNotesError) {
      console.error(
        "⚠️  Error deleting charter_notes:",
        charterNotesError.message,
      );
    } else {
      cleanupResults.push(`charter_notes: ${charterNotesCount ?? 0} rows`);
    }

    // 3.2. KB notes (child of kb_entries)
    const { error: kbNotesError, count: kbNotesCount } = await supabase
      .from("kb_notes")
      .delete()
      .eq("user_id", userId);

    if (kbNotesError) {
      console.error("⚠️  Error deleting kb_notes:", kbNotesError.message);
    } else {
      cleanupResults.push(`kb_notes: ${kbNotesCount ?? 0} rows`);
    }

    // 3.3. Charters
    const { error: chartersError, count: chartersCount } = await supabase
      .from("charters")
      .delete()
      .eq("user_id", userId);

    if (chartersError) {
      console.error("⚠️  Error deleting charters:", chartersError.message);
    } else {
      cleanupResults.push(`charters: ${chartersCount ?? 0} rows`);
    }

    // 3.4. KB entries
    const { error: kbEntriesError, count: kbEntriesCount } = await supabase
      .from("kb_entries")
      .delete()
      .eq("user_id", userId);

    if (kbEntriesError) {
      console.error("⚠️  Error deleting kb_entries:", kbEntriesError.message);
    } else {
      cleanupResults.push(`kb_entries: ${kbEntriesCount ?? 0} rows`);
    }

    // 3.5. Drafts
    const { error: draftsError, count: draftsCount } = await supabase
      .from("drafts")
      .delete()
      .eq("user_id", userId);

    if (draftsError) {
      console.error("⚠️  Error deleting drafts:", draftsError.message);
    } else {
      cleanupResults.push(`drafts: ${draftsCount ?? 0} rows`);
    }

    // 3.6. AI invocations
    const { error: aiInvocationsError, count: aiInvocationsCount } =
      await supabase.from("ai_invocations").delete().eq("user_id", userId);

    if (aiInvocationsError) {
      console.error(
        "⚠️  Error deleting ai_invocations:",
        aiInvocationsError.message,
      );
    } else {
      cleanupResults.push(`ai_invocations: ${aiInvocationsCount ?? 0} rows`);
    }

    // 3.7. AI daily usage
    const { error: aiDailyUsageError, count: aiDailyUsageCount } =
      await supabase.from("ai_daily_usage").delete().eq("user_id", userId);

    if (aiDailyUsageError) {
      console.error(
        "⚠️  Error deleting ai_daily_usage:",
        aiDailyUsageError.message,
      );
    } else {
      cleanupResults.push(`ai_daily_usage: ${aiDailyUsageCount ?? 0} rows`);
    }

    // 3.8. Usage events
    const { error: usageEventsError, count: usageEventsCount } = await supabase
      .from("usage_events")
      .delete()
      .eq("user_id", userId);

    if (usageEventsError) {
      console.error(
        "⚠️  Error deleting usage_events:",
        usageEventsError.message,
      );
    } else {
      cleanupResults.push(`usage_events: ${usageEventsCount ?? 0} rows`);
    }

    // 3.9. User templates (scope = 'user')
    // Note: We don't delete global templates as they are shared
    const { error: templatesError, count: templatesCount } = await supabase
      .from("templates")
      .delete()
      .eq("owner_id", userId)
      .eq("scope", "user");

    if (templatesError) {
      console.error(
        "⚠️  Error deleting user templates:",
        templatesError.message,
      );
    } else {
      cleanupResults.push(`templates (user): ${templatesCount ?? 0} rows`);
    }

    // Step 4: Sign out
    await supabase.auth.signOut();

    // Step 5: Report results
    console.log("✅ Cleanup completed:");
    cleanupResults.forEach((result) => console.log(`   - ${result}`));

    console.log("✅ Global teardown completed");
  } catch (error) {
    console.error("❌ Global teardown failed:", error);
    // Don't throw - allow tests to complete even if cleanup fails
  }
}

export default globalTeardown;
