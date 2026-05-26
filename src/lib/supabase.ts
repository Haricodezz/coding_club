// ============================================================
// Supabase Client — Browser + Server
// Uses @supabase/ssr for proper Next.js App Router support
// ============================================================

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// -----------------------------------------------
// Browser client (for use in Client Components)
// -----------------------------------------------
export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}

// Singleton instance for convenience in client components
let _browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;
export function getSupabase() {
  if (!_browserClient) {
    _browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return _browserClient;
}
