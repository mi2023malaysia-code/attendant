import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getServerEnv } from '@/lib/env/server';

let serviceClient: SupabaseClient | null = null;

export function getSupabaseServiceClient() {
  if (!serviceClient) {
    const env = getServerEnv();

    serviceClient = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      },
    );
  }

  return serviceClient;
}
