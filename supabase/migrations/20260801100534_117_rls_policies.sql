begin;

create or replace function public.is_117_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public."117_admin_profiles" ap
    where ap.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_117_admin() from public;
grant execute on function public.is_117_admin() to authenticated, service_role;

do $$
begin
  execute 'revoke all privileges on table public."117_admin_profiles" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_webinars" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_questionnaires" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_questionnaire_versions" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_topics" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_questions" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_question_options" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_webinar_questionnaire_assignments" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_attendees" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_invitation_tokens" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_responses" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_response_answers" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_score_snapshots" from public, anon, authenticated, service_role';
  execute 'revoke all privileges on table public."117_audit_logs" from public, anon, authenticated, service_role';
exception
  when undefined_table then
    null;
end;
$$;

alter table public."117_admin_profiles" enable row level security;
alter table public."117_webinars" enable row level security;
alter table public."117_questionnaires" enable row level security;
alter table public."117_questionnaire_versions" enable row level security;
alter table public."117_topics" enable row level security;
alter table public."117_questions" enable row level security;
alter table public."117_question_options" enable row level security;
alter table public."117_webinar_questionnaire_assignments" enable row level security;
alter table public."117_attendees" enable row level security;
alter table public."117_invitation_tokens" enable row level security;
alter table public."117_responses" enable row level security;
alter table public."117_response_answers" enable row level security;
alter table public."117_score_snapshots" enable row level security;
alter table public."117_audit_logs" enable row level security;

grant select on table public."117_admin_profiles" to authenticated;
grant select, insert, update on table public."117_webinars" to authenticated;
grant select, insert, update on table public."117_questionnaires" to authenticated;
grant select, insert, update on table public."117_questionnaire_versions" to authenticated;
grant select, insert, update on table public."117_topics" to authenticated;
grant select, insert, update on table public."117_questions" to authenticated;
grant select, insert, update on table public."117_question_options" to authenticated;
grant select, insert, update on table public."117_webinar_questionnaire_assignments" to authenticated;
grant select on table public."117_attendees" to authenticated;
grant select, insert, update on table public."117_invitation_tokens" to authenticated;
grant select, insert, update on table public."117_responses" to authenticated;
grant select, insert, update, delete on table public."117_response_answers" to authenticated;
grant select on table public."117_score_snapshots" to authenticated;
grant select on table public."117_audit_logs" to authenticated;

grant select, insert, update, delete on table public."117_admin_profiles" to service_role;
grant select, insert, update, delete on table public."117_webinars" to service_role;
grant select, insert, update, delete on table public."117_questionnaires" to service_role;
grant select, insert, update, delete on table public."117_questionnaire_versions" to service_role;
grant select, insert, update, delete on table public."117_topics" to service_role;
grant select, insert, update, delete on table public."117_questions" to service_role;
grant select, insert, update, delete on table public."117_question_options" to service_role;
grant select, insert, update, delete on table public."117_webinar_questionnaire_assignments" to service_role;
grant select, insert, update, delete on table public."117_attendees" to service_role;
grant select, insert, update, delete on table public."117_invitation_tokens" to service_role;
grant select, insert, update, delete on table public."117_responses" to service_role;
grant select, insert, update, delete on table public."117_response_answers" to service_role;
grant select, insert, update, delete on table public."117_score_snapshots" to service_role;
grant select, insert, update, delete on table public."117_audit_logs" to service_role;

create policy "117_admin_profiles_select_own_row"
on public."117_admin_profiles"
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "117_webinars_admin_select"
on public."117_webinars"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_webinars_admin_insert"
on public."117_webinars"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_webinars_admin_update"
on public."117_webinars"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_questionnaires_admin_select"
on public."117_questionnaires"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_questionnaires_admin_insert"
on public."117_questionnaires"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_questionnaires_admin_update"
on public."117_questionnaires"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_questionnaire_versions_admin_select"
on public."117_questionnaire_versions"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_questionnaire_versions_admin_insert"
on public."117_questionnaire_versions"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_questionnaire_versions_admin_update"
on public."117_questionnaire_versions"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_topics_admin_select"
on public."117_topics"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_topics_admin_insert"
on public."117_topics"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_topics_admin_update"
on public."117_topics"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_questions_admin_select"
on public."117_questions"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_questions_admin_insert"
on public."117_questions"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_questions_admin_update"
on public."117_questions"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_question_options_admin_select"
on public."117_question_options"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_question_options_admin_insert"
on public."117_question_options"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_question_options_admin_update"
on public."117_question_options"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_assignments_admin_select"
on public."117_webinar_questionnaire_assignments"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_assignments_admin_insert"
on public."117_webinar_questionnaire_assignments"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_assignments_admin_update"
on public."117_webinar_questionnaire_assignments"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_attendees_admin_select"
on public."117_attendees"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_invitation_tokens_admin_select"
on public."117_invitation_tokens"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_invitation_tokens_admin_insert"
on public."117_invitation_tokens"
for insert
to authenticated
with check ((select public.is_117_admin()));

create policy "117_invitation_tokens_admin_update"
on public."117_invitation_tokens"
for update
to authenticated
using ((select public.is_117_admin()))
with check ((select public.is_117_admin()));

create policy "117_responses_admin_select"
on public."117_responses"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_response_answers_admin_select"
on public."117_response_answers"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_score_snapshots_admin_select"
on public."117_score_snapshots"
for select
to authenticated
using ((select public.is_117_admin()));

create policy "117_audit_logs_admin_select"
on public."117_audit_logs"
for select
to authenticated
using ((select public.is_117_admin()));

commit;
