'use client';

import { useActionState } from 'react';

import {
  getFirstFieldError,
  initialMutationState,
  type MutationState,
} from '@/lib/admin/form-state';
import { QUESTION_TYPES, type QuestionType } from '@/lib/admin/question-types';
import type { TopicRecord } from '@/lib/admin/topics';

import { upsertQuestionAction } from '@/app/admin/(protected)/questionnaires/builder-actions';

const questionTypeLabels: Record<QuestionType, string> = {
  short_text: 'Short text',
  long_text: 'Long text',
  single_choice: 'Single choice',
  multiple_choice: 'Multiple choice',
  dropdown: 'Dropdown',
  yes_no: 'Yes or no',
  number: 'Number',
  rating_scale: 'Rating scale',
  date: 'Date',
  email: 'Email',
  phone_number: 'Phone number',
};

export type QuestionFormValues = {
  id?: string;
  questionnaire_version_id: string;
  topic_id?: string | null;
  benchmark_key?: string | null;
  prompt?: string | null;
  help_text?: string | null;
  question_type?: QuestionType;
  required?: boolean;
  display_order?: number;
  score_weight?: number;
  min_value?: number | null;
  max_value?: number | null;
};

type QuestionFormProps = {
  mode: 'create' | 'edit';
  topics: TopicRecord[];
  initialValues: QuestionFormValues;
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

export function QuestionForm({ mode, topics, initialValues }: QuestionFormProps) {
  const [state, formAction, pending] = useActionState(
    upsertQuestionAction,
    initialMutationState,
  );

  const isCreate = mode === 'create';
  const formKey = initialValues.id ?? initialValues.questionnaire_version_id;
  const fieldId = (fieldName: string) => `${formKey}-${fieldName}`;

  return (
    <form action={formAction} className="space-y-5">
      <input
        name="questionnaire_version_id"
        type="hidden"
        value={initialValues.questionnaire_version_id}
        readOnly
      />
      {initialValues.id ? (
        <input name="id" type="hidden" value={initialValues.id} readOnly />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('prompt')}>
            Question text
          </label>
          <textarea
            id={fieldId('prompt')}
            name="prompt"
            rows={3}
            defaultValue={initialValues.prompt ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="What do attendees already know about this topic?"
          />
          <FieldError state={state} fieldName="prompt" />
        </div>

        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('help_text')}>
            Help text
          </label>
          <textarea
            id={fieldId('help_text')}
            name="help_text"
            rows={2}
            defaultValue={initialValues.help_text ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Optional guidance shown to the attendee."
          />
          <FieldError state={state} fieldName="help_text" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('question_type')}>
            Question type
          </label>
          <select
            id={fieldId('question_type')}
            name="question_type"
            defaultValue={initialValues.question_type ?? 'short_text'}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          >
            {QUESTION_TYPES.map((questionType) => (
              <option key={questionType} value={questionType}>
                {questionTypeLabels[questionType]}
              </option>
            ))}
          </select>
          <FieldError state={state} fieldName="question_type" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('topic_id')}>
            Knowledge topic
          </label>
          <select
            id={fieldId('topic_id')}
            name="topic_id"
            defaultValue={initialValues.topic_id ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          >
            <option value="">No topic</option>
            {topics.map((topic) => (
              <option key={topic.id} value={topic.id}>
                {topic.name}
              </option>
            ))}
          </select>
          <FieldError state={state} fieldName="topic_id" />
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

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('score_weight')}>
            Score weight
          </label>
          <input
            id={fieldId('score_weight')}
            name="score_weight"
            type="number"
            min={0}
            step="0.1"
            defaultValue={initialValues.score_weight ?? 1}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          />
          <FieldError state={state} fieldName="score_weight" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('benchmark_key')}>
            Benchmark key
          </label>
          <input
            id={fieldId('benchmark_key')}
            name="benchmark_key"
            type="text"
            autoComplete="off"
            defaultValue={initialValues.benchmark_key ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="baseline-topic-1"
          />
          <p className="text-xs leading-6 text-slate-400">
            Use the same key to compare equivalent pre-webinar and post-webinar questions.
          </p>
          <FieldError state={state} fieldName="benchmark_key" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('min_value')}>
            Minimum value
          </label>
          <input
            id={fieldId('min_value')}
            name="min_value"
            type="number"
            step="0.1"
            defaultValue={initialValues.min_value ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Optional"
          />
          <FieldError state={state} fieldName="min_value" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('max_value')}>
            Maximum value
          </label>
          <input
            id={fieldId('max_value')}
            name="max_value"
            type="number"
            step="0.1"
            defaultValue={initialValues.max_value ?? ''}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="Optional"
          />
          <FieldError state={state} fieldName="max_value" />
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 md:col-span-2">
          <input
            id={fieldId('required')}
            name="required"
            type="checkbox"
            defaultChecked={initialValues.required ?? false}
            className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-cyan-300 focus:ring-cyan-300/20"
          />
          <label className="text-sm font-medium text-slate-100" htmlFor={fieldId('required')}>
            Required question
          </label>
          <FieldError state={state} fieldName="required" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending
            ? 'Saving question...'
            : isCreate
              ? 'Add question'
              : 'Save question'}
        </button>

        <p className="text-sm text-slate-400" aria-live="polite">
          {state.message ?? 'Questions are stored directly in the draft version.'}
        </p>
      </div>
    </form>
  );
}
