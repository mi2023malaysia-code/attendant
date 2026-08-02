import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSignInForm } from '@/components/admin/sign-in-form';
import { isAdminAuthBypassEnabled } from '@/lib/admin/test-access';

export default function AdminSignInPage() {
  if (isAdminAuthBypassEnabled()) {
    redirect('/admin');
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl">
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/80">
            Admin access
          </p>
          <p className="text-sm text-slate-300">Supabase Auth sign-in scaffold</p>
        </div>
        <Link
          href="/"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-white/10"
        >
          Back to overview
        </Link>
      </header>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(14,22,40,0.92),rgba(6,11,22,0.98))] p-8 shadow-2xl shadow-slate-950/40">
          <div className="space-y-5">
            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
              Route protection
            </div>
            <h1 className="text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl">
              Sign in to manage webinars, questionnaires, and reporting.
            </h1>
            <p className="max-w-xl text-base leading-8 text-slate-300">
              This page is wired for Supabase Auth. Once a real admin user
              exists in your project, the magic-link flow will gate the protected
              admin workspace and its RLS-backed data access.
            </p>
          </div>

          <div className="mt-8 grid gap-4">
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Current expectation
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Use a Supabase Auth account mapped to the <code>117_admin_profiles</code>{' '}
                table. The placeholder seed row creates data for local resets, but
                it is not itself a login credential.
              </p>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                Security boundary
              </p>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Admin pages stay behind server-side route checks, while the browser
                only receives the public Supabase anon key.
              </p>
            </div>
          </div>
        </article>

        <div className="space-y-6">
          <AdminSignInForm />

          <article className="rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-xl shadow-slate-950/20 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
              What happens next
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-300">
              <li>1. Supabase sends a secure magic link to the admin email.</li>
              <li>2. The server checks the signed-in user against the admin table.</li>
              <li>3. The protected admin dashboard becomes available.</li>
            </ul>
          </article>
        </div>
      </section>
    </main>
  );
}
