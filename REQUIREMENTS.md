# Webinar Questionnaire and Knowledge Progress System

## Purpose

Help webinar organisers understand attendees before training, prepare suitable webinar content, collect post-webinar feedback, and measure changes in attendee knowledge.

## User Roles

- Administrator
- Attendee

## Administrator Requirements

The administrator must be able to:

- Sign in securely
- Create, edit, and archive webinars
- Create, edit, duplicate, and archive questionnaires
- Add and reorder questions
- Configure question types
- Assign scoring rules
- Assign questionnaires to webinars
- Configure pre-webinar and post-webinar stages
- Configure questionnaire opening and closing dates
- Generate attendee questionnaire links
- View attendee completion status
- View individual responses
- View group summaries
- Compare pre-webinar and post-webinar knowledge
- Export attendee and response data to CSV

## Attendee Requirements

An attendee must be able to:

- Open an assigned questionnaire link
- Enter their name, email, phone, and organisation
- Complete database-generated questions
- Save a draft response
- Continue an incomplete questionnaire
- Submit the completed response
- Receive a clear submission confirmation
- Complete pre-webinar and post-webinar questionnaires
- View a basic personal progress summary

## Question Types

The system must support:

- Short text
- Long text
- Single choice
- Multiple choice
- Dropdown
- Yes or no
- Number
- Rating scale
- Date
- Email
- Phone number

## Question Configuration

Each question may contain:

- Question text
- Help text
- Question type
- Required or optional setting
- Display order
- Knowledge topic
- Score weight
- Answer options
- Score value for each option
- Minimum and maximum values where applicable

## Knowledge Tracking

The system must:

- Associate knowledge questions with a topic
- Store scores for scoreable answers
- Calculate weighted scores
- Compare pre-webinar and post-webinar scores
- Show progress by attendee
- Show progress by topic
- Show average progress by webinar
- Handle unanswered questions separately
- Avoid treating missing answers as zero unless configured
- Handle a pre-webinar score of zero safely

## Security

The system must:

- Use Supabase Authentication for administrators
- Protect administrator routes
- Use Row Level Security
- Prevent attendees from viewing other attendees' responses
- Prevent submitted answers from being changed without permission
- Never expose the Supabase service-role key in browser code
- Never commit environment files
- Use secure, non-guessable invitation tokens
- Validate all submitted data
- Escape exported CSV values safely

## Quality

The application must:

- Be responsive
- Work on mobile devices
- Use accessible labels and controls
- Display understandable validation messages
- Provide useful loading and empty states
- Run lint successfully
- Pass TypeScript checking
- Pass automated tests
- Complete a production build successfully
