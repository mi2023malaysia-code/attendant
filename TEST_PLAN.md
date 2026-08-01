# Test Plan: Attendee Smoke Flow

## Purpose
Verify that the attendee questionnaire route can render, save a draft, survive a reload, and submit a completed response end to end.

## Scope
- Route: `/attendee/smoke-test-token-2026-08-01`
- Flow: load invitation -> confirm attendee details -> answer questions -> save draft -> reload -> submit -> confirm locked completion
- Storage: local smoke fixture at `.cache/attendee-smoke-state.json`

## Preconditions
- The local dev server is running on port `3000`.
- `.env.local` is available.
- `SUPABASE_SERVICE_ROLE_KEY` may remain blank because the attendee route falls back to the local smoke fixture.
- If the fixture already contains a submitted response, delete `.cache/attendee-smoke-state.json` before starting so the flow begins from a fresh draft state.

## Test Steps
1. Open `/attendee/smoke-test-token-2026-08-01`.
2. Confirm the attendee page renders and the invitation token resolves.
3. Fill the attendee question answers:
   - `What is your department?` -> `Platform Engineering`
   - `Which option best describes your familiarity with the topic?` -> `Experienced`
4. Click `Save draft`.
5. Confirm the page shows a complete draft state and the local smoke fixture records a draft response.
6. Reload the page.
7. Confirm the saved answers are restored after reload.
8. Click `Submit response`.
9. Confirm the page switches to the locked completion state.
10. Confirm the local smoke fixture records the response as submitted and the invitation token as completed.

## Expected Results
- The route renders without errors.
- Draft data persists locally.
- Reload restores the same answers.
- Submission locks the response and marks the token complete.

## Pass Criteria
- All steps above succeed without console errors or missing data.
- The browser shows the final submitted/locked view.
- `.cache/attendee-smoke-state.json` ends with:
  - `response.status = submitted`
  - `invitationToken.status = completed`

