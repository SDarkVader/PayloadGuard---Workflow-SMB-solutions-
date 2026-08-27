# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Step 1 complete)

## Where we are

Step 1 of the build order (`docs/design/specs/build-1-enquiry-capture-pipeline.md` §9) is done and verified: empty app deployed, live HTTPS URL confirmed publicly reachable with no application logic yet.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app` — verified 200 OK via plain unauthenticated `curl`, serving the PayloadGuard placeholder page.

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

## What's next — Step 2

Prove the Slack webhook standalone (spec §9, Step 2): create the Slack app, enable Incoming Webhooks, add to a test channel, confirm with a curl POST before any application code is written. Needs Steven to create the Slack app (or grant access) since it's an external account action.

Steps 3–9 (bare endpoint, validation, DB log, Slack integration, dedupe, form, photos) are not started. Each one gets its own phase and its own verification before the next starts.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing — confirmed first target market).
- Work proceeds in phases matching the spec's build order; each phase's outcome is verified and reviewed with Steven before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note from the spec still applies at go-live).
