import Link from 'next/link';

import { AttendeeQuestionnaireForm } from '@/components/attendee/questionnaire-form';
import { normalizeInvitationToken } from '@/lib/invitation-token';
import { loadAttendeeQuestionnaireContext } from '@/lib/attendee/questionnaire';

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export const dynamic = 'force-dynamic';

export default async function AttendeeQuestionnairePage({
  params,
}: PageProps) {
  const { token } = await params;
  const context = await loadAttendeeQuestionnaireContext(token);
  const tokenPreview = normalizeInvitationToken(token);

  if (!context) {
    return (
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
            Secure questionnaire route
          </span>
          <span className="mx-3 text-slate-500">|</span>
          <span className="font-mono text-xs text-slate-200">{tokenPreview || 'Invalid token'}</span>
        </header>

        <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Invitation unavailable
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              We could not resolve this invitation token.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300">
              The link may be mistyped, expired, revoked, or not yet assigned to an active
              webinar questionnaire stage.
            </p>
          </div>

          <div className="mt-8 rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6">
            <p className="text-sm leading-7 text-slate-300">
              Try the secure link again from your invitation email, or return to the attendee
              entry page and paste the token carefully.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/attendee"
                className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Back to attendee entry
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Project overview
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300 shadow-2xl shadow-indigo-950/10 backdrop-blur-xl">
        <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
          Secure questionnaire route
        </span>
        <span className="mx-3 text-slate-500">|</span>
        <span className="font-mono text-xs text-slate-200">{context.tokenPreview}</span>
        <span className="mx-3 text-slate-500">|</span>
        <span className="text-slate-300">{context.webinar.title}</span>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
        <article className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Invitation token resolved
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              {context.questionnaire.title}
            </h1>
            <p className="max-w-2xl text-base leading-8 text-slate-300">
              This questionnaire is rendered directly from the published questionnaire version
              assigned to your webinar stage. Save a draft, return later, and submit once you
              are ready.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                Webinar
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">{context.webinar.title}</p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                Stage
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                {context.assignment.stage === 'pre_webinar' ? 'Pre-webinar' : 'Post-webinar'}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                Questionnaire version
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                v{context.questionnaireVersion.version_number}
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
                Token status
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-200">
                {context.invitationToken.status}
              </p>
            </div>
          </div>
        </article>

        <AttendeeQuestionnaireForm context={context} />
      </section>
    </main>
  );
}
