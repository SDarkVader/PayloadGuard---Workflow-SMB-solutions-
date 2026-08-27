# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Step 9 code complete, verified locally except the Blob upload path itself — production verification pending)

## Where we are

- Steps 1–8: done and verified in production (see prior devlog entries).
- **Step 9 (photos): code complete, mostly verified.** `POST /api/enquiry` now accepts `multipart/form-data` (was JSON) with photo files, compresses client-side, uploads to Vercel Blob, attaches URLs to the DB record and as inline Slack image blocks, extends the success state with an honest photo count.
  - Verified locally via Playwright: form fields, honeypot, validation, DB write (with empty `photo_urls`), compression actually shrinking files, and — after fixing a caught bug — an honest success message.
  - **Bug caught and fixed:** the success message originally trusted the client's own photo count instead of the server's actual result, so it could claim photos were received when an upload had silently failed. Fixed to use the server-reported `photoCount` from the response.
  - **Not yet verified: actual photo upload + inline Slack rendering.** This sandbox's local `next start` has no Vercel OIDC token, so `@vercel/blob`'s `put()` fails locally with a clear, expected error (`No blob credentials found`) — this is an environment limitation, not an app bug (confirmed separately in production with a real write+delete, see prior devlog entry). Next step: push and verify the full photo flow against the live deployment.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app`

**`POST /api/enquiry`** now expects `multipart/form-data`, not JSON — this is a breaking contract change from Steps 3–8. Fields: `name`, `phone`, `email`, `postcode`, `job_type`, `urgency`, `message`, `company_website` (honeypot), `photos` (0–4 files). Response adds `photoCount` on success.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions`, team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-` (private), production branch `main`, auto-deploys on push.
- **Slack:** Incoming Webhook live, wired in, rendering correctly (now including inline photo blocks, pending production confirmation).
- **Postgres:** Neon-backed via Vercel Storage, `DATABASE_URL` live, driver is `@neondatabase/serverless` (HTTP-based — don't switch to `pg`).
- **Blob:** provisioned (`payloadguard-photos`, LHR1, Public access), OIDC-based connection (no `BLOB_READ_WRITE_TOKEN` needed). Confirmed working with a real write+delete in production. Photo URLs are unguessable random UUIDs; reachable only via the Slack channel or DB access — see DEVLOG for the fuller access-model note, this came up as a direct question from Steven.

## What exists

- `app/page.tsx` — renders the real `EnquiryForm`.
- `components/EnquiryForm.tsx` — full form incl. `PhotoInput`, submits `FormData` (not JSON).
- `components/PhotoInput.tsx` — file input, client-side compression (canvas, 1600px/quality 0.8), max 4, preview + remove.
- `app/globals.css` — plain functional styling throughout, including the new photo list. Deliberately unstyled beyond the spec's non-negotiables — Steven's call, revisit design later.
- `app/api/enquiry/route.ts` — honeypot → Zod validation → photo count/size validation → dedupe lookup → photo upload (per-file try/catch, never fails the enquiry) → Postgres insert → Slack post (with image blocks) → returns id + photoCount.
- `lib/schema.ts`, `lib/db.ts`, `lib/dedupe.ts`, `lib/slack.ts`, `lib/blob.ts` — all wired in.
- `db/schema.sql` — `enquiries` table incl. `dedupe_hash`.
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/`.

## What's next

1. Push this commit, wait for deploy, run the full photo flow against production (submit with real photos, confirm DB `photo_urls` populated with real URLs, confirm Slack shows inline images, confirm success message reports the real count).
2. Once confirmed: Build 1's core loop (spec §9, Steps 1–9) is complete. Run the spec's full verification checklist (§10) before calling Build 1 done.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1. The photo-URL access-model discussion this session is directly relevant here.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing).
- Work proceeds in phases matching the spec's build order; each phase verified before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note applies at go-live).
- GitHub repo: private.
- DB driver: `@neondatabase/serverless`, not `pg`.
- Form design: functional-first, styling deliberately minimal — Steven's explicit call, revisit later.
- `/api/enquiry` accepts multipart/form-data, not JSON, as of Step 9.
