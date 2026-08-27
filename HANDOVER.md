# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Steps 1–4 complete, Step 2 confirmed; `lib/slack.ts` built and proven standalone, not yet wired in)

## Where we are

- Step 1 (deploy loop): done, verified.
- Step 2 (Slack webhook proof): **done.** Steven created the Slack app, enabled Incoming Webhooks, confirmed "pipeline test" landed in the test channel.
- Steps 3 (bare endpoint) and 4 (Zod validation): done, live, verified against production.
- `lib/slack.ts` (message formatting + `postToSlack()`) is written and proven standalone against the real webhook — success and both failure paths (broken URL, missing env var) all degrade to `{ ok: false }` without throwing. **Not wired into `/api/enquiry` yet** — Step 6 in the spec's build order comes after Step 5 (DB log), because Slack is only posted *after* the durable write succeeds. Wiring it in now would invert that. Waiting on `DATABASE_URL` to do Step 5 first.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app` — verified 200 OK via plain unauthenticated `curl`, serving the PayloadGuard placeholder page.

**`POST /api/enquiry`** is live and validates — confirmed against the production URL itself:
- Empty/invalid body → `400` with field-level errors (`name`, `phone`, `job_type`, `urgency`).
- Bad enum values (`job_type`/`urgency`) → `400` with the specific field errors.
- Valid payload (matches the spec's own curl example) → `200 {"ok":true}`.

No DB write, no Slack post, no dedupe yet.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions` (id `prj_elJEQpC8KCD9BFprF5mWeCoHfoLH`), team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-`, production branch `main`. Auto-deploys on every push to `main`.
- **Deployment protection:** Vercel SSO auth enabled (`all_except_custom_domains`) — per-deployment preview URLs need Vercel login; the stable production alias is public regardless. No action needed.
- **GitHub repo is private** (Steven changed this; verified both this session's git access and Vercel's build access survived the switch).
- **Slack:** Incoming Webhook live, tested. `SLACK_WEBHOOK_URL` is in local `.env.local` (gitignored) for this session's testing. **Still needs to be added in the Vercel dashboard** (Settings → Environment Variables) for production — no tool in this environment (Vercel MCP toolset checked, `vercel` CLI not installed/authenticated) can set Vercel env vars, so this is on Steven.
- `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`: not set up yet.

## What exists

- Next.js 15.5.24 + TypeScript + App Router. `next`/`eslint`/`postcss` bumped off vulnerable pinned versions found during setup; `npm audit` clean.
- `app/api/enquiry/route.ts` — bare + Zod-validated, per above.
- `lib/schema.ts` — Zod schema, enum values sourced from `config/client.ts`.
- `lib/slack.ts` — message formatting + webhook post, proven standalone, not wired in.
- `lib/db.ts`, `lib/dedupe.ts`, `lib/blob.ts` — still one-line stubs (Steps 5, 7, 9).
- `components/EnquiryForm.tsx`, `components/PhotoInput.tsx` — still one-line stubs (Steps 8, 9).
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/` (index, core principles, canonical specs, categorized addenda).

## What's next — Step 5

Provision Postgres, create the enquiry table, insert on every valid request, confirm a DB failure returns `500`. Needs Steven to provision Postgres (Vercel Postgres free tier per the spec) and provide `DATABASE_URL`. Once that lands, Step 6 (wiring `lib/slack.ts` into the endpoint, after the log write) follows immediately — the module's already built and proven.

Step 7 (dedupe) needs Step 5's DB to exist. Steps 8–9 (form, photos) come last by design.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing — confirmed first target market).
- Work proceeds in phases matching the spec's build order; each phase's outcome is verified and reviewed with Steven before the next starts. Held this even when it would have been easy to skip ahead (Slack module built but deliberately not wired in until DB exists).
- Hosting: Vercel (Hobby plan for now — non-commercial license note from the spec still applies at go-live).
- GitHub repo: private.
