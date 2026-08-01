import Link from 'next/link';
import { notFound } from 'next/navigation';

import { QuestionBuilder } from '@/components/admin/question-builder';
import { QuestionnaireForm } from '@/components/admin/questionnaire-form';
import { formatDateTime } from '@/lib/admin/datetime';
import { listAdminQuestions } from '@/lib/admin/questions';
import { listAdminTopics } from '@/lib/admin/topics';
import { getAdminQuestionnaire } from '@/lib/admin/questionnaires';

import {
  archiveQuestionnaireAction,
  createQuestionnaireVersionAction,
  duplicateQuestionnaireAction,
} from '../actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
      : status === 'archived'
        ? 'border-slate-400/20 bg-slate-400/10 text-slate-200'
        : 'border-amber-400/20 bg-amber-400/10 text-amber-100';

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] ${tone}`}
    >
      {status}
    </span>
  );
}

export default async function QuestionnaireDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { questionnaire, versions } = await getAdminQuestionnaire(id);

  if (!questionnaire) {
    notFound();
  }

  const editableVersion =
    versions.find((version) => version.status === 'draft') ?? null;
  const topics = await listAdminTopics();
  const questions = editableVersion
    ? await listAdminQuestions(editableVersion.id)
    : [];

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Edit questionnaire
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
                {questionnaire.title}
              </h1>
              <StatusBadge status={questionnaire.status} />
            </div>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Update the questionnaire metadata here. Versions, duplicated
              drafts and archived snapshots are all backed by Supabase records.
            </p>
          </div>
          <Link
            href="/admin/questionnaires"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
          >
            Back to questionnaires
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.74fr]">
        <article className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <QuestionnaireForm
            mode="edit"
            initialValues={{
              id: questionnaire.id,
              title: questionnaire.title,
              slug: questionnaire.slug,
              description: questionnaire.description,
              status: questionnaire.status,
            }}
          />
        </article>

        <aside className="space-y-6">
          <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Questionnaire details
            </h2>
            <dl className="mt-5 grid gap-4 text-sm text-slate-300">
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Slug
                </dt>
                <dd className="mt-1 break-all">{questionnaire.slug}</dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Versions
                </dt>
                <dd className="mt-1">{versions.length}</dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Created
                </dt>
                <dd className="mt-1">{formatDateTime(questionnaire.created_at)}</dd>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Updated
                </dt>
                <dd className="mt-1">{formatDateTime(questionnaire.updated_at)}</dd>
              </div>
              {questionnaire.archived_at ? (
                <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
                  <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Archived
                  </dt>
                  <dd className="mt-1">{formatDateTime(questionnaire.archived_at)}</dd>
                </div>
              ) : null}
            </dl>

            <div className="mt-5 flex flex-wrap gap-2">
              <form action={duplicateQuestionnaireAction}>
                <input name="id" type="hidden" value={questionnaire.id} readOnly />
                <button
                  type="submit"
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Duplicate
                </button>
              </form>
              {questionnaire.status !== 'archived' ? (
                <form action={archiveQuestionnaireAction}>
                  <input name="id" type="hidden" value={questionnaire.id} readOnly />
                  <button
                    type="submit"
                    className="rounded-full border border-rose-400/20 bg-rose-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-rose-100 transition hover:bg-rose-400/20"
                  >
                    Archive
                  </button>
                </form>
              ) : null}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Start a new version
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              Each questionnaire version is immutable. Use this form to create a
              fresh draft version and document why the change is happening.
            </p>

            <form action={createQuestionnaireVersionAction} className="mt-5 space-y-4">
              <input
                name="questionnaire_id"
                type="hidden"
                value={questionnaire.id}
                readOnly
              />
              <div className="space-y-2">
                <label
                  className="text-sm font-medium text-slate-100"
                  htmlFor="change_summary"
                >
                  Change summary
                </label>
                <textarea
                  id="change_summary"
                  name="change_summary"
                  rows={4}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="Describe what changed in this version."
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Create draft version
              </button>
            </form>
          </section>
        </aside>
      </section>

      {editableVersion ? (
        <QuestionBuilder
          questionnaireId={questionnaire.id}
          questionnaireVersionId={editableVersion.id}
          topics={topics}
          questions={questions}
        />
      ) : (
        <section className="rounded-[2rem] border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
          Create a draft questionnaire version to unlock the question builder.
        </section>
      )}

      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Version history
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {versions.length} version{versions.length === 1 ? '' : 's'} stored
              in Supabase.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {versions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
              No versions have been recorded yet.
            </div>
          ) : (
            versions.map((version) => (
              <article
                key={version.id}
                className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
                        Version {version.version_number}
                      </h3>
                      <StatusBadge status={version.status} />
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      {version.change_summary ??
                        'No change summary was supplied for this version.'}
                    </p>
                    <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Created
                        </dt>
                        <dd className="mt-1">{formatDateTime(version.created_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Updated
                        </dt>
                        <dd className="mt-1">{formatDateTime(version.updated_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Published
                        </dt>
                        <dd className="mt-1">{formatDateTime(version.published_at)}</dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
