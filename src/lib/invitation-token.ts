import { createHash } from 'node:crypto';

export function normalizeInvitationToken(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return '';
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(segments.at(-1) ?? '').trim();
  } catch {
    const segments = trimmed.split('/').filter(Boolean);
    return decodeURIComponent(segments.at(-1) ?? trimmed).trim();
  }
}

export function hashInvitationToken(token: string) {
  return createHash('sha256').update(token.trim(), 'utf8').digest('hex');
}
