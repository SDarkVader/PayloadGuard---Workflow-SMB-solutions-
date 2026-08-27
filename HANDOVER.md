# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Steps 1–5 complete and verified; Step 6 next, module already built)

## Where we are

- Step 1 (deploy loop): done, verified.
- Step 2 (Slack webhook proof): done. Steven confirmed "pipeline test" landed in the test channel.
- Steps 3–4 (bare endpoint + Zod validation): done, live.
- **Step 5 (DB log): done.** `POST /api/enquiry` now writes to Postgres on every valid request and returns the real enquiry id. Verified against the actual database, not just locally trusted: valid payload writes a row (confirmed present with a separate read query), invalid payload never touches the DB, and a deliberately broken connection returns `500` with no leaked internals.
- `lib/slack.ts` is written and proven standalone, **not yet wired in** — that's Step 6, next up. It just needs to post after the DB insert that now exists.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app`

**`POST /api/enquiry`** — validates, writes to Postgres, returns the real id:
- Empty/invalid body → `400` with field-level errors.
- Bad enum values → `400` with specific field errors.
- Valid payload → `200 { ok: true, id: "<uuid>" }`.
- DB failure → `500`.

No Slack post, no dedupe, no photos yet.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions` (id `prj_elJEQpC8KCD9BFprF5mWeCoHfoLH`), team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-`, production branch `main`. Auto-deploys on every push.
- **Deployment protection:** Vercel SSO gates per-deployment preview URLs; the stable production alias is public. No action needed.
- **GitHub repo is private.**
- **Slack:** Incoming Webhook live and tested. `SLACK_WEBHOOK_URL` is a Vercel Shared env var, confirmed reaching production. Also in local `.env.local` (gitignored).
- **Postgres:** Neon-backed, via Vercel Storage. `DATABASE_URL` confirmed reaching production and confirmed working end-to-end locally against the real database. Also in local `.env.local` (gitignored).
  - Driver is `@neondatabase/serverless` (HTTP-based), not `pg`/node-postgres — this session's sandbox has no route to raw TCP port 5432 (proxied HTTPS only), and switching to the HTTP driver fixed it. This is also Neon/Vercel's own recommended driver for serverless functions generally (avoids connection-pool exhaustion), so it's not a compromise — keep using it going forward, don't switch back to `pg`.
  - Schema lives at `db/schema.sql`, applied via `CREATE TABLE IF NOT EXISTS` (no migration framework yet — fine for this stage, revisit if the schema needs to evolve non-trivially).
- `BLOB_READ_WRITE_TOKEN`: not set up yet (Step 9).

## What exists

- Next.js 15.5.24 + TypeScript + App Router. Dependencies clean (`npm audit`: 0 vulnerabilities).
- `app/api/enquiry/route.ts` — validates (Zod) then writes to Postgres; returns id or 500.
- `lib/schema.ts` — Zod schema, enums sourced from `config/client.ts`.
- `lib/db.ts` — `insertEnquiry()` via `@neondatabase/serverless`.
- `db/schema.sql` — `enquiries` table definition.
- `lib/slack.ts` — message formatting + webhook post, proven standalone, not wired in.
- `lib/dedupe.ts`, `lib/blob.ts` — still one-line stubs (Steps 7, 9).
- `components/EnquiryForm.tsx`, `components/PhotoInput.tsx` — still one-line stubs (Steps 8, 9).
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/` (index, core principles, canonical specs, categorized addenda).

## What's next — Step 6

Wire `lib/slack.ts`'s `postToSlack()` into `app/api/enquiry/route.ts`, called after the DB insert succeeds. Per the spec: a Slack failure must never surface to the caller — still return `200` with the id even if `postToSlack()` returns `{ ok: false }`; log the failure for replay rather than throwing. The module is already built and tested against the real webhook, so this should be fast. Needs no new external setup — both `SLACK_WEBHOOK_URL` and `DATABASE_URL` are already confirmed live.

Step 7 (dedupe) follows — the DB now exists so the lookup is unblocked. Steps 8–9 (form, photos) come last by design.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing — confirmed first target market).
- Work proceeds in phases matching the spec's build order; each phase verified before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note from the spec still applies at go-live).
- GitHub repo: private.
- DB driver: `@neondatabase/serverless` (HTTP-based), not `pg` — see Hosting section above for why.
