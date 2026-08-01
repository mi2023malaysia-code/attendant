'use client';

import { useActionState } from 'react';

import {
  getFirstFieldError,
  initialMutationState,
  type MutationState,
} from '@/lib/admin/form-state';
import type { QuestionWithOptions } from '@/lib/admin/questions';
import type {
  AttendeeQuestionnaireContext,
  AssignmentRecord,
  InvitationTokenRecord,
} from '@/lib/attendee/questionnaire';

import { saveAttendeeQuestionnaireAction } from '@/app/attendee/[token]/actions';

type AttendeeQuestionnaireFormProps = {
  context: AttendeeQuestionnaireContext;
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

function formatStage(stage: AssignmentRecord['stage']) {
  return stage === 'pre_webinar' ? 'Pre-webinar' : 'Post-webinar';
}

function formatTokenStatus(status: InvitationTokenRecord['status']) {
  if (status === 'issued') {
    return 'Issued';
  }

  if (status === 'opened') {
    return 'Opened';
  }

  if (status === 'completed') {
    return 'Completed';
  }

  if (status === 'expired') {
    return 'Expired';
  }

  return 'Revoked';
}

function getAnswerByQuestionId(context: AttendeeQuestionnaireContext) {
  return new Map(context.responseAnswers.map((answer) => [answer.question_id, answer]));
}

function getAnswerObject(answer: unknown) {
  if (!answer || typeof answer !== 'object') {
    return null;
  }

  return answer as Record<string, unknown>;
}

function getRawSelectedOptionId(answer: Record<string, unknown> | null) {
  if (!answer) {
    return null;
  }

  const selectedOptionId = answer.selected_option_id;
  if (typeof selectedOptionId === 'string') {
    return selectedOptionId;
  }

  const optionId = answer.option_id;
  if (typeof optionId === 'string') {
    return optionId;
  }

  return null;
}

function getQuestionDefaultValue(question: QuestionWithOptions, answer: unknown) {
  const parsedAnswer = getAnswerObject(answer);

  if (!parsedAnswer) {
    return '';
  }

  if (question.question_type === 'multiple_choice') {
    const selectedOptionIds = parsedAnswer.selected_option_ids;

    return Array.isArray(selectedOptionIds) ? selectedOptionIds.map(String) : [];
  }

  if (
    question.question_type === 'single_choice' ||
    question.question_type === 'dropdown' ||
    question.question_type === 'yes_no'
  ) {
    const selectedOptionId = getRawSelectedOptionId(parsedAnswer);

    if (selectedOptionId) {
      return selectedOptionId;
    }

    const value = parsedAnswer.value;
    return typeof value === 'string' ? value : '';
  }

  const value = parsedAnswer.value;
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }

  return '';
}

function getSubmittedAnswerSummary(question: QuestionWithOptions, answer: unknown) {
  const parsedAnswer = getAnswerObject(answer);

  if (!parsedAnswer) {
    return 'Not answered';
  }

  if (question.question_type === 'multiple_choice') {
    const selectedOptionIds = Array.isArray(parsedAnswer.selected_option_ids)
      ? parsedAnswer.selected_option_ids.map(String)
      : [];

    if (selectedOptionIds.length === 0) {
      return 'Not answered';
    }

    const labels = selectedOptionIds
      .map((optionId) => question.options.find((option) => option.id === optionId)?.option_label)
      .filter((label): label is string => Boolean(label));

    return labels.length > 0 ? labels.join(', ') : selectedOptionIds.join(', ');
  }

  if (question.question_type === 'single_choice' || question.question_type === 'dropdown') {
    const selectedOptionId = getRawSelectedOptionId(parsedAnswer);
    if (typeof selectedOptionId === 'string') {
      return (
        question.options.find((option) => option.id === selectedOptionId)?.option_label ??
        selectedOptionId
      );
    }
  }

  if (question.question_type === 'yes_no') {
    const value = parsedAnswer.value;
    if (typeof value === 'string') {
      const option = question.options.find((entry) => entry.id === value);
      if (option) {
        return option.option_label;
      }

      return value;
    }

    const selectedOptionId = getRawSelectedOptionId(parsedAnswer);
    if (typeof selectedOptionId === 'string') {
      return (
        question.options.find((option) => option.id === selectedOptionId)?.option_label ??
        selectedOptionId
      );
    }
  }

  const value = parsedAnswer.value;
  if (typeof value === 'number' || typeof value === 'string') {
    return String(value);
  }

  return 'Not answered';
}

