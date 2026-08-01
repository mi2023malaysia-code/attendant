begin;

-- Placeholder Supabase Auth user for local development and reproducible resets.
-- Create a real login-capable admin through the Auth admin API if you need to sign in with credentials.
insert into auth.users (id, email, raw_user_meta_data)
values (
  '11111111-1111-1111-1111-111111111117',
  'admin@webinar.local',
  '{"full_name":"Initial Admin"}'::jsonb
)
on conflict (id) do update
set email = excluded.email,
    raw_user_meta_data = excluded.raw_user_meta_data;

insert into public."117_admin_profiles" (user_id, display_name)
values (
  '11111111-1111-1111-1111-111111111117',
  'Initial Admin'
)
on conflict (user_id) do update
set display_name = excluded.display_name;

insert into public."117_topics" (
  topic_code,
  name,
  description,
  display_order,
  created_by
)
values
  (
    'webinar_overview',
    'Webinar Overview',
    'Questions that measure understanding of the webinar purpose, agenda, and key goals.',
    1,
    '11111111-1111-1111-1111-111111111117'
  ),
  (
    'audience_needs',
    'Audience Needs',
    'Questions that reveal the attendee context, expectations, and current challenges.',
    2,
    '11111111-1111-1111-1111-111111111117'
  ),
  (
    'topic_basics',
    'Topic Basics',
    'Core knowledge checks for the main subject being taught in the webinar.',
    3,
    '11111111-1111-1111-1111-111111111117'
  ),
  (
    'workflow_process',
    'Workflow and Process',
    'Questions that measure understanding of operational steps and recommended workflows.',
    4,
    '11111111-1111-1111-1111-111111111117'
  ),
  (
    'best_practices',
    'Best Practices',
    'Questions that assess familiarity with recommended practices and common pitfalls.',
    5,
    '11111111-1111-1111-1111-111111111117'
  ),
  (
    'follow_up_actions',
    'Follow-up Actions',
    'Questions that measure what the attendee plans to do after the webinar.',
    6,
    '11111111-1111-1111-1111-111111111117'
  )
on conflict (topic_code) do update
set name = excluded.name,
    description = excluded.description,
    display_order = excluded.display_order,
    created_by = excluded.created_by;

commit;
