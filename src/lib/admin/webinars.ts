import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type WebinarRecord = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  status: 'draft' | 'published' | 'completed' | 'archived';
  created_by: string | null;
  updated_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

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

export async function listAdminWebinars() {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('117_webinars')
    .select(webinarSelect)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to load webinars: ${error.message}`);
  }

  return (data ?? []) as WebinarRecord[];
}

export async function getAdminWebinar(id: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from('117_webinars')
    .select(webinarSelect)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load webinar: ${error.message}`);
  }

  return (data ?? null) as WebinarRecord | null;
}
