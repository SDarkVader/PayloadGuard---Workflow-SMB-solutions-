# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Steps 1, 3, 4 complete; Step 2 pending on Steven)

## Where we are

- Step 1 (deploy loop): done, verified.
- Step 2 (Slack webhook proof): in progress — Steven is creating the Slack app/Incoming Webhook on his own account. Nothing in the repo depends on this yet.
- Steps 3 (bare endpoint) and 4 (Zod validation) were built in parallel with Step 2 since neither needs any external service or credential — pure application code, verified locally before pushing.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app` — verified 200 OK via plain unauthenticated `curl`, serving the PayloadGuard placeholder page.

**`POST /api/enquiry`** is live and validates. Verified locally (build, lint, and curl against `next start`) before pushing, then re-verified against the deployed URL:
- Empty/invalid body → `400` with field-level errors (`name`, `phone`, `job_type`, `urgency`).
- Bad enum values (`job_type`/`urgency`) → `400` with the specific field errors.
- Valid payload (matches the spec's own curl example) → `200 {"ok":true}`.

No DB write, no Slack post, no dedupe yet — those are Steps 5–7 and need Steven's credentials (`DATABASE_URL`, `SLACK_WEBHOOK_URL`).

## Hosting setup

- Vercel project: `payload-guard-workflow-smb-solutions` (id `prj_elJEQpC8KCD9BFprF5mWeCoHfoLH`), team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-`, production branch `main`. Auto-deploys on every push to `main`.
- **Deployment protection:** Vercel SSO auth is enabled (`all_except_custom_domains`) — the per-deployment preview URLs (hash-suffixed) require Vercel login to view. The stable production alias (`payload-guard-workflow-smb-solution.vercel.app`) is publicly reachable regardless — confirmed by direct curl. No action needed unless we later want preview URLs to also be public for someone without Vercel access.
- **GitHub repo is public.** Content is clean (pseudonymized, no secrets) but flagged to Steven — no decision made to change it yet.
- No environment variables set yet (`DATABASE_URL`, `SLACK_WEBHOOK_URL`, `BLOB_READ_WRITE_TOKEN` all pending — needed from Step 5 onward).
- No Postgres or Blob storage provisioned yet.

## What exists

- Next.js 15.5.24 + TypeScript + App Router, bare scaffold, default page only. `next`/`eslint`/`postcss` all bumped off vulnerable pinned versions found during setup; `npm audit` is clean.
- Directory structure per the spec, with unimplemented `lib/`/`components/` files marked as one-line stubs naming the build step that fills them in. `app/api/enquiry/route.ts` is **not** created yet — Next.js requires route files to be valid modules, so a placeholder comment fails the build; it gets created for real at Step 3.
- `config/client.ts` has a real, pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md` (rules), `README.md` (overview), `DEVLOG.md` (history), this file, and `docs/design/` (index, core principles, canonical specs, categorized addenda).

## What's next

- **Step 2** (Slack webhook proof) — Steven doing this himself when at his PC. Once he has a webhook URL, Step 6 (wiring it into the app) can start.
- **Step 5** (DB log) — needs `DATABASE_URL` (Postgres). Not started; needs Steven to provision it.
- **Step 6** (Slack integration in-app) — needs Step 2's webhook URL.
- **Step 7** (dedupe) — depends on Step 5 existing (the lookup needs the DB).
- **Step 8** (build the form) and **Step 9** (photos) — deliberately last per the spec's own reasoning: the endpoint is proven first so a front-end failure is unambiguous.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing — confirmed first target market).
- Work proceeds in phases matching the spec's build order; each phase's outcome is verified and reviewed with Steven before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note from the spec still applies at go-live).
