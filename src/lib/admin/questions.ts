import 'server-only';

import { QUESTION_TYPES, type QuestionType } from './question-types';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { toRow, toRows } from '@/lib/supabase/cast';

export { QUESTION_TYPES } from './question-types';
export type { QuestionType } from './question-types';

export type QuestionRecord = {
  id: string;
  questionnaire_version_id: string;
  topic_id: string | null;
  benchmark_key: string | null;
  prompt: string;
  help_text: string | null;
  question_type: QuestionType;
  required: boolean;
  display_order: number;
  score_weight: number;
  min_value: number | null;
  max_value: number | null;
  settings_jsonb: Record<string, unknown>;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionOptionRecord = {
  id: string;
  question_id: string;
  option_key: string;
  option_label: string;
  display_order: number;
  score_value: number;
  is_default: boolean;
  is_other: boolean;
  created_at: string;
  updated_at: string;
};

export type QuestionWithOptions = QuestionRecord & {
  options: QuestionOptionRecord[];
};

const questionSelect = [
  'id',
  'questionnaire_version_id',
  'topic_id',
  'benchmark_key',
  'prompt',
  'help_text',
  'question_type',
  'required',
  'display_order',
  'score_weight',
  'min_value',
  'max_value',
  'settings_jsonb',
  'created_by',
  'updated_by',
  'created_at',
  'updated_at',
].join(', ');

const optionSelect = [
  'id',
  'question_id',
  'option_key',
  'option_label',
  'display_order',
  'score_value',
  'is_default',
  'is_other',
  'created_at',
  'updated_at',
].join(', ');

export async function listAdminQuestions(questionnaireVersionId: string) {
  const supabase = await createSupabaseServerClient();

  const [questionsResult, optionsResult] = await Promise.all([
    supabase
      .from('117_questions')
      .select(questionSelect)
      .eq('questionnaire_version_id', questionnaireVersionId)
      .order('display_order', { ascending: true }),
    supabase
      .from('117_question_options')
      .select(optionSelect)
      .order('display_order', { ascending: true }),
  ]);

  if (questionsResult.error) {
    throw new Error(`Failed to load questions: ${questionsResult.error.message}`);
  }

  if (optionsResult.error) {
    throw new Error(
      `Failed to load question options: ${optionsResult.error.message}`,
    );
  }

  const questions = toRows<QuestionRecord>(questionsResult.data);
  const options = toRows<QuestionOptionRecord>(optionsResult.data);
  const optionsByQuestionId = new Map<string, QuestionOptionRecord[]>();

  for (const option of options) {
    const current = optionsByQuestionId.get(option.question_id) ?? [];
    current.push(option);
    optionsByQuestionId.set(option.question_id, current);
  }

  return questions.map<QuestionWithOptions>((question) => ({
    ...question,
    options: optionsByQuestionId.get(question.id) ?? [],
  }));
}

export async function getAdminQuestion(questionId: string) {
  const supabase = await createSupabaseServerClient();

  const [questionResult, optionsResult] = await Promise.all([
    supabase
      .from('117_questions')
      .select(questionSelect)
      .eq('id', questionId)
      .maybeSingle(),
    supabase
      .from('117_question_options')
      .select(optionSelect)
      .eq('question_id', questionId)
      .order('display_order', { ascending: true }),
  ]);

  if (questionResult.error) {
    throw new Error(`Failed to load question: ${questionResult.error.message}`);
  }

  if (optionsResult.error) {
    throw new Error(
      `Failed to load question options: ${optionsResult.error.message}`,
    );
  }

  return {
    question: toRow<QuestionRecord>(questionResult.data),
    options: toRows<QuestionOptionRecord>(optionsResult.data),
  };
}

export async function getQuestionnaireVersionById(
  questionnaireVersionId: string,
) {
  const supabase = await createSupabaseServerClient();
  const result = await supabase
    .from('117_questionnaire_versions')
    .select('id, questionnaire_id, status, version_number, created_at, updated_at')
    .eq('id', questionnaireVersionId)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Failed to load questionnaire version: ${result.error.message}`);
  }

  return result.data as
    | {
        id: string;
        questionnaire_id: string;
        status: 'draft' | 'published' | 'archived';
        version_number: number;
        created_at: string;
        updated_at: string;
      }
    | null;
}

export const getDraftQuestionnaireVersion = getQuestionnaireVersionById;
