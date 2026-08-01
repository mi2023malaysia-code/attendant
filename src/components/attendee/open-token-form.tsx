'use client';

import { FormEvent, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { normalizeInvitationToken } from '@/lib/invitation-token';

export function OpenTokenForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const token = normalizeInvitationToken(value);

    if (!token) {
      setError('Paste the secure invitation link or token.');
      return;
    }

    setError('');

    startTransition(() => {
      router.push(`/attendee/${encodeURIComponent(token)}`);
    });
  }

  return (
    <form
      className="space-y-5 rounded-[1.75rem] border border-white/10 bg-[var(--panel)] p-6 shadow-2xl shadow-indigo-950/20 backdrop-blur-xl"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <label
          className="block text-sm font-medium tracking-tight text-slate-100"
          htmlFor="invitation-token"
        >
          Secure invitation link or token
        </label>
        <input
          id="invitation-token"
          name="token"
          type="text"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-slate-100 outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20"
          placeholder="https://app.example.com/attendee/secure-token"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Opening questionnaire...' : 'Open questionnaire'}
      </button>

      <p
        className={`rounded-2xl border px-4 py-3 text-sm ${
          error
            ? 'border-rose-400/30 bg-rose-500/10 text-rose-100'
            : 'border-cyan-400/20 bg-cyan-400/10 text-slate-200'
        }`}
        aria-live="polite"
      >
        {error || 'The token is normalized before navigation so pasted links just work.'}
      </p>
    </form>
  );
}
