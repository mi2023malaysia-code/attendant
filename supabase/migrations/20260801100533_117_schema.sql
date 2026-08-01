begin;

create extension if not exists pgcrypto;

create or replace function public.set_117_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_117_questionnaire_version_mutation()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'published' then
    raise exception 'Published questionnaire versions are immutable';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_117_question_mutation()
returns trigger
language plpgsql
as $$
declare
  old_version_status text;
  new_version_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select qv.status
    into old_version_status
    from public."117_questionnaire_versions" qv
    join public."117_questions" q
      on q.questionnaire_version_id = qv.id
    where q.id = old.id;

    if old_version_status = 'published' then
      raise exception 'Questions in published questionnaire versions are immutable';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select qv.status
    into new_version_status
    from public."117_questionnaire_versions" qv
    where qv.id = new.questionnaire_version_id;

    if new_version_status = 'published' then
      raise exception 'Questions in published questionnaire versions are immutable';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.prevent_117_question_option_mutation()
returns trigger
language plpgsql
as $$
declare
  old_version_status text;
  new_version_status text;
begin
  if tg_op in ('UPDATE', 'DELETE') then
    select qv.status
    into old_version_status
    from public."117_questionnaire_versions" qv
    join public."117_questions" q
      on q.questionnaire_version_id = qv.id
    join public."117_question_options" qo
      on qo.question_id = q.id
    where qo.id = old.id;

    if old_version_status = 'published' then
      raise exception 'Question options in published questionnaire versions are immutable';
    end if;
  end if;

  if tg_op in ('INSERT', 'UPDATE') then
    select qv.status
    into new_version_status
    from public."117_questionnaire_versions" qv
    join public."117_questions" q
      on q.questionnaire_version_id = qv.id
    where q.id = new.question_id;

    if new_version_status = 'published' then
      raise exception 'Question options in published questionnaire versions are immutable';
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_117_assignment_uses_published_version()
returns trigger
language plpgsql
as $$
declare
  version_status text;
begin
  select qv.status
  into version_status
  from public."117_questionnaire_versions" qv
  where qv.id = new.questionnaire_version_id;

  if version_status is distinct from 'published' then
    raise exception 'Assignments must reference a published questionnaire version';
  end if;

  return new;
end;
$$;

create or replace function public.ensure_117_invitation_token_assignment_is_active()
returns trigger
language plpgsql
as $$
declare
  assignment_status text;
begin
  select a.status
  into assignment_status
  from public."117_webinar_questionnaire_assignments" a
  where a.id = new.assignment_id;

  if assignment_status is distinct from 'active' then
    raise exception 'Invitation tokens can only be issued for active assignments';
  end if;

  return new;
end;
$$;

create or replace function public.validate_117_response_mutation()
returns trigger
language plpgsql
as $$
declare
  token_row public."117_invitation_tokens"%rowtype;
  assignment_row public."117_webinar_questionnaire_assignments"%rowtype;
begin
  if tg_op = 'INSERT' then
    select *
    into token_row
    from public."117_invitation_tokens"
    where id = new.invitation_token_id;

    if not found then
      raise exception 'Invitation token not found';
    end if;

    select *
    into assignment_row
    from public."117_webinar_questionnaire_assignments"
    where id = new.assignment_id;

    if not found then
      raise exception 'Assignment not found';
    end if;

    if token_row.assignment_id <> new.assignment_id then
      raise exception 'Response assignment does not match the invitation token';
    end if;

    if token_row.attendee_id <> new.attendee_id then
      raise exception 'Response attendee does not match the invitation token';
    end if;

    if token_row.status not in ('issued', 'opened') then
      raise exception 'Invitation token is not active';
    end if;

    if assignment_row.status <> 'active' then
      raise exception 'Assignment is not active';
    end if;

    if new.status <> 'draft' then
      raise exception 'New responses must start as drafts';
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.status in ('submitted', 'locked') then
      raise exception 'Submitted responses are immutable';
    end if;

    if new.assignment_id <> old.assignment_id
      or new.invitation_token_id <> old.invitation_token_id
      or new.attendee_id <> old.attendee_id then
      raise exception 'Response ownership cannot be changed';
    end if;

    select *
    into token_row
    from public."117_invitation_tokens"
    where id = new.invitation_token_id;

    if not found then
      raise exception 'Invitation token not found';
    end if;

    select *
    into assignment_row
    from public."117_webinar_questionnaire_assignments"
    where id = new.assignment_id;

    if not found then
      raise exception 'Assignment not found';
    end if;

    if token_row.status not in ('issued', 'opened') then
      raise exception 'Invitation token is not active';
    end if;

    if assignment_row.status <> 'active' then
      raise exception 'Assignment is not active';
    end if;

    return new;
  end if;

  if old.status in ('submitted', 'locked') then
    raise exception 'Submitted responses are immutable';
  end if;

  return old;
