# System Architecture and Milestone Plan

## Purpose

This document drafts the high-level architecture and delivery plan for the Webinar Questionnaire and Knowledge Progress System before implementation begins.

## System Architecture

### 1. Frontend Layer

- Next.js App Router provides the application shell, routing, and server-side rendering where it helps with performance and security.
- Admin pages live under a protected admin area.
- Attendee pages use secure invitation-token routes.
- React Hook Form manages form state.
- Zod provides shared validation rules for both client and server.
- Tailwind CSS handles responsive presentation and accessible UI primitives.

### 2. Application Layer

- Server Actions or Route Handlers process create, update, submit, and export operations.
- A questionnaire rendering service converts database records into a canonical runtime questionnaire model.
- A scoring service calculates weighted knowledge scores, topic progress, and pre/post comparisons.
- A reporting service aggregates completion, response, and progress data for dashboards and CSV export.
- Validation runs on the server for every write path so the browser is never trusted.

### 3. Data Layer

- Supabase Postgres is the system of record.
- Supabase Authentication secures administrator access.
- Row Level Security enforces access rules for every table that contains sensitive data.
- Invitation tokens are stored server-side and mapped to the attendee questionnaire session.
- Questionnaire definitions are versioned so historical responses do not change when an admin edits later content.

### 4. Core Data Concepts

- Webinar: the event or training session being measured.
- Questionnaire: a reusable logical form definition.
- Questionnaire version: an immutable published snapshot of a questionnaire.
- Question: a single prompt with configuration, order, and scoring metadata.
- Answer option: a selectable choice and optional score value.
- Assignment: a link between a webinar, questionnaire version, and stage such as pre-webinar or post-webinar.
- Invitation token: a secure link token for a specific attendee and assignment.
- Response: one submitted or draft questionnaire attempt.
- Answer: a single answer tied to a response and a question.
- Score snapshot: a stored derived result for attendee, topic, or webinar reporting.

### 5. Questionnaire Generation Flow

- The attendee link resolves to an invitation token.
- The token loads the assigned webinar, questionnaire version, and stage.
- The application queries questions, options, help text, order, required flags, topic, and scoring metadata from Postgres.
- The renderer turns those records into a canonical questionnaire model.
- The UI maps the model to field components based on question type.
- Validation rules are generated from the same metadata so the UI and server stay in sync.
- Published questionnaire versions remain immutable, which keeps saved drafts and final submissions stable over time.

### 6. Knowledge Progress Calculation

- Scoreable questions are identified by topic and scoring metadata.
- Each answer stores its raw selection and its derived score value where applicable.
- Weighted score for a question is calculated from the answer score and the question weight.
- Topic progress is calculated by aggregating all weighted scores for the topic.
- Webinar progress is calculated by rolling up the relevant topic or questionnaire scores for the webinar stage.
- Pre-webinar and post-webinar comparisons use the same question/topic mapping where possible.
- Missing answers are tracked separately and are not treated as zero unless the configuration explicitly says so.
- If a pre-webinar score is zero, the system must avoid divide-by-zero and should show absolute change instead of percentage change.

### 7. Security and Privacy Model

- Administrators authenticate with Supabase Auth.
- Admin routes are protected by server-side checks and route guards.
- Attendees can only access their own questionnaire through a non-guessable token.
- RLS prevents cross-attendee data access.
- Submitted responses are locked from casual editing after submission.
- The service-role key remains server-only and never ships to the browser.
- Environment files stay out of version control.
- CSV exports escape dangerous values so spreadsheet formulas cannot be injected.
- Validation is applied to every incoming request before persistence.

### 8. Reporting Layer

- The admin dashboard shows webinar completion, response status, attendee summaries, topic progress, and pre/post comparison views.
- Exports are generated on the server from validated query results.
- Derived score snapshots are stored so dashboards stay fast and do not recalculate large aggregates on every request.

## Milestone Plan

### Milestone 0: Architecture and Requirements Signoff

- Finalize the architecture, major workflows, and core data concepts.
- Confirm the questionnaire versioning approach.
- Confirm the scoring rules for missing answers and zero baselines.
- Confirm the security boundaries and data retention expectations.

Acceptance criteria:

- The architecture document is reviewed and approved.
- The major entities and flows are agreed before coding starts.
- No implementation work begins until the plan is accepted.

### Milestone 1: Project Foundation

- Set up the Next.js application structure.
- Configure TypeScript, Tailwind CSS, linting, and test tooling.
- Connect Supabase environment configuration without exposing secrets to the browser.
- Add base layouts for admin and attendee areas.
- Add authentication scaffolding and route protection for admin pages.

Acceptance criteria:

- The project builds successfully.
- Admin routes are inaccessible without authentication.
- TypeScript, lint, and base test commands run cleanly.
- Environment variables are loaded only where they are meant to be used.

### Milestone 2: Webinar and Questionnaire Authoring

- Build admin CRUD for webinars.
- Build admin CRUD for questionnaires.
- Support create, edit, duplicate, and archive operations.
- Add question ordering, question types, help text, required flags, topics, weights, and answer options.
- Introduce questionnaire versioning and publish snapshots.
- Add stage configuration for pre-webinar and post-webinar assignments.

Acceptance criteria:

- An admin can create and manage webinars and questionnaires end to end.
- Published questionnaire versions remain immutable.
- Question ordering and validation behave correctly.
- Archived records are hidden from normal authoring flows but remain available for history.

### Milestone 3: Attendee Invitation and Response Flow

- Generate secure invitation tokens for assigned questionnaires.
- Build the attendee questionnaire route.
- Capture attendee identity details such as name, email, phone, and organisation.
- Support draft saving and draft continuation.
- Support final submission and post-submit confirmation.
- Lock submitted responses from accidental overwrite.

Acceptance criteria:

- A valid token opens exactly one assigned questionnaire.
- Drafts can be saved and resumed.
- Final submission shows a clear confirmation state.
- Attendees cannot access another attendee's questionnaire or response data.

### Milestone 4: Scoring and Knowledge Progress

- Implement weighted scoring for scoreable questions.
- Store score snapshots for attendee, topic, and webinar reporting.
- Calculate pre-webinar and post-webinar comparisons.
- Handle unanswered questions separately.
- Handle zero-baseline comparisons safely.

Acceptance criteria:

- Score calculations match the agreed formula.
- Topic and webinar summaries are reproducible from test data.
- Missing answers do not silently become zero unless configured.
- Zero-baseline cases do not crash or produce invalid math.

### Milestone 5: Admin Reporting and Export

- Build completion and progress dashboards.
- Show individual responses and group summaries.
- Add filterable views by webinar, stage, and completion status.
- Implement safe CSV export for attendee and response data.

Acceptance criteria:

- Completion status and summary data match the stored responses.
- CSV output opens safely in spreadsheet tools.
- Exports include the expected fields and preserve ordering.
- Reporting pages remain readable on desktop and mobile widths.

### Milestone 6: Hardening, Accessibility, and Release Readiness

- Verify RLS policies against expected access patterns.
- Add automated tests for critical flows and scoring logic.
- Add Playwright coverage for the attendee journey and key admin flows.
- Check mobile responsiveness and accessibility labels.
- Confirm production build stability.

Acceptance criteria:

- Lint, TypeScript, and automated tests pass.
- Production build succeeds.
- Key flows work on mobile and desktop.
- Security checks confirm the expected access boundaries.

## Recommended Build Order

1. Approve architecture and requirements.
2. Implement foundation and auth.
3. Build authoring and versioning.
4. Build attendee submission flow.
5. Add scoring and reporting.
6. Harden with tests, accessibility, and security checks.