function QuestionField({
  question,
  defaultValue,
  fieldError,
}: {
  question: QuestionWithOptions;
  defaultValue: string | string[];
  fieldError: string | null;
}) {
  const inputId = `question-${question.id}`;
  const helpId = question.help_text ? `${inputId}-help` : undefined;

  const baseInputClass =
    'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20';

  return (
    <fieldset className="space-y-3 rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
      <legend className="flex flex-wrap items-center gap-3 text-base font-semibold tracking-[-0.03em] text-white">
        <span>{question.prompt}</span>
        {question.required ? (
          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-cyan-100">
            Required
          </span>
        ) : null}
      </legend>
      {question.help_text ? (
        <p id={helpId} className="text-sm leading-7 text-slate-300">
          {question.help_text}
        </p>
      ) : null}

      {question.question_type === 'long_text' ? (
        <textarea
          id={inputId}
          name={question.id}
          rows={4}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      ) : question.question_type === 'single_choice' ||
        question.question_type === 'dropdown' ||
        question.question_type === 'yes_no' ? (
        <select
          id={inputId}
          name={question.id}
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        >
          <option value="">Select an option</option>
          {question.question_type === 'yes_no' && question.options.length === 0 ? (
            <>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </>
          ) : (
            question.options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.option_label}
              </option>
            ))
          )}
        </select>
      ) : question.question_type === 'multiple_choice' ? (
        <div className="space-y-3">
          {question.options.length === 0 ? (
            <p className="text-sm leading-7 text-slate-400">
              No answer options have been configured for this question yet.
            </p>
          ) : (
            question.options.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-slate-950/40 px-4 py-3 text-sm text-slate-200"
              >
                <input
                  type="checkbox"
                  name={question.id}
                  value={option.id}
                  defaultChecked={Array.isArray(defaultValue) && defaultValue.includes(option.id)}
                  className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-cyan-300 focus:ring-cyan-300/20"
                />
                <span>{option.option_label}</span>
              </label>
            ))
          )}
        </div>
      ) : question.question_type === 'number' || question.question_type === 'rating_scale' ? (
        <input
          id={inputId}
          name={question.id}
          type="number"
          min={question.min_value ?? undefined}
          max={question.max_value ?? undefined}
          step="any"
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      ) : question.question_type === 'date' ? (
        <input
          id={inputId}
          name={question.id}
          type="date"
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      ) : question.question_type === 'email' ? (
        <input
          id={inputId}
          name={question.id}
          type="email"
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      ) : question.question_type === 'phone_number' ? (
        <input
          id={inputId}
          name={question.id}
          type="tel"
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      ) : (
        <input
          id={inputId}
          name={question.id}
          type="text"
          defaultValue={typeof defaultValue === 'string' ? defaultValue : ''}
          aria-describedby={helpId}
          className={baseInputClass}
        />
      )}

      {fieldError ? (
        <p className="text-sm text-rose-200" role="alert">
          {fieldError}
        </p>
      ) : null}
    </fieldset>
  );
}

function SubmittedAnswerCard({
  question,
  answer,
}: {
  question: QuestionWithOptions;
  answer: unknown;
}) {
  const summary = getSubmittedAnswerSummary(question, answer);

  return (
    <article className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
      <h3 className="text-base font-semibold tracking-[-0.03em] text-white">
        {question.prompt}
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-300">{summary}</p>
    </article>
  );
}

