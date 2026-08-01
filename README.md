# Project 117

This repository has been initialized as a clean starter workspace.

## Next steps

- Pick the stack or framework you want to use.
- Add the app entry point and build tooling.
- Replace this README with project-specific setup instructions.

**We are building a database-driven Webinar Questionnaire and Knowledge Progress System**

## Overview

The system will allow an administrator to:

- Create webinars
- Create reusable questionnaires
- Add dynamic questions
- Assign questionnaires to webinars
- Collect attendee responses
- Compare pre-webinar and post-webinar knowledge
- View completion and progress reports
- Export results to CSV

The attendee will:

- Open a questionnaire using a secure link
- Enter or confirm personal details
- Save a draft
- Submit a completed questionnaire
- Complete both pre-webinar and post-webinar questionnaires

Technology:

- Next.js
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth
- Supabase Row Level Security
- React Hook Form
- Zod
- Vitest
- Playwright

## Project Requirements

Before modifying any files:

1. Propose the system architecture.
2. Divide the work into small milestones.
3. Propose the database schema.
4. Explain the administrator and attendee workflows.
5. Explain how questionnaires will be generated from database records.
6. Explain how knowledge progress will be calculated.
7. Identify privacy and security risks.
8. Define acceptance criteria for every milestone.
9. Do not implement anything yet.

Review the plan before building.
Do not ask Codex to build the entire system in one request.

This project requires a requirements-first approach, with the project requirements defined before implementation begins.

## Foundation Status

The first implementation milestone is now scaffolded:

- Next.js App Router foundation in `src/app`
- Supabase env helpers and browser/server client wrappers in `src/lib`
- Protected admin route shells
- Attendee invitation-token route shells
- Initial unit and E2E smoke tests

## Local Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local`.
3. Fill in the Supabase URL, anon key, and service-role key.
4. Start the app with `pnpm dev`.
5. Run checks with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm test:e2e`.

## Current Next Step

Build the database-backed webinar authoring flows so the protected admin shell can create webinars, questionnaire versions, and invitation assignments.
