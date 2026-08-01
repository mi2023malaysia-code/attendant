const dashboardStats = [
  {
    label: 'Webinars',
    value: '0',
    detail: 'Create and archive webinar records here.',
  },
  {
    label: 'Questionnaires',
    value: '0',
    detail: 'Build reusable questionnaire definitions and versions.',
  },
  {
    label: 'Invitations',
    value: '0',
    detail: 'Generate secure attendee links for each assignment.',
  },
  {
    label: 'Completion',
    value: '--',
    detail: 'Progress snapshots will appear after attendee submissions.',
  },
];

const nextActions = [
  'Wire webinar CRUD to Supabase.',
  'Add questionnaire version publishing.',
  'Generate invitation tokens and attendee links.',
  'Persist score snapshots after submission.',
];

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
        <div className="space-y-4">
          <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            Admin dashboard
          </p>
          <h2 className="text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            A control room for webinars, questionnaires, and progress.
          </h2>
          <p className="max-w-3xl text-base leading-8 text-slate-300">
            This is the first protected workspace surface. Once the CRUD flows
            land, this dashboard will show live webinar states, completion
            trends, topic progress, and export-ready summaries.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-[1.6rem] border border-white/10 bg-[var(--panel)] p-5 shadow-xl shadow-slate-950/20 backdrop-blur-xl"
          >
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
              {stat.label}
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
              {stat.value}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
            What this dashboard will display
          </h3>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
            <li>Webinar status, date ranges, and active questionnaire stages.</li>
            <li>Questionnaire version history and publish state.</li>
            <li>Invite issuance, completion status, and response counts.</li>
            <li>Topic progress summaries and pre/post comparisons.</li>
          </ul>
        </article>

        <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
          <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">
            Next actions
          </h3>
          <ol className="mt-4 space-y-3">
            {nextActions.map((action, index) => (
              <li
                key={action}
                className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
              >
                <span className="font-mono text-cyan-200/90">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span>{action}</span>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </div>
  );
}
