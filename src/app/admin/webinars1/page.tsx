import Link from 'next/link';

import { WebinarForm } from '@/components/admin/webinar-form';
import { formatDateTime } from '@/lib/admin/datetime';
import { listPublicWebinars } from '@/lib/admin/webinars1';

import { archiveWebinar1Action, upsertWebinar1Action } from './actions';

export const dynamic = 'force-dynamic';

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === 'published'
      ? 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
      : status === 'completed'
        ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
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

export default async function PublicWebinarsPage() {
  const webinars = await listPublicWebinars();

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
          Public webinar authoring
        </p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              Create and manage webinars in a public preview workspace.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              This module mirrors the webinar CRUD flow, but it writes to the
              preview store directly so you can test the workflow without a
              login token or Supabase admin secret.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
          >
            Back to home
          </Link>
        </div>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-slate-950/40 p-5">
          <WebinarForm mode="create" action={upsertWebinar1Action} />
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-white">
              Webinar records
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              {webinars.length} webinar{webinars.length === 1 ? '' : 's'} loaded from the
              preview store.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {webinars.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-sm leading-7 text-slate-300">
              No webinars exist yet. Create the first one above to start wiring
              the public preview flow.
            </div>
          ) : (
            webinars.map((webinar) => (
              <article
                key={webinar.id}
                className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className="text-lg font-semibold tracking-[-0.03em] text-white">
                        {webinar.title}
                      </h4>
                      <StatusBadge status={webinar.status} />
                    </div>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      {webinar.description ?? 'No description yet.'}
                    </p>
                    <dl className="grid gap-3 text-sm text-slate-300 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Starts
                        </dt>
                        <dd className="mt-1">{formatDateTime(webinar.starts_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Ends
                        </dt>
                        <dd className="mt-1">{formatDateTime(webinar.ends_at)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Timezone
                        </dt>
                        <dd className="mt-1">{webinar.timezone}</dd>
                      </div>
                      <div>
                        <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                          Updated
                        </dt>
                        <dd className="mt-1">{formatDateTime(webinar.updated_at)}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/webinars1/${webinar.id}`}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
                    >
                      Edit
                    </Link>
                    {webinar.status !== 'archived' ? (
                      <form action={archiveWebinar1Action}>
                        <input name="id" type="hidden" value={webinar.id} readOnly />
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
