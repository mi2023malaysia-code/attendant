import { formatDateTime } from '@/lib/admin/datetime';
import type { QuestionWithOptions } from '@/lib/admin/questions';
import type { TopicRecord } from '@/lib/admin/topics';

import { QuestionForm } from '@/components/admin/question-form';
import { QuestionOptionForm } from '@/components/admin/question-option-form';

type QuestionBuilderProps = {
  questionnaireVersionId: string;
  questionnaireId: string;
  topics: TopicRecord[];
  questions: QuestionWithOptions[];
};

function QuestionTypeBadge({ value }: { value: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-200">
      {value.replace(/_/g, ' ')}
    </span>
  );
}

export function QuestionBuilder({
  questionnaireVersionId,
  questionnaireId,
  topics,
  questions,
}: QuestionBuilderProps) {
  return (
    <section className="space-y-6 rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Question builder
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
            Build questions for the draft version.
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-300">
            Add ordered questions, assign topics, configure scoring and attach
            answer options directly to the questionnaire version stored in
            Supabase.
          </p>
        </div>
        <div className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm text-slate-300">
          Questionnaire ID: <span className="font-mono text-slate-100">{questionnaireId}</span>
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
        <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
          Add a question
        </h3>
        <p className="mt-1 text-sm leading-7 text-slate-400">
          New questions are added to questionnaire version {questionnaireVersionId}.
        </p>
        <div className="mt-5">
          <QuestionForm
            mode="create"
            topics={topics}
            initialValues={{
              questionnaire_version_id: questionnaireVersionId,
              display_order: questions.length + 1,
              score_weight: 1,
              question_type: 'short_text',
              required: false,
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Questions
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {questions.length} question{questions.length === 1 ? '' : 's'} loaded from
              the draft version.
            </p>
          </div>
        </div>

        {questions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
            No questions have been added yet. Use the builder above to create the
            first draft question and start attaching options.
          </div>
        ) : (
          <div className="space-y-4">
            {questions.map((question) => {
              const topic = topics.find((entry) => entry.id === question.topic_id);

              return (
                <article
                  key={question.id}
                  className="rounded-[1.75rem] border border-white/8 bg-white/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-lg font-semibold tracking-[-0.03em] text-white">
                          {question.prompt}
                        </h4>
                        <QuestionTypeBadge value={question.question_type} />
                      </div>
                      <p className="max-w-3xl text-sm leading-7 text-slate-300">
                        {question.help_text ?? 'No help text provided.'}
                      </p>
                      <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Topic
                          </dt>
                          <dd className="mt-1">{topic?.name ?? 'No topic'}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Order
                          </dt>
                          <dd className="mt-1">{question.display_order}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Score weight
                          </dt>
                          <dd className="mt-1">{question.score_weight}</dd>
                        </div>
                        <div>
                          <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                            Updated
                          </dt>
                          <dd className="mt-1">{formatDateTime(question.updated_at)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-white/8 bg-slate-950/40 p-4">
                    <h5 className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                      Edit question
                    </h5>
                    <div className="mt-4">
                      <QuestionForm
                        mode="edit"
                        topics={topics}
                        initialValues={{
                          id: question.id,
                          questionnaire_version_id: question.questionnaire_version_id,
                          topic_id: question.topic_id,
                          benchmark_key: question.benchmark_key,
                          prompt: question.prompt,
                          help_text: question.help_text,
                          question_type: question.question_type,
                          required: question.required,
                          display_order: question.display_order,
                          score_weight: question.score_weight,
                          min_value: question.min_value,
                          max_value: question.max_value,
                        }}
                      />
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h5 className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200/70">
                        Answer options
                      </h5>
                      <span className="text-sm text-slate-400">
                        {question.options.length} option{question.options.length === 1 ? '' : 's'}
                      </span>
                    </div>

                    {question.options.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-4 text-sm leading-7 text-slate-300">
                        This question has no answer options yet. Add one if it uses
                        a choice-based type.
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {question.options.map((option) => (
                          <QuestionOptionForm
                            key={option.id}
                            mode="edit"
                            initialValues={{
                              id: option.id,
                              question_id: option.question_id,
                              option_key: option.option_key,
                              option_label: option.option_label,
                              display_order: option.display_order,
                              score_value: option.score_value,
                              is_default: option.is_default,
                              is_other: option.is_other,
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <div className="rounded-[1.5rem] border border-white/8 bg-slate-950/40 p-4">
                      <h6 className="text-sm font-semibold text-white">Add an option</h6>
                      <div className="mt-4">
                        <QuestionOptionForm
                          mode="create"
                          initialValues={{
                            question_id: question.id,
                            display_order: question.options.length + 1,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
