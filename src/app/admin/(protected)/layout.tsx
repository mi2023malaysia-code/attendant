import Link from 'next/link';
import type { ReactNode } from 'react';

import { requireAdminSession } from '@/lib/auth';
import { adminNav } from '@/lib/content';

export const dynamic = 'force-dynamic';

export default async function ProtectedAdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const session = await requireAdminSession();
  const displayName = session.displayName ?? session.email ?? 'authenticated admin';

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:flex-row">
      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-80">
        <div className="flex h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                Protected workspace
              </p>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Project 117 admin
              </h1>
              <p className="text-sm leading-7 text-slate-300">
                Signed in as {displayName}. Route access is backed by Supabase
                Auth and the admin profile table.
              </p>
            </div>

            <nav aria-label="Admin navigation" className="space-y-2">
              {adminNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-slate-400">open</span>
                </Link>
              ))}
            </nav>
          </div>

          <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-100/70">
              Access model
            </p>
            <p className="mt-2 text-sm leading-7 text-slate-200">
              Admin reads and writes remain server-checked, while attendees use
              invitation-token routes with draft-only browser writes.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex-1 space-y-6">{children}</section>
    </main>
  );
}
