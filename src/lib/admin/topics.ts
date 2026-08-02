import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toRows } from '@/lib/supabase/cast';

export type TopicRecord = {
  id: string;
  topic_code: string;
  name: string;
  description: string | null;
  display_order: number;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

const topicSelect = [
  'id',
  'topic_code',
  'name',
  'description',
  'display_order',
  'created_by',
  'archived_at',
  'created_at',
  'updated_at',
].join(', ');

export async function listAdminTopics() {
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('117_topics')
    .select(topicSelect)
    .order('display_order', { ascending: true })
    .order('name', { ascending: true });

  if (result.error) {
    throw new Error(`Failed to load topics: ${result.error.message}`);
  }

  return toRows<TopicRecord>(result.data);
}