end;
$$;

create or replace function public.validate_117_response_answer_mutation()
returns trigger
language plpgsql
as $$
declare
  response_row public."117_responses"%rowtype;
  token_row public."117_invitation_tokens"%rowtype;
  assignment_row public."117_webinar_questionnaire_assignments"%rowtype;
  assignment_version_id uuid;
  question_version_id uuid;
  selected_option_question_id uuid;
begin
  if tg_op = 'INSERT' then
    select *
    into response_row
    from public."117_responses"
    where id = new.response_id;

    if not found then
      raise exception 'Response not found';
    end if;

    if response_row.status <> 'draft' then
      raise exception 'Answers can only be changed while the response is a draft';
    end if;

    select *
    into token_row
    from public."117_invitation_tokens"
    where id = response_row.invitation_token_id;

    if token_row.status not in ('issued', 'opened') then
      raise exception 'Invitation token is not active';
    end if;

    select *
    into assignment_row
    from public."117_webinar_questionnaire_assignments"
    where id = response_row.assignment_id;

    if assignment_row.status <> 'active' then
      raise exception 'Assignment is not active';
    end if;

    select a.questionnaire_version_id
    into assignment_version_id
    from public."117_webinar_questionnaire_assignments" a
    where a.id = response_row.assignment_id;

    select q.questionnaire_version_id
    into question_version_id
    from public."117_questions" q
    where q.id = new.question_id;

    if assignment_version_id is distinct from question_version_id then
      raise exception 'Answer question does not belong to the response questionnaire version';
    end if;

    if new.selected_option_id is not null then
      select qo.question_id
      into selected_option_question_id
      from public."117_question_options" qo
      where qo.id = new.selected_option_id;

      if selected_option_question_id is distinct from new.question_id then
        raise exception 'Selected option does not belong to the question';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.response_id <> old.response_id or new.question_id <> old.question_id then
      raise exception 'Response answers cannot be reassigned';
    end if;

    select *
    into response_row
    from public."117_responses"
    where id = old.response_id;

    if response_row.status <> 'draft' then
      raise exception 'Answers can only be changed while the response is a draft';
    end if;

    select *
    into token_row
    from public."117_invitation_tokens"
    where id = response_row.invitation_token_id;

    if token_row.status not in ('issued', 'opened') then
      raise exception 'Invitation token is not active';
    end if;

    select *
    into assignment_row
    from public."117_webinar_questionnaire_assignments"
    where id = response_row.assignment_id;

    if assignment_row.status <> 'active' then
      raise exception 'Assignment is not active';
    end if;

    select a.questionnaire_version_id
    into assignment_version_id
    from public."117_webinar_questionnaire_assignments" a
    where a.id = response_row.assignment_id;

    select q.questionnaire_version_id
    into question_version_id
    from public."117_questions" q
    where q.id = new.question_id;

    if assignment_version_id is distinct from question_version_id then
      raise exception 'Answer question does not belong to the response questionnaire version';
    end if;

    if new.selected_option_id is not null then
      select qo.question_id
      into selected_option_question_id
      from public."117_question_options" qo
      where qo.id = new.selected_option_id;

      if selected_option_question_id is distinct from new.question_id then
        raise exception 'Selected option does not belong to the question';
      end if;
    end if;

    return new;
  end if;

  select *
  into response_row
  from public."117_responses"
  where id = old.response_id;

  if response_row.status <> 'draft' then
    raise exception 'Answers can only be changed while the response is a draft';
  end if;

  select *
  into token_row
  from public."117_invitation_tokens"
  where id = response_row.invitation_token_id;

  if token_row.status not in ('issued', 'opened') then
    raise exception 'Invitation token is not active';
  end if;

  select *
  into assignment_row
  from public."117_webinar_questionnaire_assignments"
  where id = response_row.assignment_id;

  if assignment_row.status <> 'active' then
    raise exception 'Assignment is not active';
  end if;

  return old;
