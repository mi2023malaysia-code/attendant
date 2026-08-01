'use client';

import { useActionState } from 'react';

import {
  getFirstFieldError,
  initialMutationState,
  type MutationState,
} from '@/lib/admin/form-state';

import { upsertQuestionOptionAction } from '@/app/admin/(protected)/questionnaires/builder-actions';

export type QuestionOptionFormValues = {
  id?: string;
  question_id: string;
  option_key?: string;
  option_label?: string;
  display_order?: number;
  score_value?: number;
  is_default?: boolean;
  is_other?: boolean;
};

type QuestionOptionFormProps = {
  mode: 'create' | 'edit';
  initialValues: QuestionOptionFormValues;
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

export function QuestionOptionForm({
  mode,
  initialValues,
}: QuestionOptionFormProps) {
  const [state, formAction, pending] = useActionState(
    upsertQuestionOptionAction,
    initialMutationState,
  );

  const isCreate = mode === 'create';
  const formKey = initialValues.id ?? initialValues.question_id;
  const fieldId = (fieldName: string) => `${formKey}-${fieldName}`;

  return (
    <form action={formAction} className="space-y-4 rounded-[1.5rem] border border-white/8 bg-slate-950/40 p-4">
      <input name="question_id" type="hidden" value={initialValues.question_id} readOnly />
      {initialValues.id ? (
        <input name="id" type="hidden" value={initialValues.id} readOnly />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('option_key')}>
            Option key
          </label>
          <input
            id={fieldId('option_key')}
            name="option_key"
            type="text"
            autoComplete="off"
            defaultValue={initialValues.option_key ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="strongly_agree"
          />
          <FieldError state={state} fieldName="option_key" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('display_order')}>
            Display order
          </label>
          <input
            id={fieldId('display_order')}
            name="display_order"
            type="number"
            min={1}
            step={1}
            defaultValue={initialValues.display_order ?? 1}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />
          <FieldError state={state} fieldName="display_order" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('option_label')}>
            Option label
          </label>
          <input
            id={fieldId('option_label')}
            name="option_label"
            type="text"
            autoComplete="off"
            defaultValue={initialValues.option_label ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Strongly agree"
          />
          <FieldError state={state} fieldName="option_label" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('score_value')}>
            Score value
          </label>
          <input
            id={fieldId('score_value')}
            name="score_value"
            type="number"
            min={0}
            step="0.1"
            defaultValue={initialValues.score_value ?? 0}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />
          <FieldError state={state} fieldName="score_value" />
        </div>

        <div className="space-y-3 rounded-2xl border border-white/8 bg-white/5 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-100" htmlFor={fieldId('is_default')}>
              <input
                id={fieldId('is_default')}
                name="is_default"
                type="checkbox"
                defaultChecked={initialValues.is_default ?? false}
                className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-cyan-300 focus:ring-cyan-300/20"
              />
              Default option
            </label>
            <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-100" htmlFor={fieldId('is_other')}>
              <input
                id={fieldId('is_other')}
                name="is_other"
                type="checkbox"
                defaultChecked={initialValues.is_other ?? false}
                className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-cyan-300 focus:ring-cyan-300/20"
              />
              Other option
            </label>
          </div>
          <FieldError state={state} fieldName="is_default" />
          <FieldError state={state} fieldName="is_other" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? 'Saving option...' : isCreate ? 'Add option' : 'Save option'}
        </button>

        <p className="text-sm text-slate-400" aria-live="polite">
          {state.message ?? 'Options are attached to the draft question only.'}
        </p>
      </div>
    </form>
  );
}
