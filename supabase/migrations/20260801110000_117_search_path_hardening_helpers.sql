begin;

create or replace function public.set_117_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.prevent_117_questionnaire_version_mutation()
returns trigger
language plpgsql
set search_path = public
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

create or replace function public.ensure_117_assignment_uses_published_version()
returns trigger
language plpgsql
set search_path = public
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
set search_path = public
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

commit;