export function AttendeeQuestionnaireForm({ context }: AttendeeQuestionnaireFormProps) {
  const [state, formAction, pending] = useActionState(
    saveAttendeeQuestionnaireAction,
    initialMutationState,
  );
  const answerByQuestionId = getAnswerByQuestionId(context);
  const isSubmitted = context.response?.status === 'submitted' || context.response?.status === 'locked';
  const savedName = context.response?.respondent_name ?? context.attendee.full_name ?? '';
  const savedEmail = context.response?.respondent_email ?? context.attendee.email ?? '';
  const savedPhone = context.response?.respondent_phone ?? context.attendee.phone ?? '';
  const savedOrganisation =
    context.response?.respondent_organisation ?? context.attendee.organisation ?? '';
  const completionPercent = context.response?.completion_percent ?? 0;
  const answeredCount = context.response?.answered_count ?? 0;
  const unansweredCount = context.response?.unanswered_count ?? context.questions.length;

  if (isSubmitted) {
    return (
      <section className="space-y-6">
        <article className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-100/70">
            Submission complete
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            Your questionnaire has been submitted.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-emerald-50/80">
            This response is now locked. The server stored the submission, the
            invitation token is marked complete, and the attendee summary can
            now feed reporting and score snapshots.
          </p>
        </article>

        <section className="grid gap-4 md:grid-cols-3">
          <article className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completion</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
              {completionPercent.toFixed(2)}%
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Answered</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
              {answeredCount}
            </p>
          </article>
          <article className="rounded-[1.5rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unanswered</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
              {unansweredCount}
            </p>
          </article>
        </section>

        <section className="space-y-4 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
                Submitted responses
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                Review what was stored for this invitation token.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              {formatTokenStatus(context.invitationToken.status)}
            </div>
          </div>

          <dl className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Name</dt>
              <dd className="mt-1">{savedName}</dd>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Email</dt>
              <dd className="mt-1 break-all">{savedEmail}</dd>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Phone</dt>
              <dd className="mt-1">{savedPhone || 'Not set'}</dd>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">Organisation</dt>
              <dd className="mt-1">{savedOrganisation || 'Not set'}</dd>
            </div>
          </dl>

          <div className="grid gap-4">
            {context.questions.map((question) => (
              <SubmittedAnswerCard
                key={question.id}
                question={question}
                answer={answerByQuestionId.get(question.id)?.raw_value_jsonb ?? null}
              />
            ))}
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-6 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Attendee questionnaire
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {context.questionnaire.title}
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
            Complete the generated questions for the {formatStage(context.assignment.stage)} stage.
            Save a draft at any time or submit when the answers are ready.
          </p>
        </div>

        <div className="grid gap-2 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-300">
          <div>
            Webinar: <span className="text-slate-100">{context.webinar.title}</span>
          </div>
          <div>
            Version: <span className="text-slate-100">v{context.questionnaireVersion.version_number}</span>
          </div>
          <div>
            Token: <span className="font-mono text-slate-100">{context.tokenPreview}</span>
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Completion</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {completionPercent.toFixed(2)}%
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Answered</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {answeredCount}
          </p>
        </article>
        <article className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Unanswered</p>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
            {unansweredCount}
          </p>
        </article>
      </section>

      <form action={formAction} className="space-y-6">
        <input name="token" type="hidden" value={context.rawToken} readOnly />

        <section className="space-y-4 rounded-[1.75rem] border border-white/10 bg-slate-950/40 p-5">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              Attendee details
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Confirm your details before answering
            </h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-100" htmlFor="respondent_name">
                Full name
              </label>
              <input
                id="respondent_name"
                name="respondent_name"
                type="text"
                defaultValue={savedName}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              />
              <FieldError state={state} fieldName="respondent_name" />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-slate-100" htmlFor="respondent_email">
                Email address
              </label>
              <input
                id="respondent_email"
                name="respondent_email"
                type="email"
                defaultValue={savedEmail}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              />
              <FieldError state={state} fieldName="respondent_email" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-100" htmlFor="respondent_phone">
                Phone number
              </label>
              <input
                id="respondent_phone"
                name="respondent_phone"
                type="tel"
                defaultValue={savedPhone}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              />
              <FieldError state={state} fieldName="respondent_phone" />
            </div>

            <div className="space-y-2">
              <label
                className="text-sm font-medium text-slate-100"
                htmlFor="respondent_organisation"
              >
                Organisation
              </label>
              <input
                id="respondent_organisation"
                name="respondent_organisation"
                type="text"
                defaultValue={savedOrganisation}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
              />
              <FieldError state={state} fieldName="respondent_organisation" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              Questionnaire
            </p>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Answer the generated questions
            </h3>
          </div>

          <div className="space-y-4">
            {context.questions.map((question) => {
              const answer = answerByQuestionId.get(question.id)?.raw_value_jsonb ?? null;
              const defaultValue = getQuestionDefaultValue(question, answer);
              const questionFieldError = getFirstFieldError(state, question.id);

              return (
                <QuestionField
                  key={question.id}
                  question={question}
                  defaultValue={defaultValue}
                  fieldError={questionFieldError}
                />
              );
            })}
          </div>
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="save_draft"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? 'Saving draft...' : 'Save draft'}
          </button>
          <button
            type="submit"
            name="intent"
            value="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? 'Submitting...' : 'Submit response'}
          </button>
          <p className="text-sm text-slate-400" aria-live="polite">
            {state.message ??
              'Draft saves stay editable. Final submission locks the response and completes the token.'}
          </p>
        </div>

        <FieldError state={state} fieldName="_form" />
      </form>
    </section>
  );
}
