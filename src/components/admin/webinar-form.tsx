'use client';

import { useActionState } from 'react';

import {
  initialMutationState,
  getFirstFieldError,
  type MutationState,
} from '@/lib/admin/form-state';
import { toDateTimeLocalValue } from '@/lib/admin/datetime';

import { upsertWebinarAction } from '@/app/admin/(protected)/webinars/actions';

export type WebinarAction = (
  previousState: MutationState,
  formData: FormData,
) => Promise<MutationState>;

type WebinarFormValues = {
  id?: string;
  title?: string | null;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  timezone?: string | null;
  status?: 'draft' | 'published' | 'completed' | 'archived';
};

type WebinarFormProps = {
  mode: 'create' | 'edit';
  initialValues?: WebinarFormValues;
  action?: WebinarAction;
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

export function WebinarForm({
  mode,
  initialValues,
  action,
}: WebinarFormProps) {
  const resolvedAction = action ?? upsertWebinarAction;
  const [state, formAction, pending] = useActionState(
    resolvedAction,
    initialMutationState,
  );

  const isCreate = mode === 'create';
  const title = initialValues?.title ?? '';
  const description = initialValues?.description ?? '';
  const startsAt = toDateTimeLocalValue(initialValues?.starts_at ?? null);
  const endsAt = toDateTimeLocalValue(initialValues?.ends_at ?? null);
  const timezone = initialValues?.timezone ?? 'UTC';
  const status = initialValues?.status ?? 'draft';

  return (
    <form action={formAction} className="space-y-5">
      {initialValues?.id ? (
        <input name="id" type="hidden" value={initialValues.id} readOnly />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="title">
            Webinar title
          </label>
          <input
            id="title"
            name="title"
            type="text"
            autoComplete="off"
            defaultValue={title}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Q3 Compliance Training"
          />
          <FieldError state={state} fieldName="title" />
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
            placeholder="Summarise the webinar purpose and audience."
          />
          <FieldError state={state} fieldName="description" />
        </div>

        <div className="space-y-2">
          <label
            className="text-sm font-medium text-slate-100"
            htmlFor="starts_at"
          >
            Starts at
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={startsAt}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />
          <FieldError state={state} fieldName="starts_at" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="ends_at">
            Ends at
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            defaultValue={endsAt}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />
          <FieldError state={state} fieldName="ends_at" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor="timezone">
            Timezone
          </label>
          <input
            id="timezone"
            name="timezone"
            type="text"
            defaultValue={timezone}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="UTC"
          />
          <FieldError state={state} fieldName="timezone" />
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
            <option value="completed">Completed</option>
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
            ? 'Saving webinar...'
            : isCreate
              ? 'Create webinar'
              : 'Save webinar'}
        </button>

        <p className="text-sm text-slate-400" aria-live="polite">
          {state.message ?? 'Changes are stored through Supabase on the server.'}
        </p>
      </div>
    </form>
  );
}
