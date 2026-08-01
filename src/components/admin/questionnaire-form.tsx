'use client';

import { useActionState } from 'react';

import {
  initialMutationState,
  getFirstFieldError,
  type MutationState,
} from '@/lib/admin/form-state';

import { upsertQuestionnaireAction } from '@/app/admin/(protected)/questionnaires/actions';

type QuestionnaireFormValues = {
  id?: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  status?: 'draft' | 'published' | 'archived';
};

type QuestionnaireFormProps = {
  mode: 'create' | 'edit';
  initialValues?: QuestionnaireFormValues;
};

function FieldError({
  state,
  fieldName,
}: {
  state: MutationState;
  fieldName: string;
}) {
  const error = getFirstFieldError(state, fieldName);

  if (!error) {
    return null;
  }

  return (
    <p className="text-sm text-rose-200" role="alert">
      {error}
    </p>
  );
}

export function QuestionnaireForm({
  mode,
  initialValues,
}: QuestionnaireFormProps) {
  const [state, formAction, pending] = useActionState(
    upsertQuestionnaireAction,
    initialMutationState,
  );

  const isCreate = mode === 'create';
  const title = initialValues?.title ?? '';
  const slug = initialValues?.slug ?? '';
  const description = initialValues?.description ?? '';
  const status = initialValues?.status ?? 'draft';

  return (
    <form action={formAction} className="space-y-5">
      {initialValues?.id ? (
        <input name="id" type="hidden" value={initialValues.id} readOnly />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="title">
            Questionnaire title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            autoComplete="off"
            defaultValue={title}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Post-webinar assessment"
          />
          <FieldError state={state} fieldName="title" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="slug">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            autoComplete="off"
            defaultValue={slug}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="post-webinar-assessment"
          />
          <p className="text-xs leading-6 text-slate-400">
            Leave this blank to generate a slug from the title.
          </p>
          <FieldError state={state} fieldName="slug" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label
            className="text-sm font-medium text-slate-100"
            htmlFor="description"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={description}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Describe what this questionnaire is measuring."
          />
          <FieldError state={state} fieldName="description" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={status}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <FieldError state={state} fieldName="status" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending
            ? 'Saving questionnaire...'
            : isCreate
              ? 'Create questionnaire'
              : 'Save questionnaire'}
        </button>

        <p className="text-sm text-slate-400" aria-live="polite">
          {state.message ??
            'Questionnaire changes are stored through Supabase on the server.'}
        </p>
      </div>
    </form>
  );
}
