import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { SupabaseClient } from '@supabase/supabase-js';

import { isAdminAuthBypassEnabled } from '@/lib/admin/test-access';
import { slugify } from '@/lib/admin/slug';
import type { QuestionType } from '@/lib/admin/question-types';
import type {
  QuestionOptionRecord,
  QuestionRecord,
} from '@/lib/admin/questions';
import type {
  QuestionnaireRecord,
  QuestionnaireVersionRecord,
} from '@/lib/admin/questionnaires';
import type { TopicRecord } from '@/lib/admin/topics';
import type { WebinarRecord } from '@/lib/admin/webinars';

type PreviewAdminState = {
  webinars: WebinarRecord[];
  questionnaires: QuestionnaireRecord[];
  questionnaireVersions: QuestionnaireVersionRecord[];
  topics: TopicRecord[];
  questions: QuestionRecord[];
  questionOptions: QuestionOptionRecord[];
};

type FilterRule = {
  kind: 'eq' | 'neq';
  column: string;
  value: unknown;
};

type OrderRule = {
  column: string;
  ascending: boolean;
};

const previewTimestamp = '2026-08-02T00:00:00.000Z';

const previewStatePath = process.env.VERCEL
  ? join(tmpdir(), '117-admin-preview-state.json')
  : join(process.cwd(), '.cache', '117-admin-preview-state.json');

let previewStateCache: PreviewAdminState | null = null;

function seedTimestamp(offsetMinutes = 0) {
  if (!offsetMinutes) {
    return previewTimestamp;
  }

  return new Date(
    new Date(previewTimestamp).getTime() + offsetMinutes * 60_000,
  ).toISOString();
}

