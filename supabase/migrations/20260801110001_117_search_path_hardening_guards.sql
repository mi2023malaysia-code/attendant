begin;

create or replace function public.prevent_117_question_mutation()
returns trigger
language plpgsql
set search_path = public
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
set search_path = public
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

create or replace function public.validate_117_response_mutation()
returns trigger
language plpgsql
set search_path = public
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
set search_path = public
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

commit;
