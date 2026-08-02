import Link from 'next/link';
import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';

const publicNav = [
  { href: '/admin/webinars1', label: 'Webinars 1' },
  { href: '/', label: 'Home' },
] as const;

export default function PublicWebinarsLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 xl:flex-row">
      <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-80">
        <div className="flex h-full flex-col justify-between rounded-[2rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-slate-950/20 backdrop-blur-xl">
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-cyan-200/70">
                Public preview workspace
              </p>
              <h1 className="text-2xl font-semibold tracking-[-0.04em] text-white">
                Project 117 webinars 1
              </h1>
              <p className="text-sm leading-7 text-slate-300">
                This route is intentionally open for testing and uses preview
                storage directly, so you can exercise the webinar CRUD flow
                without a login token.
              </p>
            </div>

            <nav aria-label="Public webinar navigation" className="space-y-2">
              {publicNav.map((item) => (
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
              Records stay inside the preview store, which keeps this module
              isolated from the production Supabase tables.
            </p>
          </div>
        </div>
      </aside>

      <section className="flex-1 space-y-6">{children}</section>
    </main>
  );
}
