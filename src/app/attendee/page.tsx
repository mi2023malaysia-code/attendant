import Link from 'next/link';

import { OpenTokenForm } from '@/components/attendee/open-token-form';
import { attendeeWorkflow, securityChecklist } from '@/lib/content';

export default function AttendeeLandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
            Attendee access
          </p>
          <p className="text-sm text-slate-300">Secure invitation-token entry</p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
        >
          Back to overview
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.98fr_1.02fr]">
        <article className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Attendee workflow
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Open the secure link that was assigned to your webinar session.
            </h1>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              The attendee experience stays intentionally small. The token
              resolves the correct webinar, questionnaire version, and stage,
              then the form is generated directly from database records.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            {attendeeWorkflow.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
              >
                <span className="font-mono text-cyan-200/90">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        </article>

        <div className="space-y-6">
          <OpenTokenForm />

          <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              Security notes
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              {securityChecklist.map((item) => (
                <li key={item} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3">
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
