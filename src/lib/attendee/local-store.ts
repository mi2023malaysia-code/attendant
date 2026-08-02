import 'server-only';

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { normalizeInvitationToken } from '@/lib/invitation-token';
import type { QuestionWithOptions } from '@/lib/admin/questions';
import type {
  AttendeeQuestionnaireContext,
  AssignmentRecord,
  AttendeeRecord,
  InvitationTokenRecord,
} from '@/lib/attendee/questionnaire';
import type { QuestionnaireRecord, QuestionnaireVersionRecord } from '@/lib/admin/questionnaires';
import type { WebinarRecord } from '@/lib/admin/webinars';
const smokeTestToken = 'smoke-test-token-2026-08-01';
const smokeTestTokenHash =
  '570a00bba7550b93a1d17a9a2a7ecec6f4ebef6c9b1c2327d82dbbe78abdc0d8';
const localStateFilePath = process.env.VERCEL
  ? join(tmpdir(), 'attendee-smoke-state.json')
  : join(process.cwd(), '.cache', 'attendee-smoke-state.json');

function tokenPreview(token: string) {
  return token.length > 16 ? `${token.slice(0, 12)}...` : token;
}

function buildSmokeTestBaseContext(normalizedToken: string): AttendeeQuestionnaireContext {
  const attendee: AttendeeRecord = {
    id: 'c8f8bf43-f7b9-4dbe-9149-fbe3e6690019',
    full_name: 'Smoke Test Attendee',
    email: 'smoke.test@example.com',
    phone: '+1-555-0100',
    organisation: 'Codex QA',
    email_normalized: 'smoke.test@example.com',
    first_seen_at: '2026-08-01T14:11:35.319617+00:00',
    last_seen_at: null,
    created_at: '2026-08-01T14:11:35.319617+00:00',
    updated_at: '2026-08-01T14:11:35.319617+00:00',
  };

  const assignment: AssignmentRecord = {
    id: '9b6fd6b2-8cd3-4fa7-a7d7-8a5cb4c971f1',
    webinar_id: '8dfbf875-5dab-462d-a66a-77e2ddef5fda',
    questionnaire_version_id: '8db1fe5e-98be-4515-b50b-18955cf4aed5',
    stage: 'pre_webinar',
    open_at: '2026-08-01T13:12:35.859097+00:00',
    close_at: '2026-08-08T14:12:35.859097+00:00',
    status: 'active',
    display_order: 1,
    created_by: null,
    created_at: '2026-08-01T14:12:35.859097+00:00',
    updated_at: '2026-08-01T14:12:35.859097+00:00',
  };

  const webinar: WebinarRecord = {
    id: '8dfbf875-5dab-462d-a66a-77e2ddef5fda',
    title: 'Smoke Test Webinar',
    description: 'Fixture webinar for attendee flow verification.',
    starts_at: '2026-07-31T14:11:35.319617+00:00',
    ends_at: '2026-08-02T14:11:35.319617+00:00',
    timezone: 'UTC',
    status: 'published',
    created_by: null,
    updated_by: null,
    archived_at: null,
    created_at: '2026-08-01T14:11:35.319617+00:00',
    updated_at: '2026-08-01T14:11:35.319617+00:00',
  };

  const questionnaire: QuestionnaireRecord = {
    id: '052460c0-c2e8-4589-8b91-c0d61971d847',
    slug: 'smoke-test-questionnaire',
    title: 'Smoke Test Questionnaire',
    description: 'Fixture questionnaire for attendee flow verification.',
    status: 'published',
    duplicated_from_questionnaire_id: null,
    created_by: null,
    archived_at: null,
    created_at: '2026-08-01T14:11:35.319617+00:00',
    updated_at: '2026-08-01T14:12:35.859097+00:00',
  };

  const questionnaireVersion: QuestionnaireVersionRecord = {
    id: '8db1fe5e-98be-4515-b50b-18955cf4aed5',
    questionnaire_id: questionnaire.id,
    version_number: 1,
    status: 'published',
    change_summary: 'Smoke test fixture',
    published_at: '2026-08-01T14:12:35.859097+00:00',
    published_by: null,
    created_by: null,
    created_at: '2026-08-01T14:11:35.319617+00:00',
    updated_at: '2026-08-01T14:12:35.859097+00:00',
  };

  const questions: QuestionWithOptions[] = [
    {
      id: '5df30e1c-0069-4786-b96b-63bd205eb48b',
      questionnaire_version_id: questionnaireVersion.id,
      topic_id: null,
      benchmark_key: null,
      prompt: 'What is your department?',
      help_text: 'This field helps us segment the attendee summary.',
      question_type: 'short_text',
      required: true,
      display_order: 1,
      score_weight: 1,
      min_value: null,
      max_value: null,
      settings_jsonb: {},
      created_by: null,
      updated_by: null,
      created_at: '2026-08-01T14:11:35.319617+00:00',
      updated_at: '2026-08-01T14:11:35.319617+00:00',
      options: [],
    },
    {
      id: 'f9f39b20-7af8-406b-9b73-4b75b16bc2e3',
      questionnaire_version_id: questionnaireVersion.id,
      topic_id: null,
      benchmark_key: null,
      prompt: 'Which option best describes your familiarity with the topic?',
      help_text: 'Pick the single option that feels closest.',
      question_type: 'single_choice',
      required: true,
      display_order: 2,
      score_weight: 1,
      min_value: null,
      max_value: null,
      settings_jsonb: {},
      created_by: null,
      updated_by: null,
      created_at: '2026-08-01T14:11:35.319617+00:00',
      updated_at: '2026-08-01T14:11:35.319617+00:00',
      options: [
        {
          id: 'a2d9c4bb-bac8-4f9a-82eb-8ca6af65e374',
          question_id: 'f9f39b20-7af8-406b-9b73-4b75b16bc2e3',
          option_key: 'beginner',
          option_label: 'Beginner',
          display_order: 1,
          score_value: 0,
          is_default: false,
          is_other: false,
          created_at: '2026-08-01T14:11:35.319617+00:00',
          updated_at: '2026-08-01T14:11:35.319617+00:00',
        },
        {
          id: '9e9b5ede-5212-45ce-b83a-f4e042670a03',
          question_id: 'f9f39b20-7af8-406b-9b73-4b75b16bc2e3',
          option_key: 'experienced',
          option_label: 'Experienced',
          display_order: 2,
          score_value: 1,
          is_default: false,
          is_other: false,
          created_at: '2026-08-01T14:11:35.319617+00:00',
          updated_at: '2026-08-01T14:11:35.319617+00:00',
        },
      ],
    },
  ];

  const invitationToken: InvitationTokenRecord = {
    id: 'e39bfc4d-e3a2-4647-8739-e60fa7d37540',
    assignment_id: assignment.id,
    attendee_id: attendee.id,
    token_hash: smokeTestTokenHash,
    status: 'issued',
    issued_by: null,
    issued_at: '2026-08-01T14:12:35.859097+00:00',
    claimed_at: null,
    expires_at: '2026-08-08T14:12:35.859097+00:00',
    revoked_at: null,
    created_at: '2026-08-01T14:12:35.859097+00:00',
    updated_at: '2026-08-01T14:12:35.859097+00:00',
  };

  return {
    rawToken: normalizedToken,
    tokenHash: smokeTestTokenHash,
    tokenPreview: tokenPreview(normalizedToken),
    invitationToken,
    attendee,
    assignment,
    webinar,
    questionnaire,
    questionnaireVersion,
    questions,
    response: null,
    responseAnswers: [],
  };
}

