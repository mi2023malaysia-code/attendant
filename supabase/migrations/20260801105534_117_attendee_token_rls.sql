begin;

create or replace function public.current_117_claim_uuid(claim_name text)
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> claim_name, '')::uuid
$$;

create or replace function public.current_117_invitation_token_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('invitation_token_id')
$$;

create or replace function public.current_117_attendee_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('attendee_id')
$$;

create or replace function public.current_117_assignment_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('assignment_id')
$$;

create or replace function public.current_117_questionnaire_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('questionnaire_id')
$$;

create or replace function public.current_117_questionnaire_version_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('questionnaire_version_id')
$$;

create or replace function public.current_117_webinar_id()
returns uuid
language sql
stable
as $$
  select public.current_117_claim_uuid('webinar_id')
$$;

create or replace function public.attendee_117_context_valid(allowed_statuses text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public."117_invitation_tokens" t
    join public."117_webinar_questionnaire_assignments" a
      on a.id = t.assignment_id
    join public."117_questionnaire_versions" qv
      on qv.id = a.questionnaire_version_id
    join public."117_questionnaires" q
      on q.id = qv.questionnaire_id
    join public."117_webinars" w
      on w.id = a.webinar_id
    where t.id = (select public.current_117_invitation_token_id())
      and t.attendee_id = (select public.current_117_attendee_id())
      and t.assignment_id = (select public.current_117_assignment_id())
      and q.id = (select public.current_117_questionnaire_id())
      and qv.id = (select public.current_117_questionnaire_version_id())
      and w.id = (select public.current_117_webinar_id())
      and t.status = any (allowed_statuses)
      and t.revoked_at is null
      and (t.expires_at is null or t.expires_at > now())
      and a.status = 'active'
      and q.status = 'published'
      and qv.status = 'published'
      and w.status in ('published', 'completed')
  );
$$;

create or replace function public.attendee_117_access_valid()
returns boolean
language sql
stable
as $$
  select public.attendee_117_context_valid(array['issued', 'opened', 'completed']::text[])
$$;

create or replace function public.attendee_117_write_access_valid()
returns boolean
language sql
stable
as $$
  select public.attendee_117_context_valid(array['issued', 'opened']::text[])
$$;

revoke all on function public.attendee_117_context_valid(text[]) from public;
revoke all on function public.current_117_claim_uuid(text) from public;
revoke all on function public.current_117_invitation_token_id() from public;
revoke all on function public.current_117_attendee_id() from public;
revoke all on function public.current_117_assignment_id() from public;
revoke all on function public.current_117_questionnaire_id() from public;
revoke all on function public.current_117_questionnaire_version_id() from public;
revoke all on function public.current_117_webinar_id() from public;
revoke all on function public.attendee_117_access_valid() from public;
revoke all on function public.attendee_117_write_access_valid() from public;

grant execute on function public.attendee_117_context_valid(text[]) to authenticated, service_role;
grant execute on function public.current_117_claim_uuid(text) to authenticated, service_role;
grant execute on function public.current_117_invitation_token_id() to authenticated, service_role;
grant execute on function public.current_117_attendee_id() to authenticated, service_role;
grant execute on function public.current_117_assignment_id() to authenticated, service_role;
grant execute on function public.current_117_questionnaire_id() to authenticated, service_role;
grant execute on function public.current_117_questionnaire_version_id() to authenticated, service_role;
grant execute on function public.current_117_webinar_id() to authenticated, service_role;
grant execute on function public.attendee_117_access_valid() to authenticated, service_role;
grant execute on function public.attendee_117_write_access_valid() to authenticated, service_role;

create policy "117_webinars_attendee_select_assigned"
on public."117_webinars"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_webinar_id())
);

create policy "117_questionnaires_attendee_select_assigned"
on public."117_questionnaires"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_questionnaire_id())
);

create policy "117_questionnaire_versions_attendee_select_assigned"
on public."117_questionnaire_versions"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_questionnaire_version_id())
);

create policy "117_topics_attendee_select_assigned"
on public."117_topics"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and exists (
    select 1
    from public."117_questions" q
    where q.topic_id = id
      and q.questionnaire_version_id = (select public.current_117_questionnaire_version_id())
  )
);

create policy "117_questions_attendee_select_assigned"
on public."117_questions"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and questionnaire_version_id = (select public.current_117_questionnaire_version_id())
);

create policy "117_question_options_attendee_select_assigned"
on public."117_question_options"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and exists (
    select 1
    from public."117_questions" q
    where q.id = question_id
      and q.questionnaire_version_id = (select public.current_117_questionnaire_version_id())
  )
);

