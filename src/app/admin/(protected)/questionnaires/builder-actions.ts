'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireAdminSession } from '@/lib/auth';
import { initialMutationState, type MutationState } from '@/lib/admin/form-state';
import {
  readBoolean,
  readId,
  readOptionalNumber,
  readOptionalText,
  readText,
} from '@/lib/admin/form-utils';
import {
  QUESTION_TYPES,
  getQuestionnaireVersionById,
  type QuestionType,
} from '@/lib/admin/questions';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const questionTypeSchema = z.enum(QUESTION_TYPES);

const questionMutationSchema = z.object({
  id: z.string().uuid().nullable(),
  questionnaire_version_id: z.string().uuid(),
  topic_id: z.string().uuid().nullable(),
  benchmark_key: z.string().trim().max(120).nullable(),
  prompt: z.string().trim().min(1, 'Question text is required.').max(4_000),
  help_text: z.string().trim().max(4_000).nullable(),
  question_type: questionTypeSchema,
  required: z.boolean(),
  display_order: z.number().int().min(1, 'Display order is required.'),
  score_weight: z.number().min(0),
  min_value: z.number().nullable(),
  max_value: z.number().nullable(),
});

const questionOptionMutationSchema = z.object({
  id: z.string().uuid().nullable(),
  question_id: z.string().uuid(),
  option_key: z.string().trim().min(1, 'Option key is required.').max(120),
  option_label: z.string().trim().min(1, 'Option label is required.').max(500),
  display_order: z.number().int().min(1, 'Display order is required.'),
  score_value: z.number().min(0),
  is_default: z.boolean(),
  is_other: z.boolean(),
});

function toFieldErrors(issues: z.ZodIssue[]) {
  const fieldErrors: Record<string, string[]> = {};

  for (const issue of issues) {
    const fieldName = issue.path[0];
    const key = typeof fieldName === 'string' ? fieldName : '_form';
    fieldErrors[key] = [...(fieldErrors[key] ?? []), issue.message];
  }

  return fieldErrors;
}

function buildQuestionInput(formData: FormData) {
  return {
    id: readId(formData, 'id'),
    questionnaire_version_id: readText(formData, 'questionnaire_version_id'),
    topic_id: readId(formData, 'topic_id'),
    benchmark_key: readOptionalText(formData, 'benchmark_key'),
    prompt: readText(formData, 'prompt'),
    help_text: readOptionalText(formData, 'help_text'),
    question_type: readText(formData, 'question_type') as QuestionType,
    required: readBoolean(formData, 'required'),
    display_order: Number(readText(formData, 'display_order') || '1'),
    score_weight: Number(readText(formData, 'score_weight') || '1'),
    min_value: readOptionalNumber(formData, 'min_value'),
    max_value: readOptionalNumber(formData, 'max_value'),
  };
}

function buildQuestionOptionInput(formData: FormData) {
  return {
    id: readId(formData, 'id'),
    question_id: readText(formData, 'question_id'),
    option_key: readText(formData, 'option_key'),
    option_label: readText(formData, 'option_label'),
    display_order: Number(readText(formData, 'display_order') || '1'),
    score_value: Number(readText(formData, 'score_value') || '0'),
    is_default: readBoolean(formData, 'is_default'),
    is_other: readBoolean(formData, 'is_other'),
  };
}

async function getEditableVersion(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  questionnaireVersionId: string,
) {
  const { data, error } = await supabase
    .from('117_questionnaire_versions')
    .select('id, questionnaire_id, status')
    .eq('id', questionnaireVersionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load questionnaire version: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  return data as {
    id: string;
    questionnaire_id: string;
    status: 'draft' | 'published' | 'archived';
  };
}

async function getQuestionParentVersion(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  questionId: string,
) {
  const { data, error } = await supabase
    .from('117_questions')
    .select('id, questionnaire_version_id')
    .eq('id', questionId)
    .maybeSingle();

  if (error) {
    throw new Error(`Could not load question: ${error.message}`);
  }

  if (!data) {
    return null;
  }

  const version = await getQuestionnaireVersionById(
    data.questionnaire_version_id,
  );

  if (!version) {
    return null;
  }

  return {
    id: data.id,
    questionnaire_version_id: data.questionnaire_version_id,
    questionnaireVersion: version,
  };
}

export async function upsertQuestionAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const parsed = questionMutationSchema.safeParse(buildQuestionInput(formData));

  if (!parsed.success) {
    return {
      ...initialMutationState,
      message: 'Please fix the question fields and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { id, questionnaire_version_id, ...rest } = parsed.data;
  const version = await getEditableVersion(supabase, questionnaire_version_id);

  if (!version) {
    return {
      ...initialMutationState,
      message: 'Questionnaire version not found.',
      fieldErrors: {
        _form: ['Questionnaire version not found.'],
      },
    };
  }

  if (version.status !== 'draft') {
    return {
      ...initialMutationState,
      message: 'Only draft questionnaire versions can be edited.',
      fieldErrors: {
        _form: ['Published questionnaire versions are immutable.'],
      },
    };
  }

  const payload = {
    questionnaire_version_id: version.id,
    topic_id: rest.topic_id,
    benchmark_key: rest.benchmark_key,
    prompt: rest.prompt,
    help_text: rest.help_text,
    question_type: rest.question_type,
    required: rest.required,
    display_order: rest.display_order,
    score_weight: rest.score_weight,
    min_value: rest.min_value,
    max_value: rest.max_value,
    settings_jsonb: {},
    updated_by: session.userId,
  };

  if (id) {
    const { error } = await supabase
      .from('117_questions')
      .update(payload)
      .eq('id', id)
      .eq('questionnaire_version_id', version.id);

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not update question: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }
  } else {
    const { error } = await supabase.from('117_questions').insert({
      ...payload,
      created_by: session.userId,
    });

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not create question: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }
  }

  revalidatePath(`/admin/questionnaires/${version.questionnaire_id}`);
  redirect(`/admin/questionnaires/${version.questionnaire_id}`);
}

export async function upsertQuestionOptionAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const parsed = questionOptionMutationSchema.safeParse(
    buildQuestionOptionInput(formData),
  );

  if (!parsed.success) {
    return {
      ...initialMutationState,
      message: 'Please fix the option fields and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { id, question_id, ...rest } = parsed.data;
  const question = await getQuestionParentVersion(supabase, question_id);

  if (!question) {
    return {
      ...initialMutationState,
      message: 'Question not found.',
      fieldErrors: {
        _form: ['Question not found.'],
      },
    };
  }

  if (question.questionnaireVersion.status !== 'draft') {
    return {
      ...initialMutationState,
      message: 'Only draft questionnaire versions can be edited.',
      fieldErrors: {
        _form: ['Published questionnaire versions are immutable.'],
      },
    };
  }

  const payload = {
    question_id,
    option_key: rest.option_key,
    option_label: rest.option_label,
    display_order: rest.display_order,
    score_value: rest.score_value,
    is_default: rest.is_default,
    is_other: rest.is_other,
  };

  if (id) {
    const { error } = await supabase
      .from('117_question_options')
      .update(payload)
      .eq('id', id)
      .eq('question_id', question_id);

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not update option: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }
  } else {
    const { error } = await supabase.from('117_question_options').insert(payload);

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not create option: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }
  }

  revalidatePath(
    `/admin/questionnaires/${question.questionnaireVersion.questionnaire_id}`,
  );
  redirect(`/admin/questionnaires/${question.questionnaireVersion.questionnaire_id}`);
}
