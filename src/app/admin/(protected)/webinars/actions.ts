'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { requireAdminSession } from '@/lib/auth';
import { initialMutationState, type MutationState } from '@/lib/admin/form-state';
import {
  readId,
  readOptionalDateTime,
  readOptionalText,
  readText,
} from '@/lib/admin/form-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const webinarMutationSchema = z.object({
  id: z.string().uuid().nullable(),
  title: z.string().trim().min(1, 'Title is required.').max(200),
  description: z.string().trim().max(4_000).nullable(),
  starts_at: z.string().trim().nullable(),
  ends_at: z.string().trim().nullable(),
  timezone: z.string().trim().min(1, 'Timezone is required.').max(64),
  status: z.enum(['draft', 'published', 'completed', 'archived']),
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

function buildWebinarInput(formData: FormData) {
  return {
    id: readId(formData, 'id'),
    title: readText(formData, 'title'),
    description: readOptionalText(formData, 'description'),
    starts_at: readOptionalDateTime(formData, 'starts_at'),
    ends_at: readOptionalDateTime(formData, 'ends_at'),
    timezone: readText(formData, 'timezone') || 'UTC',
    status: readText(formData, 'status') || 'draft',
  };
}

export async function upsertWebinarAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const parsed = webinarMutationSchema.safeParse(buildWebinarInput(formData));

  if (!parsed.success) {
    return {
      ...initialMutationState,
      message: 'Please fix the webinar fields and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const { id, title, description, starts_at, ends_at, timezone, status } =
    parsed.data;

  if (starts_at && ends_at && new Date(ends_at).getTime() < new Date(starts_at).getTime()) {
    return {
      ...initialMutationState,
      message: 'Please fix the webinar dates and try again.',
      fieldErrors: {
        ends_at: ['The end date and time must be after the start date.'],
      },
    };
  }

  const payload = {
    title,
    description,
    starts_at,
    ends_at,
    timezone,
    status,
    updated_by: session.userId,
  };

  if (id) {
    const { error } = await supabase
      .from('117_webinars')
      .update(payload)
      .eq('id', id);

    if (error) {
      return {
        ...initialMutationState,
        message: `Could not update webinar: ${error.message}`,
        fieldErrors: {
          _form: [error.message],
        },
      };
    }

    revalidatePath('/admin/webinars');
    revalidatePath(`/admin/webinars/${id}`);
    redirect(`/admin/webinars/${id}`);
  }

  const { data, error } = await supabase
    .from('117_webinars')
    .insert({
      ...payload,
      created_by: session.userId,
    })
    .select('id')
    .single();

  if (error) {
    return {
      ...initialMutationState,
      message: `Could not create webinar: ${error.message}`,
      fieldErrors: {
        _form: [error.message],
      },
    };
  }

  revalidatePath('/admin/webinars');
  redirect(`/admin/webinars/${data.id}`);
}

export async function archiveWebinarAction(formData: FormData) {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const id = readId(formData, 'id');

  if (!id) {
    redirect('/admin/webinars');
  }

  const { error } = await supabase
    .from('117_webinars')
    .update({
      status: 'archived',
      archived_at: new Date().toISOString(),
      updated_by: session.userId,
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Could not archive webinar: ${error.message}`);
  }

  revalidatePath('/admin/webinars');
  revalidatePath(`/admin/webinars/${id}`);
  redirect('/admin/webinars');
}
