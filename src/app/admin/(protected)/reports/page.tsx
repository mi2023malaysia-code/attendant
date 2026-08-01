const reportChecklist = [
  'View completion and progress summaries.',
  'Compare pre-webinar and post-webinar scores.',
  'Inspect individual responses and group trends.',
  'Export safe CSVs for downstream analysis.',
];

export default function AdminReportsPage() {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-cyan-200/70">
        Reporting
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
        Progress dashboards and exports will live here.
      </h2>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
        Once scoring snapshots are persisted, this area will surface attendee,
        topic, and webinar-level summaries without recalculating everything on
        every request.
      </p>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {reportChecklist.map((item) => (
          <li
            key={item}
            className="rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
