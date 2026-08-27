# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Steps 1–7 complete and verified; Step 8 next — the form)

## Where we are

- Step 1 (deploy loop): done.
- Step 2 (Slack webhook proof): done.
- Steps 3–4 (bare endpoint + Zod validation): done.
- Step 5 (DB log): done, verified against the real database.
- Step 6 (Slack notification): done, verified end-to-end in production (Steven confirmed the message in Slack, screenshot matched the DB row's id exactly). Broken-webhook failure case also confirmed — still 200, DB write intact, failure logged not thrown.
- **Step 7 (dedupe): done.** Hash of `phone + message + hour-bucket`; a duplicate within the hour returns the existing id and skips both the DB insert and the Slack post. Verified against the real database: identical resubmit → same id, one row; genuinely different message → new id, second row. Migration to add the `dedupe_hash` column was applied directly to the production database (see DEVLOG for the multi-statement gotcha with the Neon HTTP driver).

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app`

**`POST /api/enquiry`** — full core pipeline working:
- Empty/invalid body → `400` with field-level errors.
- Duplicate (same phone+message within the hour) → `200` with the existing id, no new row, no new Slack post.
- Valid new payload → validates, writes to Postgres, posts to Slack, returns `200 { ok: true, id }`.
- DB failure (including the dedupe lookup) → `500`.
- Slack failure → still `200` (record already saved); logged server-side, no replay queue yet.

No honeypot, no form, no photos yet.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions`, team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-` (private), production branch `main`, auto-deploys on push.
- **Slack:** Incoming Webhook live, wired into the app, confirmed rendering correctly (header includes urgency/job type/postcode, tap-to-call phone, footer with id/timestamp — per spec §5).
- **Postgres:** Neon-backed via Vercel Storage, `DATABASE_URL` live, driver is `@neondatabase/serverless` (HTTP-based — this sandbox has no route to raw TCP 5432, and it's also Neon/Vercel's recommended driver for serverless functions generally; don't switch to `pg`).
- `BLOB_READ_WRITE_TOKEN`: not set up yet (Step 9).

## What exists

- `app/api/enquiry/route.ts` — validates (Zod) → inserts to Postgres → posts to Slack (failure logged, never surfaced) → returns id.
- `lib/schema.ts` — Zod schema, enums from `config/client.ts`.
- `lib/db.ts` — `insertEnquiry()` via `@neondatabase/serverless`.
- `db/schema.sql` — `enquiries` table.
- `lib/slack.ts` — message formatting + webhook post, wired in.
- `lib/dedupe.ts`, `lib/blob.ts` — still one-line stubs (Steps 7, 9).
- `components/EnquiryForm.tsx`, `components/PhotoInput.tsx` — still one-line stubs (Steps 8, 9).
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/`.

## What's next — Step 7

Dedupe: hash of `phone + message + truncate(now, 'hour')`; if a matching hash exists, return `200` with the existing enquiry id instead of inserting a new row. Needs no new external setup — DB already exists. After that, honeypot handling and Step 8 (the actual form) — the endpoint has now been proven through the full pipeline, so any front-end failure from here is unambiguous.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing).
- Work proceeds in phases matching the spec's build order; each phase verified before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note applies at go-live).
- GitHub repo: private.
- DB driver: `@neondatabase/serverless`, not `pg`.
