'use server';

import { randomUUID } from 'node:crypto';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { initialMutationState, type MutationState } from '@/lib/admin/form-state';
import { readOptionalText, readText } from '@/lib/admin/form-utils';
import type { QuestionWithOptions } from '@/lib/admin/questions';
import { loadAttendeeQuestionnaireContext } from '@/lib/attendee/questionnaire';
import type { ResponseRecord } from '@/lib/attendee/response-storage';
import { getSupabaseAttendeeClient } from '@/lib/supabase/attendee';
import {
  saveLocalAttendeeQuestionnaireContext,
  shouldUseLocalAttendeeStore,
} from '@/lib/attendee/local-store';

const attendeeSubmissionSchema = z.object({
  token: z.string().trim().min(1, 'Invitation token is required.'),
  intent: z.enum(['save_draft', 'submit']),
  respondent_name: z.string().trim().min(1, 'Name is required.').max(200),
  respondent_email: z.string().trim().email('Enter a valid email address.').max(320),
  respondent_phone: z.string().trim().max(80).nullable(),
  respondent_organisation: z.string().trim().max(200).nullable(),
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

type ParsedAnswer = {
  selected_option_id: string | null;
  raw_value_jsonb: Record<string, unknown> | null;
  score_value: number | null;
  is_unanswered: boolean;
};

function getQuestionOptionById(question: QuestionWithOptions, optionId: string) {
  return question.options.find((option) => option.id === optionId) ?? null;
}

function parseAnswer(
  question: QuestionWithOptions,
  formData: FormData,
): { answer: ParsedAnswer; error: string | null } {
  const fieldName = question.id;

  if (question.question_type === 'multiple_choice') {
    const rawValues = formData
      .getAll(fieldName)
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.trim())
      .filter(Boolean);

    if (rawValues.length === 0) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: null,
      };
    }

    const selectedOptions = rawValues
      .map((value) => getQuestionOptionById(question, value))
      .filter((option): option is NonNullable<typeof option> => option !== null);

    if (selectedOptions.length !== rawValues.length) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: 'One or more selected options are invalid.',
      };
    }

    const scoreValue = selectedOptions.reduce(
      (total, option) => total + Number(option.score_value ?? 0),
      0,
    );

    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: {
          selected_option_ids: rawValues,
          selected_option_labels: selectedOptions.map((option) => option.option_label),
        },
        score_value: scoreValue,
        is_unanswered: false,
      },
      error: null,
    };
  }

  if (question.question_type === 'single_choice' || question.question_type === 'dropdown') {
    const rawValue = readText(formData, fieldName);

    if (!rawValue) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: null,
      };
    }

    const option = getQuestionOptionById(question, rawValue);

    if (!option) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: 'Select a valid option.',
      };
    }

    return {
      answer: {
        selected_option_id: option.id,
        raw_value_jsonb: {
          option_id: option.id,
          option_key: option.option_key,
          option_label: option.option_label,
        },
        score_value: Number(option.score_value ?? 0),
        is_unanswered: false,
      },
      error: null,
    };
  }

  if (question.question_type === 'yes_no') {
    const rawValue = readText(formData, fieldName);

    if (!rawValue) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: null,
      };
    }

    const option = getQuestionOptionById(question, rawValue);

    if (option) {
      return {
        answer: {
          selected_option_id: option.id,
          raw_value_jsonb: {
            option_id: option.id,
            option_key: option.option_key,
            option_label: option.option_label,
          },
          score_value: Number(option.score_value ?? 0),
          is_unanswered: false,
        },
        error: null,
      };
    }

    if (rawValue === 'yes' || rawValue === 'no') {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: { value: rawValue },
          score_value: rawValue === 'yes' ? 1 : 0,
          is_unanswered: false,
        },
        error: null,
      };
    }

    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: null,
        score_value: null,
        is_unanswered: true,
      },
      error: 'Select a valid yes or no option.',
    };
  }

  const rawValue = readText(formData, fieldName);

  if (!rawValue) {
    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: null,
        score_value: null,
        is_unanswered: true,
      },
      error: null,
    };
  }

  if (question.question_type === 'number' || question.question_type === 'rating_scale') {
    const numericValue = Number(rawValue);

    if (Number.isNaN(numericValue)) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: 'Enter a valid number.',
      };
    }

    if (question.min_value !== null && question.min_value !== undefined && numericValue < question.min_value) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: `Value must be at least ${question.min_value}.`,
      };
    }

    if (question.max_value !== null && question.max_value !== undefined && numericValue > question.max_value) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: `Value must be at most ${question.max_value}.`,
      };
    }

    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: { value: numericValue },
        score_value: numericValue,
        is_unanswered: false,
      },
      error: null,
    };
  }

  if (question.question_type === 'email') {
    const emailSchema = z.string().email('Enter a valid email address.');
    const parsed = emailSchema.safeParse(rawValue);

    if (!parsed.success) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: parsed.error.issues[0]?.message ?? 'Enter a valid email address.',
      };
    }

    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: { value: parsed.data },
        score_value: null,
        is_unanswered: false,
      },
      error: null,
    };
  }

  if (question.question_type === 'date') {
    const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date.');
    const parsed = dateSchema.safeParse(rawValue);

    if (!parsed.success) {
      return {
        answer: {
          selected_option_id: null,
          raw_value_jsonb: null,
          score_value: null,
          is_unanswered: true,
        },
        error: parsed.error.issues[0]?.message ?? 'Enter a valid date.',
      };
    }

    return {
      answer: {
        selected_option_id: null,
        raw_value_jsonb: { value: parsed.data },
        score_value: null,
        is_unanswered: false,
      },
      error: null,
    };
  }

  return {
    answer: {
      selected_option_id: null,
      raw_value_jsonb: { value: rawValue },
      score_value: null,
      is_unanswered: false,
    },
    error: null,
  };
}

