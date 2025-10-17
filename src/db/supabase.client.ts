import { createClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey = import.meta.env.SUPABASE_KEY || "dummy-key";

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
