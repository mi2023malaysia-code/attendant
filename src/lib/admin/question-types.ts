export const QUESTION_TYPES = [
  'short_text',
  'long_text',
  'single_choice',
  'multiple_choice',
  'dropdown',
  'yes_no',
  'number',
  'rating_scale',
  'date',
  'email',
  'phone_number',
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];
