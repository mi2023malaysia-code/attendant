import 'server-only';

import { hashInvitationToken, normalizeInvitationToken } from '@/lib/invitation-token';
import type {
  QuestionOptionRecord,
  QuestionRecord,
  QuestionWithOptions,
} from '@/lib/admin/questions';
import type { QuestionnaireRecord, QuestionnaireVersionRecord } from '@/lib/admin/questionnaires';
import type { WebinarRecord } from '@/lib/admin/webinars';
import { getSupabaseAttendeeClient } from '@/lib/supabase/attendee';
import { toRow, toRows } from '@/lib/supabase/cast';
import {
  loadLocalAttendeeQuestionnaireContext,
  shouldUseLocalAttendeeStore,
} from '@/lib/attendee/local-store';

import type { ResponseAnswerRecord, ResponseRecord } from './response-storage';

export type AttendeeRecord = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  organisation: string | null;
  email_normalized: string;
  first_seen_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvitationTokenRecord = {
  id: string;
  assignment_id: string;
  attendee_id: string;
  token_hash: string;
  status: 'issued' | 'opened' | 'completed' | 'revoked' | 'expired';
  issued_by: string | null;
  issued_at: string;
  claimed_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssignmentRecord = {
  id: string;
  webinar_id: string;
  questionnaire_version_id: string;
  stage: 'pre_webinar' | 'post_webinar';
  open_at: string | null;
  close_at: string | null;
  status: 'active' | 'paused' | 'archived';
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type AttendeeQuestionnaireContext = {
  rawToken: string;
  tokenHash: string;
  tokenPreview: string;
  invitationToken: InvitationTokenRecord;
  attendee: AttendeeRecord;
  assignment: AssignmentRecord;
  webinar: WebinarRecord;
  questionnaire: QuestionnaireRecord;
  questionnaireVersion: QuestionnaireVersionRecord;
  questions: QuestionWithOptions[];
  response: ResponseRecord | null;
  responseAnswers: ResponseAnswerRecord[];
};

const invitationSelect = [
  'id',
  'assignment_id',
  'attendee_id',
  'token_hash',
  'status',
  'issued_by',
  'issued_at',
  'claimed_at',
  'expires_at',
  'revoked_at',
  'created_at',
  'updated_at',
].join(', ');

const attendeeSelect = [
  'id',
  'full_name',
  'email',
  'phone',
  'organisation',
  'email_normalized',
  'first_seen_at',
  'last_seen_at',
  'created_at',
  'updated_at',
].join(', ');

const assignmentSelect = [
  'id',
  'webinar_id',
  'questionnaire_version_id',
  'stage',
  'open_at',
  'close_at',
  'status',
  'display_order',
  'created_by',
  'created_at',
  'updated_at',
].join(', ');

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

function tokenPreview(token: string) {
  return token.length > 16 ? `${token.slice(0, 12)}...` : token;
}

function isTokenActive(status: InvitationTokenRecord['status']) {
  return status === 'issued' || status === 'opened' || status === 'completed';
}

function groupQuestionsWithOptions(
  questions: QuestionRecord[],
  options: QuestionOptionRecord[],
) {
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

export async function loadAttendeeQuestionnaireContext(rawToken: string) {
  const normalizedToken = normalizeInvitationToken(rawToken);

  if (!normalizedToken) {
    return null;
  }

  if (shouldUseLocalAttendeeStore()) {
    return loadLocalAttendeeQuestionnaireContext(normalizedToken);
  }

  const supabase = getSupabaseAttendeeClient(normalizedToken);
  const tokenHash = hashInvitationToken(normalizedToken);

  const invitationResult = await supabase
    .from('117_invitation_tokens')
    .select(invitationSelect)
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (invitationResult.error) {
    throw new Error(`Failed to load invitation token: ${invitationResult.error.message}`);
  }

  const invitationToken = toRow<InvitationTokenRecord>(invitationResult.data);

  if (!invitationToken || invitationToken.revoked_at || !isTokenActive(invitationToken.status)) {
    return null;
  }

  if (invitationToken.expires_at && new Date(invitationToken.expires_at).getTime() <= Date.now()) {
    return null;
  }

  const [attendeeResult, assignmentResult] = await Promise.all([
    supabase
      .from('117_attendees')
      .select(attendeeSelect)
      .eq('id', invitationToken.attendee_id)
      .maybeSingle(),
    supabase
      .from('117_webinar_questionnaire_assignments')
      .select(assignmentSelect)
      .eq('id', invitationToken.assignment_id)
      .maybeSingle(),
  ]);

  if (attendeeResult.error) {
    throw new Error(`Failed to load attendee: ${attendeeResult.error.message}`);
  }

  if (assignmentResult.error) {
    throw new Error(`Failed to load assignment: ${assignmentResult.error.message}`);
  }

  const attendee = toRow<AttendeeRecord>(attendeeResult.data);
  const assignment = toRow<AssignmentRecord>(assignmentResult.data);

  if (!attendee || !assignment || assignment.status !== 'active') {
    return null;
  }

  const [webinarResult, versionResult] = await Promise.all([
    supabase
      .from('117_webinars')
      .select(
        'id, title, description, starts_at, ends_at, timezone, status, created_by, updated_by, archived_at, created_at, updated_at',
      )
      .eq('id', assignment.webinar_id)
      .maybeSingle(),
    supabase
      .from('117_questionnaire_versions')
      .select(
        'id, questionnaire_id, version_number, status, change_summary, published_at, published_by, created_by, created_at, updated_at',
      )
      .eq('id', assignment.questionnaire_version_id)
      .maybeSingle(),
  ]);

  if (webinarResult.error) {
    throw new Error(`Failed to load webinar: ${webinarResult.error.message}`);
  }

  if (versionResult.error) {
    throw new Error(`Failed to load questionnaire version: ${versionResult.error.message}`);
  }

  const webinar = toRow<WebinarRecord>(webinarResult.data);
  const questionnaireVersion = toRow<QuestionnaireVersionRecord>(
    versionResult.data,
  );

  if (!webinar || !questionnaireVersion) {
    return null;
  }

  if (webinar.status !== 'published' && webinar.status !== 'completed') {
    return null;
  }

  if (questionnaireVersion.status !== 'published') {
    return null;
  }

  const questionnaireResult = await supabase
    .from('117_questionnaires')
    .select(
      'id, slug, title, description, status, duplicated_from_questionnaire_id, created_by, archived_at, created_at, updated_at',
    )
    .eq('id', questionnaireVersion.questionnaire_id)
    .maybeSingle();

  if (questionnaireResult.error) {
    throw new Error(`Failed to load questionnaire: ${questionnaireResult.error.message}`);
  }

  const questionnaire = toRow<QuestionnaireRecord>(questionnaireResult.data);

  if (!questionnaire) {
    return null;
  }

  if (questionnaire.status !== 'published') {
    return null;
  }

  const [questionsResult, optionsResult] = await Promise.all([
    supabase
      .from('117_questions')
      .select(questionSelect)
      .eq('questionnaire_version_id', questionnaireVersion.id)
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
    throw new Error(`Failed to load question options: ${optionsResult.error.message}`);
  }

  const questions = groupQuestionsWithOptions(
    toRows<QuestionRecord>(questionsResult.data),
    toRows<QuestionOptionRecord>(optionsResult.data),
  );

  const responseResult = await supabase
    .from('117_responses')
    .select(
      [
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
      ].join(', '),
    )
    .eq('invitation_token_id', invitationToken.id)
    .maybeSingle();

  if (responseResult.error) {
    throw new Error(`Failed to load response: ${responseResult.error.message}`);
  }

  const response = toRow<ResponseRecord>(responseResult.data);

  let responseAnswers: ResponseAnswerRecord[] = [];

  if (response) {
    const answerResult = await supabase
      .from('117_response_answers')
      .select(
        [
          'id',
          'response_id',
          'question_id',
          'selected_option_id',
          'raw_value_jsonb',
          'score_value',
          'is_unanswered',
          'created_at',
          'updated_at',
        ].join(', '),
      )
      .eq('response_id', response.id)
      .order('created_at', { ascending: true });

    if (answerResult.error) {
      throw new Error(`Failed to load response answers: ${answerResult.error.message}`);
    }

    responseAnswers = toRows<ResponseAnswerRecord>(answerResult.data);
  }

  if (invitationToken.status === 'issued') {
    const openedAt = invitationToken.claimed_at ?? new Date().toISOString();
    const openedResult = await supabase
      .from('117_invitation_tokens')
      .update({
        status: 'opened',
        claimed_at: openedAt,
      })
      .eq('id', invitationToken.id);

    if (openedResult.error) {
      throw new Error(`Failed to mark invitation as opened: ${openedResult.error.message}`);
    }

    invitationToken.status = 'opened';
    invitationToken.claimed_at = openedAt;
  }

  return {
    rawToken: normalizedToken,
    tokenHash,
    tokenPreview: tokenPreview(normalizedToken),
    invitationToken,
    attendee,
    assignment,
    webinar,
    questionnaire,
    questionnaireVersion,
    questions,
    response,
    responseAnswers,
  } satisfies AttendeeQuestionnaireContext;
}
