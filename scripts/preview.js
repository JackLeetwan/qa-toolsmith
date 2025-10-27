/**
 * Preview script for Node adapter
 * Loads environment variables via dotenv before starting the Astro server
 * This ensures SUPABASE_URL and SUPABASE_KEY are available in process.env
 */

// Load environment variables first and wait for it to complete
import('dotenv').then(({ config }) => {
  config();
  console.log('✅ Environment variables loaded via dotenv');
  
  // Now import and start the Astro server
  import('../dist/server/entry.mjs').then((module) => {
    console.log('✅ Astro server entry loaded');
    // Entry point auto-starts via serverEntrypointModule['start']
  }).catch((err) => {
    console.error('❌ Failed to load server:', err);
    process.exit(1);
  });
}).catch((err) => {
  console.warn('⚠️  dotenv failed to load, using process.env:', err.message);
  
  // Continue without dotenv
  import('../dist/server/entry.mjs').then(() => {
    console.log('✅ Astro server entry loaded');
  }).catch((err2) => {
    console.error('❌ Failed to load server:', err2);
    process.exit(1);
  });
});
