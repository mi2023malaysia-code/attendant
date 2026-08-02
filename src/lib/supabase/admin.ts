import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isAdminAuthBypassEnabled } from '@/lib/admin/test-access';
import {
  createPreviewSupabaseAdminClient,
  shouldUsePreviewAdminStore,
} from '@/lib/supabase/admin-preview';
import { getSupabaseServiceClient } from '@/lib/supabase/service-role';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function createSupabaseAdminClient(): Promise<SupabaseClient> {
  if (shouldUsePreviewAdminStore()) {
    return createPreviewSupabaseAdminClient();
  }

  if (isAdminAuthBypassEnabled()) {
    return getSupabaseServiceClient();
  }

  return createSupabaseServerClient();
}