function buildPreviewState(): PreviewAdminState {
  const webinarId = '11111111-1111-1111-1111-111111111111';
  const questionnaireId = '22222222-2222-2222-2222-222222222222';
  const questionnaireVersionId = '33333333-3333-3333-3333-333333333333';
  const topicOneId = '44444444-4444-4444-4444-444444444441';
  const topicTwoId = '44444444-4444-4444-4444-444444444442';
  const questionId = '55555555-5555-5555-5555-555555555555';

  return {
    webinars: [
      {
        id: webinarId,
        title: 'Preview Webinar',
        description: 'Seed webinar shown in public preview mode.',
        starts_at: '2026-08-02T14:00:00.000Z',
        ends_at: '2026-08-02T15:00:00.000Z',
        timezone: 'UTC',
        status: 'published',
        created_by: null,
        updated_by: null,
        archived_at: null,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
    ],
    questionnaires: [
      {
        id: questionnaireId,
        slug: 'preview-questionnaire',
        title: 'Preview Questionnaire',
        description: 'Seed questionnaire shown in public preview mode.',
        status: 'draft',
        duplicated_from_questionnaire_id: null,
        created_by: null,
        archived_at: null,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
    ],
    questionnaireVersions: [
      {
        id: questionnaireVersionId,
        questionnaire_id: questionnaireId,
        version_number: 1,
        status: 'draft',
        change_summary: 'Seed draft version for preview testing.',
        published_at: null,
        published_by: null,
        created_by: null,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
    ],
    topics: [
      {
        id: topicOneId,
        topic_code: 'foundations',
        name: 'Foundations',
        description: 'Core concepts and baseline context.',
        display_order: 1,
        created_by: null,
        archived_at: null,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
      {
        id: topicTwoId,
        topic_code: 'confidence',
        name: 'Confidence',
        description: 'Comfort and familiarity with the topic.',
        display_order: 2,
        created_by: null,
        archived_at: null,
        created_at: seedTimestamp(1),
        updated_at: seedTimestamp(1),
      },
    ],
    questions: [
      {
        id: questionId,
        questionnaire_version_id: questionnaireVersionId,
        topic_id: topicOneId,
        benchmark_key: null,
        prompt: 'How familiar are you with this topic?',
        help_text: 'Choose the option that best matches your current level.',
        question_type: 'single_choice' as QuestionType,
        required: true,
        display_order: 1,
        score_weight: 1,
        min_value: null,
        max_value: null,
        settings_jsonb: {},
        created_by: null,
        updated_by: null,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
    ],
    questionOptions: [
      {
        id: '66666666-6666-6666-6666-666666666661',
        question_id: questionId,
        option_key: 'new',
        option_label: 'New to this',
        display_order: 1,
        score_value: 0,
        is_default: true,
        is_other: false,
        created_at: seedTimestamp(),
        updated_at: seedTimestamp(),
      },
      {
        id: '66666666-6666-6666-6666-666666666662',
        question_id: questionId,
        option_key: 'somewhat_familiar',
        option_label: 'Somewhat familiar',
        display_order: 2,
        score_value: 1,
        is_default: false,
        is_other: false,
        created_at: seedTimestamp(1),
        updated_at: seedTimestamp(1),
      },
    ],
  };
}

function cloneState(value: PreviewAdminState) {
  return structuredClone(value);
}

async function readPreviewState(): Promise<PreviewAdminState> {
  if (previewStateCache) {
    return cloneState(previewStateCache);
  }

  try {
    const raw = await readFile(previewStatePath, 'utf8');
    previewStateCache = JSON.parse(raw) as PreviewAdminState;
  } catch {
    previewStateCache = buildPreviewState();
  }

  return cloneState(previewStateCache);
}

async function writePreviewState(state: PreviewAdminState) {
  previewStateCache = cloneState(state);
  await mkdir(dirname(previewStatePath), { recursive: true });
  await writeFile(previewStatePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function compareValues(left: unknown, right: unknown) {
  if (left === right) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  if (typeof left === 'boolean' && typeof right === 'boolean') {
    return Number(left) - Number(right);
  }

  return String(left).localeCompare(String(right));
}

function getTableRows(state: PreviewAdminState, table: string) {
  switch (table) {
    case '117_webinars':
      return state.webinars;
    case '117_questionnaires':
      return state.questionnaires;
    case '117_questionnaire_versions':
      return state.questionnaireVersions;
    case '117_topics':
      return state.topics;
    case '117_questions':
      return state.questions;
    case '117_question_options':
      return state.questionOptions;
    default:
      throw new Error(`Preview admin store does not handle table ${table}.`);
  }
}

function ensureUniqueQuestionnaireSlug(
  state: PreviewAdminState,
  slug: string,
  excludedQuestionnaireId?: string,
) {
  const duplicate = state.questionnaires.find(
    (questionnaire) =>
      questionnaire.slug === slug &&
      questionnaire.id !== excludedQuestionnaireId,
  );

  if (duplicate) {
    throw new Error(`duplicate key value violates unique constraint "117_questionnaires_slug_key"`);
  }
}

function buildQuestionnaireVersionRecord(
  payload: Partial<QuestionnaireVersionRecord> & {
    questionnaire_id: string;
    version_number: number;
    status: QuestionnaireVersionRecord['status'];
  },
  overrides: {
    created_by?: string | null;
    published_by?: string | null;
    published_at?: string | null;
  } = {},
): QuestionnaireVersionRecord {
  const now = nowIso();
  const publishedAt =
    payload.status === 'published'
      ? overrides.published_at ?? now
      : overrides.published_at ?? payload.published_at ?? null;
  const publishedBy =
    payload.status === 'published'
      ? overrides.published_by ?? overrides.created_by ?? payload.published_by ?? null
      : overrides.published_by ?? payload.published_by ?? null;

  return {
    id: payload.id ?? randomUUID(),
    questionnaire_id: payload.questionnaire_id,
    version_number: payload.version_number,
    status: payload.status,
    change_summary: payload.change_summary ?? null,
    published_at: publishedAt,
    published_by: publishedBy,
    created_by: overrides.created_by ?? payload.created_by ?? null,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  };
}

function buildQuestionRecord(
  payload: Partial<QuestionRecord> & { questionnaire_version_id: string; question_type: QuestionType },
  overrides: { created_by?: string | null; updated_by?: string | null } = {},
): QuestionRecord {
  const now = nowIso();

  return {
    id: payload.id ?? randomUUID(),
    questionnaire_version_id: payload.questionnaire_version_id,
    topic_id: payload.topic_id ?? null,
    benchmark_key: payload.benchmark_key ?? null,
    prompt: payload.prompt ?? '',
    help_text: payload.help_text ?? null,
    question_type: payload.question_type,
    required: payload.required ?? false,
    display_order: payload.display_order ?? 1,
    score_weight: payload.score_weight ?? 1,
    min_value: payload.min_value ?? null,
    max_value: payload.max_value ?? null,
    settings_jsonb: payload.settings_jsonb ?? {},
    created_by: overrides.created_by ?? payload.created_by ?? null,
    updated_by: overrides.updated_by ?? payload.updated_by ?? null,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  };
}

function buildQuestionOptionRecord(
  payload: Partial<QuestionOptionRecord> & { question_id: string },
): QuestionOptionRecord {
  const now = nowIso();

  return {
    id: payload.id ?? randomUUID(),
    question_id: payload.question_id,
    option_key: payload.option_key ?? '',
    option_label: payload.option_label ?? '',
    display_order: payload.display_order ?? 1,
    score_value: payload.score_value ?? 0,
    is_default: payload.is_default ?? false,
    is_other: payload.is_other ?? false,
    created_at: payload.created_at ?? now,
    updated_at: payload.updated_at ?? now,
  };
}

function applyFilters(rows: Record<string, unknown>[], filters: FilterRule[]) {
  return rows.filter((row) =>
    filters.every((filter) => {
      const value = row[filter.column];
      return filter.kind === 'eq'
        ? value === filter.value
        : value !== filter.value;
    }),
  );
}

function applyOrders(rows: Record<string, unknown>[], orders: OrderRule[]) {
  if (orders.length === 0) {
    return rows;
  }

  return [...rows].sort((left, right) => {
    for (const order of orders) {
      const comparison = compareValues(left[order.column], right[order.column]);

      if (comparison !== 0) {
        return order.ascending ? comparison : -comparison;
      }
    }

    return 0;
  });
}

function applyLimit(rows: Record<string, unknown>[], limit: number | null) {
  if (limit == null) {
    return rows;
  }

  return rows.slice(0, limit);
}

function readRowsForSelect(
  state: PreviewAdminState,
  table: string,
  filters: FilterRule[],
  orders: OrderRule[],
  limit: number | null,
) {
  const rows = applyLimit(
    applyOrders(applyFilters(getTableRows(state, table).map((row) => ({ ...row })), filters), orders),
    limit,
  );

  return rows.map((row) => ({ ...row }));
}

function insertRows(
  state: PreviewAdminState,
  table: string,
  payloads: Record<string, unknown>[],
) {
  const now = nowIso();

  switch (table) {
    case '117_webinars': {
      const rows = payloads.map((payload) => {
        const record: WebinarRecord = {
          id: (payload.id as string | undefined) ?? randomUUID(),
          title: String(payload.title ?? ''),
          description: (payload.description as string | null | undefined) ?? null,
          starts_at: (payload.starts_at as string | null | undefined) ?? null,
          ends_at: (payload.ends_at as string | null | undefined) ?? null,
          timezone: String(payload.timezone ?? 'UTC'),
          status: (payload.status as WebinarRecord['status']) ?? 'draft',
          created_by: (payload.created_by as string | null | undefined) ?? null,
          updated_by: (payload.updated_by as string | null | undefined) ?? null,
          archived_at: (payload.archived_at as string | null | undefined) ?? null,
          created_at: (payload.created_at as string | undefined) ?? now,
          updated_at: (payload.updated_at as string | undefined) ?? now,
        };

        if (record.status === 'archived' && !record.archived_at) {
          record.archived_at = now;
        }

        return record;
      });

      for (const row of rows) {
        const existingIndex = state.webinars.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.webinars[existingIndex] = row;
        } else {
          state.webinars.push(row);
        }
      }

      return rows;
    }
    case '117_questionnaires': {
      const rows = payloads.map((payload) => {
        const slug = String(payload.slug ?? '');
        ensureUniqueQuestionnaireSlug(state, slug, payload.id as string | undefined);

        return {
          id: (payload.id as string | undefined) ?? randomUUID(),
          slug,
          title: String(payload.title ?? ''),
          description: (payload.description as string | null | undefined) ?? null,
          status: (payload.status as QuestionnaireRecord['status']) ?? 'draft',
          duplicated_from_questionnaire_id:
            (payload.duplicated_from_questionnaire_id as string | null | undefined) ?? null,
          created_by: (payload.created_by as string | null | undefined) ?? null,
          archived_at: (payload.archived_at as string | null | undefined) ?? null,
          created_at: (payload.created_at as string | undefined) ?? now,
          updated_at: (payload.updated_at as string | undefined) ?? now,
        } satisfies QuestionnaireRecord;
      });

      for (const row of rows) {
        const existingIndex = state.questionnaires.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.questionnaires[existingIndex] = row;
        } else {
          state.questionnaires.push(row);
        }
      }

      return rows;
    }
    case '117_questionnaire_versions': {
      const rows = payloads.map((payload) =>
        buildQuestionnaireVersionRecord(
          {
            id: payload.id as string | undefined,
            questionnaire_id: String(payload.questionnaire_id ?? ''),
            version_number: Number(payload.version_number ?? 1),
            status: (payload.status as QuestionnaireVersionRecord['status']) ?? 'draft',
            change_summary: (payload.change_summary as string | null | undefined) ?? null,
            published_at: (payload.published_at as string | null | undefined) ?? null,
            published_by: (payload.published_by as string | null | undefined) ?? null,
            created_by: (payload.created_by as string | null | undefined) ?? null,
            created_at: (payload.created_at as string | undefined) ?? now,
            updated_at: (payload.updated_at as string | undefined) ?? now,
          },
          {
            created_by: (payload.created_by as string | null | undefined) ?? null,
            published_at: (payload.published_at as string | null | undefined) ?? null,
            published_by: (payload.published_by as string | null | undefined) ?? null,
          },
        ),
      );

      for (const row of rows) {
        const existingIndex = state.questionnaireVersions.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.questionnaireVersions[existingIndex] = row;
        } else {
          state.questionnaireVersions.push(row);
        }
      }

      return rows;
    }
    case '117_topics': {
      const rows = payloads.map((payload) => ({
        id: (payload.id as string | undefined) ?? randomUUID(),
        topic_code: String(payload.topic_code ?? slugify(String(payload.name ?? 'topic'))),
        name: String(payload.name ?? ''),
        description: (payload.description as string | null | undefined) ?? null,
        display_order: Number(payload.display_order ?? 1),
        created_by: (payload.created_by as string | null | undefined) ?? null,
        archived_at: (payload.archived_at as string | null | undefined) ?? null,
        created_at: (payload.created_at as string | undefined) ?? now,
        updated_at: (payload.updated_at as string | undefined) ?? now,
      }) satisfies TopicRecord);

      for (const row of rows) {
        const existingIndex = state.topics.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.topics[existingIndex] = row;
        } else {
          state.topics.push(row);
        }
      }

      return rows;
    }
    case '117_questions': {
      const rows = payloads.map((payload) =>
        buildQuestionRecord(
          {
            id: payload.id as string | undefined,
            questionnaire_version_id: String(payload.questionnaire_version_id ?? ''),
            topic_id: (payload.topic_id as string | null | undefined) ?? null,
            benchmark_key: (payload.benchmark_key as string | null | undefined) ?? null,
            prompt: String(payload.prompt ?? ''),
            help_text: (payload.help_text as string | null | undefined) ?? null,
            question_type: (payload.question_type as QuestionType) ?? 'short_text',
            required: Boolean(payload.required ?? false),
            display_order: Number(payload.display_order ?? 1),
            score_weight: Number(payload.score_weight ?? 1),
            min_value: (payload.min_value as number | null | undefined) ?? null,
            max_value: (payload.max_value as number | null | undefined) ?? null,
            settings_jsonb: (payload.settings_jsonb as Record<string, unknown> | undefined) ?? {},
            created_by: (payload.created_by as string | null | undefined) ?? null,
            updated_by: (payload.updated_by as string | null | undefined) ?? null,
            created_at: (payload.created_at as string | undefined) ?? now,
            updated_at: (payload.updated_at as string | undefined) ?? now,
          },
          {
            created_by: (payload.created_by as string | null | undefined) ?? null,
            updated_by: (payload.updated_by as string | null | undefined) ?? null,
          },
        ),
      );

      for (const row of rows) {
        const existingIndex = state.questions.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.questions[existingIndex] = row;
        } else {
          state.questions.push(row);
        }
      }

      return rows;
    }
    case '117_question_options': {
      const rows = payloads.map((payload) =>
        buildQuestionOptionRecord({
          id: payload.id as string | undefined,
          question_id: String(payload.question_id ?? ''),
          option_key: String(payload.option_key ?? ''),
          option_label: String(payload.option_label ?? ''),
          display_order: Number(payload.display_order ?? 1),
          score_value: Number(payload.score_value ?? 0),
          is_default: Boolean(payload.is_default ?? false),
          is_other: Boolean(payload.is_other ?? false),
          created_at: (payload.created_at as string | undefined) ?? now,
          updated_at: (payload.updated_at as string | undefined) ?? now,
        }),
      );

      for (const row of rows) {
        const existingIndex = state.questionOptions.findIndex((item) => item.id === row.id);
        if (existingIndex >= 0) {
          state.questionOptions[existingIndex] = row;
        } else {
          state.questionOptions.push(row);
        }
      }

      return rows;
    }
    default:
      throw new Error(`Preview admin store does not handle table ${table}.`);
  }
}

function updateRows(
  state: PreviewAdminState,
  table: string,
  payload: Record<string, unknown>,
  filters: FilterRule[],
) {
  const rows = getTableRows(state, table) as Array<
    Record<string, unknown> & {
      updated_at?: string;
      status?: string;
      archived_at?: string | null;
    }
  >;
  const now = nowIso();
  const updatedRows: Record<string, unknown>[] = [];

  for (const row of rows) {
    const matches = filters.every((filter) => {
      const value = row[filter.column];
      return filter.kind === 'eq' ? value === filter.value : value !== filter.value;
    });

    if (!matches) {
      continue;
    }

    Object.assign(row, payload);
    row.updated_at = now;

    if (table === '117_webinars' && row.status === 'archived' && !row.archived_at) {
      row.archived_at = now;
    }

    if (table === '117_questionnaires' && payload.status === 'archived' && !row.archived_at) {
      row.archived_at = now;
    }

    updatedRows.push({ ...row });
  }

  return updatedRows;
}

class PreviewSupabaseQueryBuilder {
  private operation: 'select' | 'insert' | 'update' | null = null;
  private payload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private filters: FilterRule[] = [];
  private orders: OrderRule[] = [];
  private limitCount: number | null = null;

  constructor(private readonly table: string) {}

  select(columns?: string) {
    void columns;
    if (this.operation == null) {
      this.operation = 'select';
    }

    return this;
  }

  insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: Record<string, unknown>) {
    this.operation = 'update';
    this.payload = payload;
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ kind: 'eq', column, value });
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push({ kind: 'neq', column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({
      column,
      ascending: options?.ascending ?? true,
    });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  async maybeSingle() {
    const result = await this.execute();
    if (result.error) {
      return result;
    }

    if (Array.isArray(result.data)) {
      return {
        data: (result.data[0] as Record<string, unknown> | undefined) ?? null,
        error: null,
      };
    }

    return result;
  }

  async single() {
    const result = await this.execute();
    if (result.error) {
      return result;
    }

    if (!Array.isArray(result.data)) {
      if (result.data == null) {
        return {
          data: null,
          error: new Error('Expected a single row but found none.'),
        };
      }

      return result;
    }

    if (result.data.length !== 1) {
      return {
        data: null,
        error: new Error(
          `Expected a single row but found ${result.data.length}.`,
        ),
      };
    }

    return {
      data: result.data[0],
      error: null,
    };
  }

  then<TResult1 = unknown, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: Error | null }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | null,
  ) {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    const state = await readPreviewState();

    try {
      switch (this.operation ?? 'select') {
        case 'select': {
          const rows = readRowsForSelect(
            state,
            this.table,
            this.filters,
            this.orders,
            this.limitCount,
          );

          return {
            data: rows,
            error: null,
          };
        }
        case 'insert': {
          const payloads = Array.isArray(this.payload) ? this.payload : [this.payload ?? {}];
          const rows = await mutatePreviewState((draft) => insertRows(draft, this.table, payloads));
          return {
            data: rows,
            error: null,
          };
        }
        case 'update': {
          const rows = await mutatePreviewState((draft) =>
            updateRows(draft, this.table, (this.payload ?? {}) as Record<string, unknown>, this.filters),
          );
          return {
            data: rows,
            error: null,
          };
        }
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    return {
      data: null,
      error: null,
    };
  }
}

async function mutatePreviewState<T>(mutator: (state: PreviewAdminState) => T | Promise<T>) {
  const state = await readPreviewState();
  const result = await mutator(state);
  await writePreviewState(state);
  return result;
}

class PreviewSupabaseAdminClient {
  from(table: string) {
    return new PreviewSupabaseQueryBuilder(table);
  }
}

export function shouldUsePreviewAdminStore() {
  return isAdminAuthBypassEnabled() && !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
}

export function createPreviewSupabaseAdminClient() {
  return new PreviewSupabaseAdminClient() as unknown as SupabaseClient;
}
