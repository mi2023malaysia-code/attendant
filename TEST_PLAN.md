# Test Plan - Admin Filters, Sort, and Delete Update

Date: 2026-07-29
Updated: 2026-07-29
Project: `F:\codex\116`

## Goal

Verify the new admin changes:

- filter records by name, IC, course/webinar, and date range
- sort by name, course, and date
- delete a single row or the current filtered result set
- keep CSV export, reload, and public form behavior intact

## In scope

- Public form on `/`
- Admin panel on `/admin`
- API routes:
  - `GET /api/webinars`
  - `GET /api/categories`
  - `GET /api/submissions`
  - `POST /api/save`
  - `POST /api/delete`
- Visible admin controls:
  - `Muat semula`
  - `CSV`
  - `Padam ditapis`
  - filters for `Nama`, `IC`, `Course / webinar`, and date range
  - sort select and `Reset`
- CSV export from the currently visible filtered and sorted rows
- Delete behavior for one row and for the filtered set
- Local fallback storage and Supabase-backed storage

## Out of scope

- Redesign/UI polish beyond the new controls
- Authentication changes
- RLS hardening work, unless a test exposes a problem
- Historical log files

## Test environment

- Local: `node server.js` at `http://127.0.0.1:3000`
- Live: `https://attendant-red.vercel.app`
- Supabase project: `wvinhpgmkqdnrydddulo`

## Preconditions

- Server starts without errors
- Data source has enough records to test:
  - at least 2 different names
  - at least 2 different IC values
  - at least 2 different course/webinar titles
  - at least 2 different dates
- If testing delete in Supabase, use disposable records or a seeded copy
- Supabase env vars are present in the live deployment

## Test cases

### 1) Base smoke and controls

| ID | Check | Expected result |
|---|---|---|
| UI-01 | Open `/admin` | Page loads, summary renders, and the table area is present |
| UI-02 | Inspect visible admin actions | Only `Muat semula`, `CSV`, and `Padam ditapis` are shown; no visible `Tambah` or `Muat data` button |
| UI-03 | Inspect the filter toolbar | Fields for `Nama`, `IC`, `Course / webinar`, `Tarikh dari`, `Tarikh hingga`, sort select, and `Reset` are present |
| UI-04 | Inspect table headers | `Tindakan` column exists |
| API-01 | `GET /api/submissions?limit=1` | `200 OK` and participant data is returned |
| API-02 | `GET /api/webinars` | `200 OK` and webinar options are returned |
| API-03 | `GET /api/categories` | `200 OK` and category options are returned |

### 2) Filter behavior

| ID | Check | Expected result |
|---|---|---|
| FIL-01 | Name filter | Enter a partial name and only matching rows remain |
| FIL-02 | IC filter | Enter a partial IC and only matching rows remain |
| FIL-03 | Course filter | Enter part of the webinar title and only matching rows remain |
| FIL-04 | Date range | Pick a `from` and `to` date and only rows inside the inclusive range remain |
| FIL-05 | Combined filters | Apply 2 or more filters and the table shows the intersection only |
| FIL-06 | Reset | Click `Reset` and all filters clear; default sort returns to newest first |
| FIL-07 | No results | Use a filter with no match and the empty state updates correctly |

### 3) Sort behavior

| ID | Check | Expected result |
|---|---|---|
| SRT-01 | Default sort | On load and after Reset, rows are ordered by newest date first |
| SRT-02 | Name A-Z | Sort orders rows alphabetically by name |
| SRT-03 | Course A-Z | Sort orders rows alphabetically by webinar title |
| SRT-04 | Date oldest first | Sort orders rows from oldest date to newest date |
| SRT-05 | Sort after filtering | Sorting still applies only to the filtered subset |

### 4) Delete behavior

| ID | Check | Expected result |
|---|---|---|
| DEL-01 | Row delete | Click the action delete button for one row, confirm, and only that row is removed |
| DEL-02 | Delete filtered set | Apply a filter, click `Padam ditapis`, confirm, and all visible matches are removed |
| DEL-03 | Confirmation text | The confirmation dialog shows the number of affected records and the selected context |
| DEL-04 | Disabled state | `Padam ditapis` is disabled when there are no visible rows or while deletion is running |
| DEL-05 | API delete success | `POST /api/delete` with valid `ids` returns `200 OK`, `deletedCount`, `deletedIds`, and `storage` |
| DEL-06 | API delete validation | `POST /api/delete` without a valid id returns `400` with `Tiada rekod sah untuk dipadam.` |
| DEL-07 | Delete by current view | Deleting from the filtered view removes only the rows currently shown, not the full dataset |

### 5) Export and regression

| ID | Check | Expected result |
|---|---|---|
| REG-01 | CSV export | CSV downloads from the currently visible filtered and sorted rows |
| REG-02 | Reload admin | Reload `/admin` after filtering or deleting and the page still loads correctly |
| REG-03 | Reload public form | Reload `/` and confirm the public dropdowns and form still work |
| REG-04 | Existing submission save | `POST /api/save` and the public form still save valid participants |
| REG-05 | Legacy add controls | No visible `Tambah` or `Muat data` admin actions reappear after reload |

## Pass criteria

The change is ready when all of the following are true:

- The admin page exposes the new filter, sort, and delete controls
- Filters work by name, IC, course, and date range
- Sort options change ordering as expected
- Row delete and filtered delete both work with confirmation
- CSV export matches the visible table state
- `/api/delete` returns valid success and validation responses
- Public form and read APIs still work
- No visible regression brings back the removed admin add controls

## Evidence to capture

- Screenshot or DOM snapshot of `/admin` showing the new filter toolbar
- Screenshot of each sort option result
- Screenshot of delete confirmation and the post-delete table state
- JSON response from `POST /api/delete`
- CSV export file generated from a filtered view
- Smoke results from `GET /api/submissions`, `GET /api/webinars`, and `GET /api/categories`

## Notes

- `Course / webinar` in the UI maps to the webinar title field.
- Name, IC, and course filters are partial-match and case-insensitive.
- Date range filters are inclusive; each bound can be used on its own.
- Delete actions should be tested on disposable rows first when using Supabase.
- If local fallback storage is active, confirm the local data file updates after delete as well.
