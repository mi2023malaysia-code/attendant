export const heroStats = [
  {
    label: 'Delivery phase',
    value: 'Foundation',
    detail: 'Next.js shell, Supabase env wiring, and protected admin routes',
  },
  {
    label: 'Data model',
    value: '13 tables',
    detail: 'Versioned questionnaires, attendee tokens, responses, and scores',
  },
  {
    label: 'Security stance',
    value: 'Token + RLS',
    detail: 'Browser reads are scoped, writes are draft-only, and secrets stay server-side',
  },
];

export const systemPillars = [
  {
    title: 'Database-generated questionnaires',
    description:
      'Every attendee session is rendered from versioned records so changes in later drafts never mutate saved responses.',
  },
  {
    title: 'Progress snapshots',
    description:
      'Weighted topic, webinar, and attendee progress can be persisted once and reused in dashboards and exports.',
  },
  {
    title: 'Security-first delivery',
    description:
      'Administrators authenticate with Supabase Auth, while attendees see only the questionnaire assigned to their secure token.',
  },
];

export const buildMilestones = [
  {
    number: '01',
    title: 'Foundation',
    summary: 'Project scaffold, env schema, route shells, and auth helpers.',
    status: 'in progress',
  },
  {
    number: '02',
    title: 'Authoring',
    summary: 'Webinars, questionnaires, versions, question ordering, and publishing.',
    status: 'next',
  },
  {
    number: '03',
    title: 'Attendee flow',
    summary: 'Invitation links, draft saving, completion, and confirmation states.',
    status: 'next',
  },
  {
    number: '04',
    title: 'Scoring',
    summary: 'Weighted topic progress, pre/post comparisons, and snapshot storage.',
    status: 'later',
  },
  {
    number: '05',
    title: 'Reporting',
    summary: 'Dashboards, filters, exports, and mobile-friendly admin summaries.',
    status: 'later',
  },
];

export const adminWorkflow = [
  'Sign in through Supabase Auth.',
  'Create webinars and questionnaire versions.',
  'Assign pre-webinar and post-webinar stages.',
  'Generate secure invitation links for attendees.',
  'Review responses, summaries, and exports.',
];

export const attendeeWorkflow = [
  'Open a secure invitation link.',
  'Confirm name, email, phone, and organisation.',
  'Save a draft and return later if needed.',
  'Submit the completed questionnaire.',
  'See the confirmation and progress summary.',
];

export const securityChecklist = [
  'Administrators only access admin routes after authentication.',
  'Attendees can only see their own token-bound records.',
  'Submitted responses are locked from casual edits.',
  'Service-role access stays server-only.',
  'CSV exports escape unsafe formulas.',
];

export const adminNav = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/webinars', label: 'Webinars' },
  { href: '/admin/questionnaires', label: 'Questionnaires' },
  { href: '/admin/reports', label: 'Reports' },
];

export const roadmapLegend = [
  { label: 'Foundation', tone: 'Now' },
  { label: 'Authoring', tone: 'Next' },
  { label: 'Attendee flow', tone: 'Next' },
  { label: 'Scoring and reports', tone: 'Later' },
];
