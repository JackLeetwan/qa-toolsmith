/**
 * Global setup for E2E tests
 *
 * This function runs once before all tests and performs:
 * 1. Environment variable validation
 * 2. Optional: Authentication state preparation (for future optimization)
 *
 * Reference: Playwright Global Setup
 * https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup() {
  console.log("🚀 Starting E2E Global Setup...");
  console.log("🔍 Environment check:");

  const supabaseUrl = process.env.SUPABASE_URL;
  const urlDisplay = supabaseUrl
    ? supabaseUrl.includes("localhost") || supabaseUrl.includes("127.0.0.1")
      ? `⚠️ LOCALHOST (${supabaseUrl})`
      : `✅ CLOUD (${supabaseUrl.split(".")[0]}.supabase.co)`
    : "❌ MISSING";

  console.log(`   - SUPABASE_URL: ${urlDisplay}`);
  console.log(
    `   - SUPABASE_KEY: ${process.env.SUPABASE_KEY ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `   - E2E_USERNAME: ${process.env.E2E_USERNAME ? "✅ Set" : "❌ Missing"}`,
  );
  console.log(
    `   - E2E_PASSWORD: ${process.env.E2E_PASSWORD ? "✅ Set" : "❌ Missing"}`,
  );

  // Validate required environment variables
  const requiredEnvVars = [
    "SUPABASE_URL",
    "SUPABASE_KEY",
    "E2E_USERNAME",
    "E2E_PASSWORD",
  ];

  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName],
  );

  if (missingVars.length > 0) {
    console.error("❌ Missing required environment variables:");
    missingVars.forEach((varName) => console.error(`   - ${varName}`));
    console.error(
      "\n💡 Make sure you have created .env.test file based on .env.test.example",
    );
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  console.log("✅ Environment variables validated");

  // Create seed data for tests that require existing public entries
  console.log("🌱 Creating E2E test seed data...");

  try {
    // Initialize Supabase client with public anon key for seed data creation
    const { createClient } = await import("@supabase/supabase-js");
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_KEY environment variables are required",
      );
    }
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_KEY,
    );

    // Authenticate as test user to create seed data
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: process.env.E2E_USERNAME as string,
      password: process.env.E2E_PASSWORD as string,
    });

    if (signInError) {
      console.warn(
        "⚠️  Could not authenticate for seed data creation:",
        signInError.message,
      );
      console.warn("⚠️  Tests requiring seed data may fail");
    } else {
      // Get authenticated user ID for seed data
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.warn(
          "⚠️  Failed to get user for seed data:",
          userError?.message,
        );
      } else {
        const userId = user.id;

        // Create public KB entries for tests that need them
        const seedEntries = [
          {
            id: "11111111-1111-1111-1111-111111111111",
            user_id: userId,
            title: "Jak pisać dobre raporty błędów",
            url_original: "https://example.com/kb/reports",
            tags: ["qa", "reports"],
            is_public: true,
          },
          {
            id: "22222222-2222-2222-2222-222222222222",
            user_id: userId,
            title: "Przewodnik po testach eksploracyjnych",
            url_original: "https://example.com/kb/exploratory",
            tags: ["qa", "exploratory"],
            is_public: true,
          },
        ];

        for (const entry of seedEntries) {
          const { error: insertError } = await supabase
            .from("kb_entries")
            .upsert(entry, { onConflict: "id" });

          if (insertError) {
            console.warn(
              `⚠️  Failed to create seed entry ${entry.id}:`,
              insertError.message,
            );
          } else {
            console.log(`✅ Created seed entry: ${entry.title}`);
          }
        }

        // Create a public note for the first entry
        const { error: noteError } = await supabase.from("kb_notes").upsert(
          {
            id: "33333333-3333-3333-3333-333333333333",
            entry_id: "11111111-1111-1111-1111-111111111111",
            user_id: userId,
            body: "Publiczna notatka do wpisu KB (seed)",
          },
          { onConflict: "id" },
        );

        if (noteError) {
          console.warn("⚠️  Failed to create seed note:", noteError.message);
        } else {
          console.log("✅ Created seed note");
        }
      }

      // Sign out
      await supabase.auth.signOut();
      console.log("✅ Seed data creation completed");
    }
  } catch (error) {
    console.warn("⚠️  Seed data creation failed:", error);
    console.warn("⚠️  Tests requiring seed data may fail");
  }

  // Future optimization: Pre-authenticate and store auth state
  // This would eliminate the need for login steps in each test
  // For now, we keep it simple and authenticate within tests when needed

  console.log("✅ Global setup completed");
}

export default globalSetup;