function getSubmittedAnswerCount(answers: ParsedAnswer[]) {
  return answers.filter((answer) => !answer.is_unanswered).length;
}

function getQuestionFieldLabel(question: QuestionWithOptions) {
  return question.prompt;
}

const responseSelect = [
  'id',
  'assignment_id',
  'invitation_token_id',
  'attendee_id',
  'status',
  'respondent_name',
  'respondent_email',
  'respondent_phone',
  'respondent_organisation',
  'started_at',
  'last_saved_at',
  'submitted_at',
  'locked_at',
  'completion_percent',
  'answered_count',
  'unanswered_count',
  'created_at',
  'updated_at',
].join(', ');

export async function saveAttendeeQuestionnaireAction(
  _previousState: MutationState,
  formData: FormData,
): Promise<MutationState> {
  const token = readText(formData, 'token');
  const intent = readText(formData, 'intent');
  const context = await loadAttendeeQuestionnaireContext(token);

  if (!context) {
    return {
      ...initialMutationState,
      message: 'This invitation link is unavailable or has expired.',
      fieldErrors: {
        _form: ['This invitation link is unavailable or has expired.'],
      },
    };
  }

  if (context.response?.status && context.response.status !== 'draft') {
    return {
      ...initialMutationState,
      message: 'This questionnaire has already been submitted.',
      fieldErrors: {
        _form: ['Submitted responses cannot be edited.'],
      },
    };
  }

  const parsed = attendeeSubmissionSchema.safeParse({
    token,
    intent,
    respondent_name: readText(formData, 'respondent_name'),
    respondent_email: readText(formData, 'respondent_email'),
    respondent_phone: readOptionalText(formData, 'respondent_phone'),
    respondent_organisation: readOptionalText(formData, 'respondent_organisation'),
  });

  if (!parsed.success) {
    return {
      ...initialMutationState,
      message: 'Please fix the attendee details and try again.',
      fieldErrors: toFieldErrors(parsed.error.issues),
    };
  }

  const now = new Date().toISOString();

  const answerErrors: Record<string, string[]> = {};
  const answerRows = context.questions.map((question) => {
    const parsedAnswer = parseAnswer(question, formData);

    if (parsedAnswer.error) {
      answerErrors[question.id] = [
        ...(answerErrors[question.id] ?? []),
        parsedAnswer.error,
      ];
    }

    if (parsed.data.intent === 'submit' && question.required && parsedAnswer.answer.is_unanswered) {
      answerErrors[question.id] = [
        ...(answerErrors[question.id] ?? []),
        `${getQuestionFieldLabel(question)} is required.`,
      ];
    }

    return {
      response_id: context.response?.id ?? null,
      question_id: question.id,
      selected_option_id: parsedAnswer.answer.selected_option_id,
      raw_value_jsonb: parsedAnswer.answer.raw_value_jsonb,
      score_value: parsedAnswer.answer.score_value,
      is_unanswered: parsedAnswer.answer.is_unanswered,
    };
  });

  if (Object.keys(answerErrors).length > 0) {
    return {
      ...initialMutationState,
      message: 'Please fix the questionnaire answers and try again.',
      fieldErrors: answerErrors,
    };
  }

  const answeredCount = getSubmittedAnswerCount(
    answerRows.map((answer) => ({
      selected_option_id: answer.selected_option_id,
      raw_value_jsonb: answer.raw_value_jsonb,
      score_value: answer.score_value,
      is_unanswered: answer.is_unanswered,
    })),
  );
  const unansweredCount = Math.max(context.questions.length - answeredCount, 0);
  const completionPercent =
    context.questions.length === 0
      ? 0
      : Number(((answeredCount / context.questions.length) * 100).toFixed(2));
  const shouldSubmit = parsed.data.intent === 'submit';
  const responsePayload: Record<string, unknown> = {
    assignment_id: context.assignment.id,
    invitation_token_id: context.invitationToken.id,
    attendee_id: context.attendee.id,
    status: 'draft',
    respondent_name: parsed.data.respondent_name,
    respondent_email: parsed.data.respondent_email,
    respondent_phone: parsed.data.respondent_phone,
    respondent_organisation: parsed.data.respondent_organisation,
    last_saved_at: now,
    completion_percent: completionPercent,
    answered_count: answeredCount,
    unanswered_count: unansweredCount,
  };

  if (context.response?.id) {
    responsePayload.id = context.response.id;
  }

  if (shouldUseLocalAttendeeStore()) {
    const responseId = (responsePayload.id as string | undefined) ?? randomUUID();
    const responseStartedAt = context.response?.started_at ?? now;
    const responseCreatedAt = context.response?.created_at ?? now;
    const existingAnswersByQuestionId = new Map(
      context.responseAnswers.map((answer) => [answer.question_id, answer]),
    );

    context.attendee = {
      ...context.attendee,
      full_name: parsed.data.respondent_name,
      email: parsed.data.respondent_email,
      email_normalized: parsed.data.respondent_email.trim().toLowerCase(),
      phone: parsed.data.respondent_phone,
      organisation: parsed.data.respondent_organisation,
      last_seen_at: now,
      updated_at: now,
    };

    context.response = {
      id: responseId,
      assignment_id: context.assignment.id,
      invitation_token_id: context.invitationToken.id,
      attendee_id: context.attendee.id,
      status: shouldSubmit ? 'submitted' : 'draft',
      respondent_name: parsed.data.respondent_name,
      respondent_email: parsed.data.respondent_email,
      respondent_phone: parsed.data.respondent_phone,
      respondent_organisation: parsed.data.respondent_organisation,
      started_at: responseStartedAt,
      last_saved_at: now,
      submitted_at: shouldSubmit ? now : context.response?.submitted_at ?? null,
      locked_at: shouldSubmit ? now : context.response?.locked_at ?? null,
      completion_percent: completionPercent,
      answered_count: answeredCount,
      unanswered_count: unansweredCount,
      created_at: responseCreatedAt,
      updated_at: now,
    };

    context.responseAnswers = answerRows.map((answer) => {
      const existingAnswer = existingAnswersByQuestionId.get(answer.question_id);

      return {
        id: existingAnswer?.id ?? randomUUID(),
        response_id: responseId,
        question_id: answer.question_id,
        selected_option_id: answer.selected_option_id,
        raw_value_jsonb: answer.raw_value_jsonb,
        score_value: answer.score_value,
        is_unanswered: answer.is_unanswered,
        created_at: existingAnswer?.created_at ?? now,
        updated_at: now,
      };
    });

    context.invitationToken = {
      ...context.invitationToken,
      status: shouldSubmit
        ? 'completed'
        : context.invitationToken.status === 'issued'
          ? 'opened'
          : context.invitationToken.status,
      claimed_at: context.invitationToken.claimed_at ?? now,
      updated_at: now,
    };

    await saveLocalAttendeeQuestionnaireContext(context);
    revalidatePath(`/attendee/${encodeURIComponent(context.rawToken)}`);
    redirect(`/attendee/${encodeURIComponent(context.rawToken)}`);
  }

  const supabase = getSupabaseAttendeeClient(token);

  const attendeeUpdate = await supabase
    .from('117_attendees')
    .update({
      full_name: parsed.data.respondent_name,
      email: parsed.data.respondent_email,
      phone: parsed.data.respondent_phone,
      organisation: parsed.data.respondent_organisation,
      last_seen_at: now,
    })
    .eq('id', context.attendee.id);

  if (attendeeUpdate.error) {
    return {
      ...initialMutationState,
      message: `Could not update attendee details: ${attendeeUpdate.error.message}`,
      fieldErrors: {
        _form: [attendeeUpdate.error.message],
      },
    };
  }

  const responseUpsert = await supabase
    .from('117_responses')
    .upsert(responsePayload, { onConflict: 'invitation_token_id' })
    .select(responseSelect)
    .single();

  if (responseUpsert.error) {
    return {
      ...initialMutationState,
      message: `Could not save the response: ${responseUpsert.error.message}`,
      fieldErrors: {
        _form: [responseUpsert.error.message],
      },
    };
  }

  const response = responseUpsert.data as unknown as ResponseRecord;

  const responseAnswerRows = answerRows.map((answer) => ({
    ...answer,
    response_id: response.id,
  }));

  const answersUpsert = await supabase
    .from('117_response_answers')
    .upsert(responseAnswerRows, {
      onConflict: 'response_id,question_id',
    });

  if (answersUpsert.error) {
    return {
      ...initialMutationState,
      message: `Could not save the answers: ${answersUpsert.error.message}`,
      fieldErrors: {
        _form: [answersUpsert.error.message],
      },
    };
  }

  if (shouldSubmit) {
    const submittedResponse = await supabase
      .from('117_responses')
      .update({
        status: 'submitted',
        submitted_at: now,
        locked_at: now,
        last_saved_at: now,
        completion_percent: completionPercent,
        answered_count: answeredCount,
        unanswered_count: unansweredCount,
      })
      .eq('id', response.id);

    if (submittedResponse.error) {
      return {
        ...initialMutationState,
        message: `Could not complete the response: ${submittedResponse.error.message}`,
        fieldErrors: {
          _form: [submittedResponse.error.message],
        },
      };
    }

    const tokenUpdate = await supabase
      .from('117_invitation_tokens')
      .update({
        status: 'completed',
        claimed_at: context.invitationToken.claimed_at ?? now,
      })
      .eq('id', context.invitationToken.id);

    if (tokenUpdate.error) {
      return {
        ...initialMutationState,
        message: `Could not complete the invitation token: ${tokenUpdate.error.message}`,
        fieldErrors: {
          _form: [tokenUpdate.error.message],
        },
      };
    }
  }

  revalidatePath(`/attendee/${encodeURIComponent(context.rawToken)}`);
  redirect(`/attendee/${encodeURIComponent(context.rawToken)}`);
}
