import 'server-only';

import { createPreviewSupabaseAdminClient } from '@/lib/supabase/admin-preview';
import { toRow, toRows } from '@/lib/supabase/cast';

export type { WebinarRecord } from './webinars';

const webinarSelect = [
  'id',
  'title',
  'description',
  'starts_at',
  'ends_at',
  'timezone',
  'status',
  'created_by',
  'updated_by',
  'archived_at',
  'created_at',
  'updated_at',
].join(', ');

export async function listPublicWebinars() {
  const supabase = createPreviewSupabaseAdminClient();

  const { data, error } = await supabase
    .from('117_webinars')
    .select(webinarSelect)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load public webinars: ${error.message}`);
  }

  return toRows<import('./webinars').WebinarRecord>(data);
}

export async function getPublicWebinar(id: string) {
  const supabase = createPreviewSupabaseAdminClient();

  const { data, error } = await supabase
    .from('117_webinars')
    .select(webinarSelect)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load public webinar: ${error.message}`);
  }

  return toRow<import('./webinars').WebinarRecord>(data);
}