end;
$$;

create table public."117_admin_profiles" (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."117_webinars" (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz,
  ends_at timestamptz,
  timezone text not null default 'UTC',
  status text not null default 'draft' check (status in ('draft', 'published', 'completed', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create table public."117_questionnaires" (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  duplicated_from_questionnaire_id uuid references public."117_questionnaires" (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."117_questionnaire_versions" (
  id uuid primary key default gen_random_uuid(),
  questionnaire_id uuid not null references public."117_questionnaires" (id) on delete cascade,
  version_number integer not null check (version_number > 0),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  change_summary text,
  published_at timestamptz,
  published_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or published_at is not null),
  unique (questionnaire_id, version_number)
);

create table public."117_topics" (
  id uuid primary key default gen_random_uuid(),
  topic_code text not null unique,
  name text not null,
  description text,
  display_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public."117_questions" (
  id uuid primary key default gen_random_uuid(),
  questionnaire_version_id uuid not null references public."117_questionnaire_versions" (id) on delete cascade,
  topic_id uuid references public."117_topics" (id) on delete set null,
  benchmark_key text,
  prompt text not null,
  help_text text,
  question_type text not null check (
    question_type in (
      'short_text',
      'long_text',
      'single_choice',
      'multiple_choice',
      'dropdown',
      'yes_no',
      'number',
      'rating_scale',
      'date',
      'email',
      'phone_number'
    )
  ),
  required boolean not null default false,
  display_order integer not null,
  score_weight numeric(12, 4) not null default 1 check (score_weight >= 0),
  min_value numeric,
  max_value numeric,
  settings_jsonb jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (min_value is null or max_value is null or min_value <= max_value)
);

create table public."117_question_options" (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public."117_questions" (id) on delete cascade,
  option_key text not null,
  option_label text not null,
  display_order integer not null,
  score_value numeric(12, 4) not null default 0 check (score_value >= 0),
  is_default boolean not null default false,
  is_other boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (question_id, option_key),
  unique (question_id, display_order)
);

create table public."117_webinar_questionnaire_assignments" (
  id uuid primary key default gen_random_uuid(),
  webinar_id uuid not null references public."117_webinars" (id) on delete cascade,
  questionnaire_version_id uuid not null references public."117_questionnaire_versions" (id) on delete cascade,
  stage text not null check (stage in ('pre_webinar', 'post_webinar')),
  open_at timestamptz,
  close_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  display_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (webinar_id, questionnaire_version_id, stage),
  check (close_at is null or open_at is null or close_at >= open_at)
);

create table public."117_attendees" (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  organisation text,
  email_normalized text generated always as (lower(trim(email))) stored,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists "117_attendees_email_normalized_key"
  on public."117_attendees" (email_normalized);

create table public."117_invitation_tokens" (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public."117_webinar_questionnaire_assignments" (id) on delete cascade,
  attendee_id uuid not null references public."117_attendees" (id) on delete cascade,
  token_hash text not null unique,
  status text not null default 'issued' check (status in ('issued', 'opened', 'completed', 'revoked', 'expired')),
  issued_by uuid references auth.users (id) on delete set null,
  issued_at timestamptz not null default now(),
  claimed_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at is null or expires_at > issued_at)
);

create table public."117_responses" (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public."117_webinar_questionnaire_assignments" (id) on delete cascade,
  invitation_token_id uuid not null references public."117_invitation_tokens" (id) on delete cascade,
  attendee_id uuid not null references public."117_attendees" (id) on delete restrict,
  status text not null default 'draft' check (status in ('draft', 'submitted', 'locked')),
  respondent_name text not null,
  respondent_email text not null,
  respondent_phone text,
  respondent_organisation text,
  started_at timestamptz not null default now(),
  last_saved_at timestamptz,
  submitted_at timestamptz,
  locked_at timestamptz,
  completion_percent numeric(5, 2) not null default 0 check (completion_percent >= 0 and completion_percent <= 100),
  answered_count integer not null default 0 check (answered_count >= 0),
  unanswered_count integer not null default 0 check (unanswered_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invitation_token_id),
  check (locked_at is null or submitted_at is not null)
);

create table public."117_response_answers" (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references public."117_responses" (id) on delete cascade,
  question_id uuid not null references public."117_questions" (id) on delete restrict,
  selected_option_id uuid references public."117_question_options" (id) on delete set null,
  raw_value_jsonb jsonb,
  score_value numeric(12, 4),
  is_unanswered boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (response_id, question_id),
  check (is_unanswered or raw_value_jsonb is not null or selected_option_id is not null)
);

create table public."117_score_snapshots" (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('attendee', 'topic', 'webinar', 'comparison')),
  stage text not null check (stage in ('pre_webinar', 'post_webinar', 'combined')),
  webinar_id uuid references public."117_webinars" (id) on delete cascade,
  questionnaire_version_id uuid references public."117_questionnaire_versions" (id) on delete set null,
  assignment_id uuid references public."117_webinar_questionnaire_assignments" (id) on delete set null,
  topic_id uuid references public."117_topics" (id) on delete set null,
  attendee_id uuid references public."117_attendees" (id) on delete cascade,
  response_id uuid references public."117_responses" (id) on delete cascade,
  baseline_response_id uuid references public."117_responses" (id) on delete set null,
  raw_score numeric(12, 4) not null default 0,
  weighted_score numeric(12, 4) not null default 0,
  max_score numeric(12, 4) not null default 0,
  percentage_score numeric(6, 3) not null default 0 check (percentage_score >= 0 and percentage_score <= 100),
  answered_count integer not null default 0 check (answered_count >= 0),
  unanswered_count integer not null default 0 check (unanswered_count >= 0),
  delta_absolute numeric(12, 4),
  delta_percentage numeric(6, 3),
  calculated_at timestamptz not null default now(),
  check (attendee_id is not null or topic_id is not null or webinar_id is not null or response_id is not null)
);

create table public."117_audit_logs" (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  entity_table text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create trigger "117_admin_profiles_set_updated_at"
before update on public."117_admin_profiles"
for each row execute function public.set_117_updated_at();

create trigger "117_webinars_set_updated_at"
before update on public."117_webinars"
for each row execute function public.set_117_updated_at();

create trigger "117_questionnaires_set_updated_at"
before update on public."117_questionnaires"
for each row execute function public.set_117_updated_at();

create trigger "117_questionnaire_versions_set_updated_at"
before update on public."117_questionnaire_versions"
for each row execute function public.set_117_updated_at();

create trigger "117_topics_set_updated_at"
before update on public."117_topics"
for each row execute function public.set_117_updated_at();

create trigger "117_questions_set_updated_at"
before update on public."117_questions"
for each row execute function public.set_117_updated_at();

create trigger "117_question_options_set_updated_at"
before update on public."117_question_options"
for each row execute function public.set_117_updated_at();

create trigger "117_webinar_questionnaire_assignments_set_updated_at"
before update on public."117_webinar_questionnaire_assignments"
for each row execute function public.set_117_updated_at();

create trigger "117_attendees_set_updated_at"
before update on public."117_attendees"
for each row execute function public.set_117_updated_at();

create trigger "117_invitation_tokens_set_updated_at"
before update on public."117_invitation_tokens"
for each row execute function public.set_117_updated_at();

create trigger "117_responses_set_updated_at"
before update on public."117_responses"
for each row execute function public.set_117_updated_at();

create trigger "117_response_answers_set_updated_at"
before update on public."117_response_answers"
for each row execute function public.set_117_updated_at();

create trigger "117_questionnaire_versions_immutable"
before update or delete on public."117_questionnaire_versions"
for each row execute function public.prevent_117_questionnaire_version_mutation();

create trigger "117_questions_immutable"
before insert or update or delete on public."117_questions"
for each row execute function public.prevent_117_question_mutation();

create trigger "117_question_options_immutable"
before insert or update or delete on public."117_question_options"
for each row execute function public.prevent_117_question_option_mutation();

create trigger "117_assignments_require_published_versions"
before insert or update on public."117_webinar_questionnaire_assignments"
for each row execute function public.ensure_117_assignment_uses_published_version();

create trigger "117_invitation_tokens_require_active_assignment"
before insert or update on public."117_invitation_tokens"
for each row execute function public.ensure_117_invitation_token_assignment_is_active();

create trigger "117_responses_guard"
before insert or update or delete on public."117_responses"
for each row execute function public.validate_117_response_mutation();

create trigger "117_response_answers_guard"
before insert or update or delete on public."117_response_answers"
for each row execute function public.validate_117_response_answer_mutation();

create index if not exists "117_webinars_status_idx"
  on public."117_webinars" (status);

create index if not exists "117_webinars_starts_at_idx"
  on public."117_webinars" (starts_at);

create index if not exists "117_questionnaires_status_idx"
  on public."117_questionnaires" (status);

create index if not exists "117_questionnaire_versions_questionnaire_id_idx"
  on public."117_questionnaire_versions" (questionnaire_id);

create index if not exists "117_questionnaire_versions_status_idx"
  on public."117_questionnaire_versions" (status);

create index if not exists "117_topics_display_order_idx"
  on public."117_topics" (display_order);

create index if not exists "117_questions_questionnaire_version_id_display_order_idx"
  on public."117_questions" (questionnaire_version_id, display_order);

create index if not exists "117_questions_topic_id_idx"
  on public."117_questions" (topic_id);

create unique index if not exists "117_questions_version_benchmark_key_key"
  on public."117_questions" (questionnaire_version_id, benchmark_key)
  where benchmark_key is not null;

create index if not exists "117_question_options_question_id_display_order_idx"
  on public."117_question_options" (question_id, display_order);

create index if not exists "117_webinar_questionnaire_assignments_webinar_stage_idx"
  on public."117_webinar_questionnaire_assignments" (webinar_id, stage);

create index if not exists "117_webinar_questionnaire_assignments_status_idx"
  on public."117_webinar_questionnaire_assignments" (status);

create index if not exists "117_attendees_email_idx"
  on public."117_attendees" (email_normalized);

create index if not exists "117_invitation_tokens_assignment_status_idx"
  on public."117_invitation_tokens" (assignment_id, status);

create index if not exists "117_invitation_tokens_attendee_idx"
  on public."117_invitation_tokens" (attendee_id);

create index if not exists "117_responses_assignment_status_idx"
  on public."117_responses" (assignment_id, status);

create index if not exists "117_responses_attendee_idx"
  on public."117_responses" (attendee_id);

create index if not exists "117_responses_submitted_at_idx"
  on public."117_responses" (submitted_at);

create index if not exists "117_response_answers_response_id_idx"
  on public."117_response_answers" (response_id);

create index if not exists "117_response_answers_question_id_idx"
  on public."117_response_answers" (question_id);

create index if not exists "117_score_snapshots_scope_stage_idx"
  on public."117_score_snapshots" (scope, stage);

create index if not exists "117_score_snapshots_webinar_idx"
  on public."117_score_snapshots" (webinar_id);

create index if not exists "117_score_snapshots_topic_idx"
  on public."117_score_snapshots" (topic_id);

create index if not exists "117_score_snapshots_attendee_idx"
  on public."117_score_snapshots" (attendee_id);

create index if not exists "117_score_snapshots_response_idx"
  on public."117_score_snapshots" (response_id);

commit;