create policy "117_assignments_attendee_select_assigned"
on public."117_webinar_questionnaire_assignments"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_assignment_id())
);

create policy "117_invitation_tokens_attendee_select_own_token"
on public."117_invitation_tokens"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_invitation_token_id())
  and attendee_id = (select public.current_117_attendee_id())
  and assignment_id = (select public.current_117_assignment_id())
  and status in ('issued', 'opened', 'completed')
  and revoked_at is null
  and (expires_at is null or expires_at > now())
);

create policy "117_attendees_attendee_select_own_row"
on public."117_attendees"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and id = (select public.current_117_attendee_id())
);

create policy "117_responses_attendee_select_own_row"
on public."117_responses"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and invitation_token_id = (select public.current_117_invitation_token_id())
  and attendee_id = (select public.current_117_attendee_id())
  and assignment_id = (select public.current_117_assignment_id())
);

create policy "117_responses_attendee_insert_draft"
on public."117_responses"
for insert
to authenticated
with check (
  (select public.attendee_117_write_access_valid())
  and invitation_token_id = (select public.current_117_invitation_token_id())
  and attendee_id = (select public.current_117_attendee_id())
  and assignment_id = (select public.current_117_assignment_id())
  and status = 'draft'
);

create policy "117_responses_attendee_update_own_draft"
on public."117_responses"
for update
to authenticated
using (
  (select public.attendee_117_write_access_valid())
  and invitation_token_id = (select public.current_117_invitation_token_id())
  and attendee_id = (select public.current_117_attendee_id())
  and assignment_id = (select public.current_117_assignment_id())
  and status = 'draft'
)
with check (
  (select public.attendee_117_write_access_valid())
  and invitation_token_id = (select public.current_117_invitation_token_id())
  and attendee_id = (select public.current_117_attendee_id())
  and assignment_id = (select public.current_117_assignment_id())
  and status in ('draft', 'submitted')
);

create policy "117_response_answers_attendee_select_own_rows"
on public."117_response_answers"
for select
to authenticated
using (
  exists (
    select 1
    from public."117_responses" r
    where r.id = response_id
      and r.invitation_token_id = (select public.current_117_invitation_token_id())
      and r.attendee_id = (select public.current_117_attendee_id())
      and r.assignment_id = (select public.current_117_assignment_id())
  )
);

create policy "117_response_answers_attendee_insert_draft"
on public."117_response_answers"
for insert
to authenticated
with check (
  (select public.attendee_117_write_access_valid())
  and exists (
    select 1
    from public."117_responses" r
    where r.id = response_id
      and r.invitation_token_id = (select public.current_117_invitation_token_id())
      and r.attendee_id = (select public.current_117_attendee_id())
      and r.assignment_id = (select public.current_117_assignment_id())
      and r.status = 'draft'
  )
);

create policy "117_response_answers_attendee_update_draft"
on public."117_response_answers"
for update
to authenticated
using (
  (select public.attendee_117_write_access_valid())
  and exists (
    select 1
    from public."117_responses" r
    where r.id = response_id
      and r.invitation_token_id = (select public.current_117_invitation_token_id())
      and r.attendee_id = (select public.current_117_attendee_id())
      and r.assignment_id = (select public.current_117_assignment_id())
      and r.status = 'draft'
  )
)
with check (
  (select public.attendee_117_write_access_valid())
  and exists (
    select 1
    from public."117_responses" r
    where r.id = response_id
      and r.invitation_token_id = (select public.current_117_invitation_token_id())
      and r.attendee_id = (select public.current_117_attendee_id())
      and r.assignment_id = (select public.current_117_assignment_id())
      and r.status = 'draft'
  )
);

create policy "117_response_answers_attendee_delete_draft"
on public."117_response_answers"
for delete
to authenticated
using (
  (select public.attendee_117_write_access_valid())
  and exists (
    select 1
    from public."117_responses" r
    where r.id = response_id
      and r.invitation_token_id = (select public.current_117_invitation_token_id())
      and r.attendee_id = (select public.current_117_attendee_id())
      and r.assignment_id = (select public.current_117_assignment_id())
      and r.status = 'draft'
  )
);

create policy "117_score_snapshots_attendee_select_own_rows"
on public."117_score_snapshots"
for select
to authenticated
using (
  (select public.attendee_117_access_valid())
  and attendee_id = (select public.current_117_attendee_id())
);

commit;
