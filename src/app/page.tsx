import Link from 'next/link';

import {
  attendeeWorkflow,
  buildMilestones,
  heroStats,
  roadmapLegend,
  securityChecklist,
  systemPillars,
  adminWorkflow,
} from '@/lib/content';

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
            Project 117
          </p>
          <p className="text-sm text-slate-300">
            Webinar Questionnaire and Knowledge Progress System
          </p>
        </div>
        <div className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100">
          Foundation milestone
        </div>
      </header>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.14),transparent_32%)]" />
          <div className="relative space-y-7">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Database-driven questionnaire engine
            </div>
            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
                We are building a database-driven webinar questionnaire and
                knowledge progress system.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Administrators author versioned questionnaires, attendees enter
                through secure invitation links, and the system tracks progress
                before and after each webinar without exposing cross-attendee
                data.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/admin/sign-in"
                className="inline-flex items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                Open admin shell
              </Link>
              <Link
                href="/attendee"
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Preview attendee flow
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          {heroStats.map((stat) => (
            <article
              key={stat.label}
              className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
                {stat.label}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {stat.detail}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {systemPillars.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl"
          >
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-white">
              {pillar.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {pillar.description}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <SectionHeading
            eyebrow="Administrator workflow"
            title="Author, assign, and analyze from one secure workspace."
            description="The admin flow starts with Supabase Auth, then moves through webinar setup, questionnaire versioning, token generation, and reporting."
          />
          <ol className="mt-6 space-y-3">
            {adminWorkflow.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
              >
                <span className="font-mono text-cyan-200/90">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <SectionHeading
            eyebrow="Attendee workflow"
            title="Open a secure link, complete the form, and submit a draft or final response."
            description="The attendee flow is intentionally small: open the link, confirm identity details, save a draft if needed, and submit a completed response."
          />
          <ol className="mt-6 space-y-3">
            {attendeeWorkflow.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
              >
                <span className="font-mono text-cyan-200/90">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <SectionHeading
            eyebrow="Delivery milestones"
            title="A small build sequence keeps the system safe and reviewable."
            description="Each milestone has a focused acceptance target, from the initial app scaffold to reporting and release readiness."
          />
          <div className="mt-6 grid gap-4">
            {buildMilestones.map((milestone) => (
              <div
                key={milestone.number}
                className="rounded-2xl border border-white/8 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                    {milestone.number}
                  </p>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-slate-300">
                    {milestone.status}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold tracking-[-0.03em] text-white">
                  {milestone.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {milestone.summary}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <SectionHeading
            eyebrow="Security model"
            title="Token-bound browser access and server-only secrets."
            description="The browser can only see the questionnaire assigned to its invitation token, while all sensitive writes stay locked behind server-side checks."
          />
          <ul className="mt-6 space-y-3">
            {securityChecklist.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
              >
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
              Build legend
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {roadmapLegend.map((item) => (
                <span
                  key={item.label}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200"
                >
                  <span className="font-semibold text-cyan-100">{item.tone}</span>
                  <span className="mx-2 text-slate-500">|</span>
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}
