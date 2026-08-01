import Link from 'next/link';

import { QuestionnaireForm } from '@/components/admin/questionnaire-form';
import { formatDateTime } from '@/lib/admin/datetime';
import { listAdminQuestionnaires } from '@/lib/admin/questionnaires';

import {
  archiveQuestionnaireAction,
  duplicateQuestionnaireAction,
} from './actions';

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

export default async function AdminQuestionnairesPage() {
  const questionnaires = await listAdminQuestionnaires();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
          Questionnaire authoring
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Create and manage questionnaire shells from Supabase.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Administrators can create reusable questionnaires, duplicate
              existing ones, archive old versions and start version history
              without leaving the protected authoring workspace.
            </p>
          </div>
          <Link
            href="/admin"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
          <QuestionnaireForm mode="create" />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Questionnaire records
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {questionnaires.length} questionnaire
              {questionnaires.length === 1 ? '' : 's'} loaded from Supabase.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {questionnaires.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
              No questionnaires exist yet. Create the first one above to start
              building reusable question sets.
            </div>
          ) : (
            questionnaires.map((questionnaire) => (
              <article
                key={questionnaire.id}
                className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold tracking-[-0.03em] text-white">
                        {questionnaire.title}
                      </h4>
                      <StatusBadge status={questionnaire.status} />
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      {questionnaire.description ?? 'No description yet.'}
                    </p>
                    <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Slug
                        </dt>
                        <dd className="mt-1 break-all">{questionnaire.slug}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Versions
                        </dt>
                        <dd className="mt-1">{questionnaire.version_count}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Latest version
                        </dt>
                        <dd className="mt-1">
                          {questionnaire.latest_version
                            ? `v${questionnaire.latest_version.version_number} (${questionnaire.latest_version.status})`
                            : 'No versions yet'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Updated
                        </dt>
                        <dd className="mt-1">
                          {formatDateTime(questionnaire.updated_at)}
                        </dd>
                      </div>
                    </dl>
                    <p className="text-sm leading-7 text-slate-400">
                      Latest change summary:{' '}
                      {questionnaire.latest_version?.change_summary ??
                        'No version summary has been recorded yet.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/questionnaires/${questionnaire.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
                    >
                      Edit
                    </Link>
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
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
