import 'server-only';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getPublicEnv } from '@/lib/env/public';

export function getSupabaseAttendeeClient(attendeeToken: string): SupabaseClient {
  const publicEnv = getPublicEnv();

  return createClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: {
          'x-attendee-token': attendeeToken,
        },
      },
    },
  ) as SupabaseClient;
}
