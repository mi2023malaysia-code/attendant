'use client';

import { FormEvent, useState } from 'react';

import { getSupabaseBrowserClient } from '@/lib/supabase/browser';

export function AdminSignInForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle');
  const [message, setMessage] = useState(
    'Use the email address tied to your Supabase admin account.',
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setStatus('error');
      setMessage('Enter an email address to continue.');
      return;
    }

    setStatus('sending');
    setMessage('Sending a secure sign-in link...');

    const supabase = getSupabaseBrowserClient();
    const { error } = await (
      supabase.auth as {
        signInWithOtp: (args: {
          email: string;
          options: {
            emailRedirectTo: string;
          };
        }) => Promise<{
          error: {
            message: string;
          } | null;
        }>;
      }
    ).signInWithOtp({
      email: normalizedEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/admin`,
      },
    });

    if (error) {
      setStatus('error');
      setMessage(error.message);
      return;
    }

    setStatus('sent');
    setEmail('');
    setMessage('Check your inbox for the sign-in link.');
  }

  return (
    <form
      className="space-y-5 rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label
          className="block text-sm font-medium tracking-tight text-slate-100"
          htmlFor="admin-email"
        >
          Email address
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          placeholder="admin@company.com"
        />
      </div>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {status === 'sending' ? 'Sending link...' : 'Send sign-in link'}
      </button>

      <p
        className={`rounded-2xl border px-4 py-3 text-sm ${
          status === 'error'
            ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
            : 'border-cyan-400/20 bg-cyan-400/10 text-slate-200'
        }`}
        aria-live="polite"
      >
        {message}
      </p>
    </form>
  );
}
