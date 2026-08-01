import 'server-only';

import { getSupabaseServiceClient } from '@/lib/supabase/service-role';

export type ResponseRecord = {
  id: string;
  assignment_id: string;
  invitation_token_id: string;
  attendee_id: string;
  status: 'draft' | 'submitted' | 'locked';
  respondent_name: string;
  respondent_email: string;
  respondent_phone: string | null;
  respondent_organisation: string | null;
  started_at: string;
  last_saved_at: string | null;
  submitted_at: string | null;
  locked_at: string | null;
  completion_percent: number;
  answered_count: number;
  unanswered_count: number;
  created_at: string;
  updated_at: string;
};

export type ResponseAnswerRecord = {
  id: string;
  response_id: string;
  question_id: string;
  selected_option_id: string | null;
  raw_value_jsonb: Record<string, unknown> | null;
  score_value: number | null;
  is_unanswered: boolean;
  created_at: string;
  updated_at: string;
};

export type DraftResponsePayload = {
  assignment_id: string;
  invitation_token_id: string;
  attendee_id: string;
  respondent_name: string;
  respondent_email: string;
  respondent_phone?: string | null;
  respondent_organisation?: string | null;
};

export type SaveResponseAnswerPayload = {
  response_id: string;
  question_id: string;
  selected_option_id?: string | null;
  raw_value_jsonb?: Record<string, unknown> | null;
  score_value?: number | null;
  is_unanswered?: boolean;
};

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

const responseAnswerSelect = [
  'id',
  'response_id',
  'question_id',
  'selected_option_id',
  'raw_value_jsonb',
  'score_value',
  'is_unanswered',
  'created_at',
  'updated_at',
].join(', ');

export async function getDraftResponseByInvitationToken(invitationTokenId: string) {
  const supabase = getSupabaseServiceClient();
  const result = await supabase
    .from('117_responses')
    .select(responseSelect)
    .eq('invitation_token_id', invitationTokenId)
    .maybeSingle();

  if (result.error) {
    throw new Error(`Failed to load response draft: ${result.error.message}`);
  }

  return (result.data ?? null) as ResponseRecord | null;
}

export async function getResponseAnswers(responseId: string) {
  const supabase = getSupabaseServiceClient();
  const result = await supabase
    .from('117_response_answers')
    .select(responseAnswerSelect)
    .eq('response_id', responseId)
    .order('created_at', { ascending: true });

  if (result.error) {
    throw new Error(`Failed to load response answers: ${result.error.message}`);
  }

  return (result.data ?? []) as ResponseAnswerRecord[];
}

export async function ensureDraftResponse(payload: DraftResponsePayload) {
  const supabase = getSupabaseServiceClient();
  const existing = await getDraftResponseByInvitationToken(payload.invitation_token_id);

  if (existing) {
    return existing;
  }

  const result = await supabase
    .from('117_responses')
    .insert({
      assignment_id: payload.assignment_id,
      invitation_token_id: payload.invitation_token_id,
      attendee_id: payload.attendee_id,
      status: 'draft',
      respondent_name: payload.respondent_name,
      respondent_email: payload.respondent_email,
      respondent_phone: payload.respondent_phone ?? null,
      respondent_organisation: payload.respondent_organisation ?? null,
      last_saved_at: new Date().toISOString(),
    })
    .select(responseSelect)
    .single();

  if (result.error) {
    throw new Error(`Failed to create response draft: ${result.error.message}`);
  }

  return result.data as ResponseRecord;
}

export async function saveResponseAnswer(payload: SaveResponseAnswerPayload) {
  const supabase = getSupabaseServiceClient();
  const result = await supabase
    .from('117_response_answers')
    .upsert(
      {
        response_id: payload.response_id,
        question_id: payload.question_id,
        selected_option_id: payload.selected_option_id ?? null,
        raw_value_jsonb: payload.raw_value_jsonb ?? null,
        score_value: payload.score_value ?? null,
        is_unanswered: payload.is_unanswered ?? false,
      },
      {
        onConflict: 'response_id,question_id',
      },
    )
    .select(responseAnswerSelect)
    .single();

  if (result.error) {
    throw new Error(`Failed to save response answer: ${result.error.message}`);
  }

  return result.data as ResponseAnswerRecord;
}

export async function markResponseSubmitted(responseId: string) {
  const supabase = getSupabaseServiceClient();
  const result = await supabase
    .from('117_responses')
    .update({
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      locked_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .select(responseSelect)
    .single();

  if (result.error) {
    throw new Error(`Failed to submit response: ${result.error.message}`);
  }

  return result.data as ResponseRecord;
}
