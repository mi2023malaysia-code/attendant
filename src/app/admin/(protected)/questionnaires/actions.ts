'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireAdminSession } from '@/lib/auth';
import { initialMutationState, type MutationState } from '@/lib/admin/form-state';
import {
  readId,
  readOptionalText,
  readText,
} from '@/lib/admin/form-utils';
import { findAvailableQuestionnaireSlug } from '@/lib/admin/questionnaires';
import { slugify } from '@/lib/admin/slug';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const questionnaireMutationSchema = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(1, 'Title is required.').max(200),
  slug: z.string().trim().min(1).max(120).optional().nullable(),
  description: z.string().trim().max(4_000).nullable(),
  status: z.enum(['draft', 'published', 'archived']),
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

function buildQuestionnaireInput(formData: FormData) {
  return {
    id: readId(formData, 'id'),
    title: readText(formData, 'title'),
    slug: readOptionalText(formData, 'slug'),
    description: readOptionalText(formData, 'description'),
    status: readText(formData, 'status') || 'draft',
  };
}

async function insertInitialQuestionnaireVersion(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  questionnaireId: string,
  status: 'draft' | 'published' | 'archived',
  createdBy: string,
  changeSummary: string,
) {
  const { error } = await supabase.from('117_questionnaire_versions').insert({
    questionnaire_id: questionnaireId,
    version_number: 1,
    status,
    change_summary: changeSummary,
    published_at: status === 'published' ? new Date().toISOString() : null,
    published_by: status === 'published' ? createdBy : null,
    created_by: createdBy,
  });

  if (error) {
    throw new Error(`Could not create questionnaire version: ${error.message}`);
  }
}

export async function upsertQuestionnaireAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const parsed = questionnaireMutationSchema.safeParse(
    buildQuestionnaireInput(formData),
  );

  if (!parsed.success) {
    return {
      ...initialMutationState,
      message: 'Please fix the questionnaire fields and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { id, title, slug, description, status } = parsed.data;
  const candidateSlug = slugify(slug ?? title);
  const uniqueSlug = await findAvailableQuestionnaireSlug(
    candidateSlug,
    id ?? undefined,
  );

  if (id) {
    const { error } = await supabase
      .from('117_questionnaires')
      .update({
        title,
        slug: uniqueSlug,
        description,
        status,
      })
      .eq('id', id);

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not update questionnaire: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }

    revalidatePath('/admin/questionnaires');
    revalidatePath(`/admin/questionnaires/${id}`);
    redirect(`/admin/questionnaires/${id}`);
  }

  const questionnaireResult = await supabase
    .from('117_questionnaires')
    .insert({
      slug: uniqueSlug,
      title,
      description,
      status,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (questionnaireResult.error) {
    return {
      ...initialMutationState,
      message: `Could not create questionnaire: ${questionnaireResult.error.message}`,
      fieldErrors: {
        _form: [questionnaireResult.error.message],
      },
    };
  }

  await insertInitialQuestionnaireVersion(
    supabase,
    questionnaireResult.data.id,
    status,
    session.userId,
    'Initial questionnaire version created.',
  );

  revalidatePath('/admin/questionnaires');
  redirect(`/admin/questionnaires/${questionnaireResult.data.id}`);
}

export async function archiveQuestionnaireAction(formData: FormData) {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const id = readId(formData, 'id');

  if (!id) {
    redirect('/admin/questionnaires');
  }

  const { error } = await supabase
    .from('117_questionnaires')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Could not archive questionnaire: ${error.message}`);
  }

  revalidatePath('/admin/questionnaires');
  revalidatePath(`/admin/questionnaires/${id}`);
  redirect('/admin/questionnaires');
}

export async function duplicateQuestionnaireAction(formData: FormData) {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const sourceId = readId(formData, 'id');

  if (!sourceId) {
    redirect('/admin/questionnaires');
  }

  const { data: sourceQuestionnaire, error: sourceError } = await supabase
    .from('117_questionnaires')
    .select('id, slug, title, description, status')
    .eq('id', sourceId)
    .maybeSingle();

  if (sourceError) {
    throw new Error(`Could not load questionnaire to duplicate: ${sourceError.message}`);
  }

  if (!sourceQuestionnaire) {
    throw new Error('Questionnaire not found.');
  }

  const sourceSlug = `${sourceQuestionnaire.slug}-copy`;
  const duplicateSlug = await findAvailableQuestionnaireSlug(sourceSlug);

  const { data: duplicatedQuestionnaire, error: duplicateError } = await supabase
    .from('117_questionnaires')
    .insert({
      slug: duplicateSlug,
      title: `${sourceQuestionnaire.title} Copy`,
      description: sourceQuestionnaire.description,
      status: 'draft',
      duplicated_from_questionnaire_id: sourceQuestionnaire.id,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (duplicateError) {
    throw new Error(`Could not duplicate questionnaire: ${duplicateError.message}`);
  }

  await insertInitialQuestionnaireVersion(
    supabase,
    duplicatedQuestionnaire.id,
    'draft',
    session.userId,
    `Duplicated from ${sourceQuestionnaire.slug}.`,
  );

  revalidatePath('/admin/questionnaires');
  redirect(`/admin/questionnaires/${duplicatedQuestionnaire.id}`);
}

export async function createQuestionnaireVersionAction(formData: FormData) {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const questionnaireId = readId(formData, 'questionnaire_id');
  const changeSummary = readOptionalText(formData, 'change_summary');

  if (!questionnaireId) {
    redirect('/admin/questionnaires');
  }

  const { data: versions, error: versionsError } = await supabase
    .from('117_questionnaire_versions')
    .select('version_number')
    .eq('questionnaire_id', questionnaireId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (versionsError) {
    throw new Error(`Could not load versions: ${versionsError.message}`);
  }

  const nextVersionNumber = ((versions?.[0]?.version_number as number | undefined) ?? 0) + 1;

  const { error } = await supabase.from('117_questionnaire_versions').insert({
    questionnaire_id: questionnaireId,
    version_number: nextVersionNumber,
    status: 'draft',
    change_summary: changeSummary ?? 'New questionnaire draft created.',
    created_by: session.userId,
  });

  if (error) {
    throw new Error(`Could not create questionnaire version: ${error.message}`);
  }

  revalidatePath(`/admin/questionnaires/${questionnaireId}`);
  redirect(`/admin/questionnaires/${questionnaireId}`);
}