async function readLocalContextSnapshot() {
  try {
    const raw = await readFile(localStateFilePath, 'utf8');
    return JSON.parse(raw) as AttendeeQuestionnaireContext;
  } catch {
    return null;
  }
}

async function writeLocalContextSnapshot(context: AttendeeQuestionnaireContext) {
  await mkdir(dirname(localStateFilePath), { recursive: true });
  await writeFile(localStateFilePath, `${JSON.stringify(context, null, 2)}\n`, 'utf8');
}

export function shouldUseLocalAttendeeStore() {
  if (process.env.VERCEL) {
    return false;
  }

  return !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export async function loadLocalAttendeeQuestionnaireContext(rawToken: string) {
  const normalizedToken = normalizeInvitationToken(rawToken);

  if (!normalizedToken || normalizedToken !== smokeTestToken) {
    return null;
  }

  const existing = (await readLocalContextSnapshot()) ?? buildSmokeTestBaseContext(normalizedToken);

  if (existing.rawToken !== normalizedToken) {
    existing.rawToken = normalizedToken;
  }

  existing.tokenHash = smokeTestTokenHash;
  existing.tokenPreview = tokenPreview(normalizedToken);

  if (existing.invitationToken.status === 'issued') {
    const openedAt = existing.invitationToken.claimed_at ?? new Date().toISOString();
    existing.invitationToken.status = 'opened';
    existing.invitationToken.claimed_at = openedAt;
    existing.invitationToken.updated_at = openedAt;
    await writeLocalContextSnapshot(existing);
  }

  return existing;
}

export async function saveLocalAttendeeQuestionnaireContext(
  context: AttendeeQuestionnaireContext,
) {
  await writeLocalContextSnapshot(context);
}
