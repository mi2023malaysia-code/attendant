import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { toRow, toRows } from '@/lib/supabase/cast';
import { slugify } from '@/lib/admin/slug';

export type QuestionnaireRecord = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'archived';
  duplicated_from_questionnaire_id: string | null;
  created_by: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionnaireVersionRecord = {
  id: string;
  questionnaire_id: string;
  version_number: number;
  status: 'draft' | 'published' | 'archived';
  change_summary: string | null;
  published_at: string | null;
  published_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionnaireWithVersionSummary = QuestionnaireRecord & {
  version_count: number;
  latest_version: QuestionnaireVersionRecord | null;
};

const questionnaireSelect = [
  'id',
  'slug',
  'title',
  'description',
  'status',
  'duplicated_from_questionnaire_id',
  'created_by',
  'archived_at',
  'created_at',
  'updated_at',
].join(', ');

const versionSelect = [
  'id',
  'questionnaire_id',
  'version_number',
  'status',
  'change_summary',
  'published_at',
  'published_by',
  'created_by',
  'created_at',
  'updated_at',
].join(', ');

export async function listAdminQuestionnaires() {
  const supabase = await createSupabaseAdminClient();

  const [questionnairesResult, versionsResult] = await Promise.all([
    supabase
      .from('117_questionnaires')
      .select(questionnaireSelect)
      .order('created_at', { ascending: false }),
    supabase
      .from('117_questionnaire_versions')
      .select(versionSelect)
      .order('version_number', { ascending: false }),
  ]);

  if (questionnairesResult.error) {
    throw new Error(
      `Failed to load questionnaires: ${questionnairesResult.error.message}`,
    );
  }

  if (versionsResult.error) {
    throw new Error(
      `Failed to load questionnaire versions: ${versionsResult.error.message}`,
    );
  }

  const questionnaireRows = toRows<QuestionnaireRecord>(
    questionnairesResult.data,
  );
  const versionRows = toRows<QuestionnaireVersionRecord>(versionsResult.data);

  const versionsByQuestionnaireId = new Map<string, QuestionnaireVersionRecord[]>();

  for (const version of versionRows) {
    const current = versionsByQuestionnaireId.get(version.questionnaire_id) ?? [];
    current.push(version);
    versionsByQuestionnaireId.set(version.questionnaire_id, current);
  }

  return questionnaireRows.map<QuestionnaireWithVersionSummary>((questionnaire) => {
    const questionnaireVersions = versionsByQuestionnaireId.get(questionnaire.id) ?? [];

    return {
      ...questionnaire,
      version_count: questionnaireVersions.length,
      latest_version: questionnaireVersions[0] ?? null,
    };
  });
}

export async function getAdminQuestionnaire(id: string) {
  const supabase = await createSupabaseAdminClient();

  const [questionnaireResult, versionsResult] = await Promise.all([
    supabase
      .from('117_questionnaires')
      .select(questionnaireSelect)
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('117_questionnaire_versions')
      .select(versionSelect)
      .eq('questionnaire_id', id)
      .order('version_number', { ascending: false }),
  ]);

  if (questionnaireResult.error) {
    throw new Error(
      `Failed to load questionnaire: ${questionnaireResult.error.message}`,
    );
  }

  if (versionsResult.error) {
    throw new Error(
      `Failed to load questionnaire versions: ${versionsResult.error.message}`,
    );
  }

  return {
    questionnaire: toRow<QuestionnaireRecord>(questionnaireResult.data),
    versions: toRows<QuestionnaireVersionRecord>(versionsResult.data),
  };
}

export async function findAvailableQuestionnaireSlug(
  baseTitleOrSlug: string,
  excludedQuestionnaireId?: string,
) {
  const supabase = await createSupabaseAdminClient();
  const baseSlug = slugify(baseTitleOrSlug);
  let candidate = baseSlug;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let query = supabase
      .from('117_questionnaires')
      .select('id')
      .eq('slug', candidate)
      .limit(1);

    if (excludedQuestionnaireId) {
      query = query.neq('id', excludedQuestionnaireId);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to check questionnaire slug: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return candidate;
    }

    candidate = `${baseSlug}-${attempt + 2}`;
  }

  throw new Error('Unable to generate a unique questionnaire slug.');
}
