import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import { getPublicEnv } from '@/lib/env/public';

let browserClient:
  | SupabaseClient
  | undefined;

export function getSupabaseBrowserClient() {
  const publicEnv = getPublicEnv();

  browserClient ??= createBrowserClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ) as SupabaseClient;

  return browserClient;
}
