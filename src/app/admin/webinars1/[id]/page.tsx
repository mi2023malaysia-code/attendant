import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WebinarForm } from '@/components/admin/webinar-form';
import { formatDateTime } from '@/lib/admin/datetime';
import { getPublicWebinar } from '@/lib/admin/webinars1';

import { archiveWebinar1Action, upsertWebinar1Action } from '../actions';

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function PublicWebinarDetailPage({ params }: PageProps) {
  const { id } = await params;
  const webinar = await getPublicWebinar(id);

  if (!webinar) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
              Edit webinar
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.05em] text-white">
              {webinar.title}
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">
              Update the webinar metadata in the public preview store. The
              route behaves like the protected webinar module, but it does not
              require a login token.
            </p>
          </div>
          <Link
            href="/admin/webinars1"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
          >
            Back to webinars
          </Link>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.72fr]">
        <article className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <WebinarForm
            mode="edit"
            action={upsertWebinar1Action}
            initialValues={{
              id: webinar.id,
              title: webinar.title,
              description: webinar.description,
              starts_at: webinar.starts_at,
              ends_at: webinar.ends_at,
              timezone: webinar.timezone,
              status: webinar.status,
            }}
          />
        </article>

        <aside className="space-y-4">
          <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              Record details
            </p>
            <dl className="mt-4 space-y-4 text-sm text-slate-300">
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Created
                </dt>
                <dd className="mt-1">{formatDateTime(webinar.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Updated
                </dt>
                <dd className="mt-1">{formatDateTime(webinar.updated_at)}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.25em] text-slate-500">
                  Status
                </dt>
                <dd className="mt-1">{webinar.status}</dd>
              </div>
            </dl>
          </article>

          {webinar.status !== 'archived' ? (
            <form
              action={archiveWebinar1Action}
              className="rounded-[1.75rem] border border-rose-400/20 bg-rose-400/10 p-5 shadow-xl shadow-rose-950/10 backdrop-blur-xl"
            >
              <input name="id" type="hidden" value={webinar.id} readOnly />
              <p className="text-xs uppercase tracking-[0.3em] text-rose-100/80">
                Archive action
              </p>
              <p className="mt-3 text-sm leading-7 text-rose-50/90">
                Archiving preserves the record for history while removing it from
                the active preview flow.
              </p>
              <button
                type="submit"
                className="mt-4 rounded-full border border-rose-100/20 bg-rose-100/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-rose-50 transition hover:bg-rose-100/20"
              >
                Archive webinar
              </button>
            </form>
          ) : null}
        </aside>
      </section>
    </div>
  );
}
