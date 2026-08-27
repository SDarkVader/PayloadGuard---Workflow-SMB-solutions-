# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Steps 1–8 complete and verified; Step 9 next — photos)

## Where we are

- Step 1 (deploy loop): done.
- Step 2 (Slack webhook proof): done.
- Steps 3–4 (bare endpoint + Zod validation): done.
- Step 5 (DB log): done, verified against the real database.
- Step 6 (Slack notification): done, verified end-to-end in production.
- Step 7 (dedupe): done, verified against the real database and in production.
- **Step 8 (the form): done.** Real enquiry form live at `/`, honeypot wired both client and server side. Tested in an actual browser (Playwright driving the pre-installed Chromium, mobile viewport) — empty submit shows field errors correctly, valid submit writes to the real DB and posts to the real Slack channel (Steven confirmed the message matched the id exactly), success state confirms job type + postcode, Tab key shows a visible focus ring, honeypot field correctly skipped in tab order. Steven's call: functionality over design for now — styling is plain/functional, easy to restyle later without touching behavior.

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app` — now shows the real form, not a placeholder.

**`POST /api/enquiry`** — full core pipeline:
- Honeypot populated → `200`, writes nothing, indistinguishable from success.
- Empty/invalid body → `400` with field-level errors.
- Duplicate (same phone+message within the hour) → `200` with the existing id, no new row, no new Slack post.
- Valid new payload → validates, writes to Postgres, posts to Slack, returns `200 { ok: true, id }`.
- DB failure → `500`.
- Slack failure → still `200`; logged server-side, no replay queue yet.

No photo upload yet — that's Step 9, the last piece of Build 1's core loop.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions`, team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-` (private), production branch `main`, auto-deploys on push.
- **Slack:** Incoming Webhook live, wired into the app, rendering correctly.
- **Postgres:** Neon-backed via Vercel Storage, `DATABASE_URL` live, driver is `@neondatabase/serverless` (HTTP-based — don't switch to `pg`, this sandbox has no route to raw TCP 5432 and it's the recommended driver for serverless anyway).
- `BLOB_READ_WRITE_TOKEN`: not set up yet (Step 9) — this is the one remaining piece of external setup for Build 1's core loop.

## What exists

- `app/page.tsx` — renders the real `EnquiryForm`.
- `components/EnquiryForm.tsx` — full form: name/phone/email/postcode/job_type/urgency/message, honeypot, client-side error display, submit states (idle/submitting/success/error).
- `app/globals.css` — plain functional styling: 48px min tap targets, native select, visible focus rings, mobile-first max-width layout. Deliberately unstyled beyond that — Steven wants to iterate design later without this blocking functionality.
- `app/api/enquiry/route.ts` — honeypot check → Zod validation → dedupe lookup → Postgres insert → Slack post → returns id.
- `lib/schema.ts`, `lib/db.ts`, `lib/dedupe.ts`, `lib/slack.ts` — all wired in and proven.
- `db/schema.sql` — `enquiries` table incl. `dedupe_hash`.
- `components/PhotoInput.tsx`, `lib/blob.ts` — still one-line stubs (Step 9).
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/`.

## What's next — Step 9

Photos: `<input type="file" accept="image/*" multiple>` in `PhotoInput.tsx`, client-side compression (resize to ~1600px longest edge, JPEG ~0.8 quality) before upload, max 4, upload to Vercel Blob, URLs attached to the enquiry record, rendered inline as image blocks in the Slack message, success state extended to include photo count. Needs `BLOB_READ_WRITE_TOKEN` — Steven will need to provision Vercel Blob storage (same pattern as Postgres: Storage tab, connect to project) and we verify the env var reaches production the same way as before.

This is the last step of Build 1's core loop per the spec's build order. After Step 9, the spec's verification checklist (§10) should be run in full before considering Build 1 done.

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
- Form design: functional-first, styling deliberately minimal — Steven's explicit call, revisit later.
