import { describe, expect, it } from 'vitest';

import {
  attendeeWorkflow,
  buildMilestones,
  systemPillars,
} from '../src/lib/content';
import { normalizeInvitationToken } from '../src/lib/invitation-token';

describe('project content scaffold', () => {
  it('normalizes invitation links into a usable token', () => {
    expect(
      normalizeInvitationToken(
        ' https://example.com/attendee/secure-token-123?source=email ',
      ),
    ).toBe('secure-token-123');
  });

  it('keeps the milestone plan intact', () => {
    expect(buildMilestones).toHaveLength(5);
    expect(buildMilestones[0]?.title).toBe('Foundation');
  });

  it('covers the core product pillars and attendee flow', () => {
    expect(systemPillars).toHaveLength(3);
    expect(attendeeWorkflow).toHaveLength(5);
  });
});
