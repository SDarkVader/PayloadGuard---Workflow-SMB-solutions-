# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-28 (Build 1's core loop complete and verified; Build 4's general-enquiries voice intake fully working in production — a real test call surfaced and led to fixing a genuine architecture gap, Structured Outputs are async and not part of the webhook payload, now confirmed working end-to-end against the live deployment)

## Where we are

- Steps 1–9: done and verified in production (see devlog entries).
- **Step 9 (photos): complete and fully verified.** `POST /api/enquiry` accepts `multipart/form-data` (was JSON) with photo files, compresses client-side, uploads to Vercel Blob, attaches URLs to the DB record and as inline Slack image blocks, extends the success state with an honest photo count.
  - Verified locally via Playwright: form fields, honeypot, validation, DB write (with empty `photo_urls`), compression actually shrinking files, and — after fixing a caught bug — an honest success message.
  - **Bug caught and fixed:** the success message originally trusted the client's own photo count instead of the server's actual result, so it could claim photos were received when an upload had silently failed. Fixed to use the server-reported `photoCount` from the response.
  - **Verified in production:** submitted a real multipart request against the live endpoint with test photos, confirmed `200 { photoCount: 2 }`, queried the DB directly and confirmed `photo_urls` held two real, independently-`curl`-reachable Blob URLs, and Steven confirmed via Slack screenshot the enquiry card posted with an inline image block. (The block itself rendered blank because the test file was a synthetic 1×1-pixel placeholder, not a real photo — expected; a real photo will render normally. The upload→URL→DB→Slack mechanism is what was under test, and it's confirmed working.) Test row deleted afterward, DB confirmed empty of stray test data.

**Build 1's core loop (spec §9, Steps 1–9) is functionally complete and verified end-to-end in production.**

**Live production URL:** `https://payload-guard-workflow-smb-solution.vercel.app`

**`POST /api/enquiry`** now expects `multipart/form-data`, not JSON — this is a breaking contract change from Steps 3–8. Fields: `name`, `phone`, `email`, `postcode`, `job_type`, `urgency`, `message`, `company_website` (honeypot), `photos` (0–4 files). Response adds `photoCount` on success.

## Hosting & external services

- Vercel project: `payload-guard-workflow-smb-solutions`, team `stevenallandark-2930's projects` (Hobby plan), linked to GitHub `SDarkVader/PayloadGuard---Workflow-SMB-solutions-` (private), production branch `main`, auto-deploys on push.
- **Slack:** Incoming Webhook live, wired in, rendering correctly — inline photo blocks confirmed in production, every field (name, phone, email, postcode, job type, urgency, message) now explicitly labeled in the message body and confirmed by Steven via screenshot.
- **Postgres:** Neon-backed via Vercel Storage, `DATABASE_URL` live, driver is `@neondatabase/serverless` (HTTP-based — don't switch to `pg`).
- **Blob:** provisioned (`payloadguard-photos`, LHR1, Public access), OIDC-based connection (no `BLOB_READ_WRITE_TOKEN` needed). Confirmed working with a real write+delete in production. Photo URLs are unguessable random UUIDs; reachable only via the Slack channel or DB access — see DEVLOG for the fuller access-model note, this came up as a direct question from Steven.

## What exists

- `app/page.tsx` — gradient hero header (headline + callback-window badge, reading `activeClient.callbackWindowMinutes` from config, not hardcoded) above the real `EnquiryForm`.
- `components/EnquiryForm.tsx` — full form incl. `PhotoInput`, submits `FormData` (not JSON).
- `components/PhotoInput.tsx` — big dashed-border "Add photos" button (hidden native input under a styled label), client-side compression (canvas, 1600px/quality 0.8), max 4, preview + remove.
- `app/globals.css` — styled pass: color palette (blue/orange), gradient hero banner, light-blue form card with colored top accent and white entry fields, colored focus states, urgency options highlight when selected. Purely visual — no behavior changed.
- `app/api/enquiry/route.ts` — honeypot → Zod validation → photo count/size validation → dedupe lookup → photo upload (per-file try/catch, never fails the enquiry) → Postgres insert → Slack post (with image blocks) → returns id + photoCount.
- `app/api/voice-intake/route.ts` — Build 4's general-enquiries webhook: verifies HMAC signature (skips gracefully if `VAPI_WEBHOOK_SECRET` unset) → handles either `end-of-call-report` (the live path — Vapi's "Structured Outputs" feature, fetched via a follow-up API call, see `lib/vapi.ts`) or `tool-calls` message → dedupe → Postgres insert (`source: "call"`, `job_type` defaults to `"other"`, `urgency` derived from an optional timeframe field via keyword heuristic) → Slack post (tagged `Source: Phone call`) → confirmation SMS.
- `lib/vapi.ts` — Vapi payload parsing/field extraction, `fetchStructuredOutputs()` (polls `GET /call/{id}` with retries since Structured Outputs are computed asynchronously and never appear in the webhook payload itself — a real gap found and fixed via a real test call, 2026-08-28), timeframe→urgency heuristic, HMAC signature verification, assistant-ID sanity check.
- `lib/sms.ts` — Twilio confirmation SMS, never-throws pattern. **Verified end-to-end in production** (2026-08-28): credentials live in Vercel, a production webhook call resulted in a real delivered text confirmed by Steven. Hit and fixed a real Vercel env var misconfiguration along the way — see devlog.
- `lib/schema.ts`, `lib/db.ts`, `lib/dedupe.ts`, `lib/slack.ts`, `lib/blob.ts` — Build 1's modules; Build 4 reuses all of them, `lib/slack.ts` gaining one optional `channel` field (renders as `*Source:*` when present, absent = Build 1's output unchanged).
- `db/schema.sql` — `enquiries` table incl. `dedupe_hash`. No changes for Build 4 — `source` was already a plain string column.
- `config/client.ts` — pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types), plus `callbackWindowMinutes`.
- Docs: `CLAUDE.md`, `README.md`, `DEVLOG.md`, this file, `docs/design/`.

## What's next

1. Run the spec's full verification checklist (§10) as a formal pass before calling Build 1 done — most items have already been proven individually across earlier phases (valid submission → Slack + Postgres, missing phone → 400, broken Slack webhook still writes + returns 200, broken DB → 500, duplicate → one row, honeypot → 200 + no write, photo upload → inline Slack image, mobile usability), but it hasn't been run as one deliberate checklist pass against the final, complete build. Includes confirming: a 5th photo is rejected with a clear message, and no secrets are in the repository.
2. After that: decide with Steven whether Build 1 is ready to redeploy for the first paying client (per `CLAUDE.md`'s deployment order — prove on Steven's own site first, then edit `config/client.ts` and set new env vars).
3. **Build 4's general-enquiries voice intake is fully working in production.** A real test call surfaced that Vapi's "Structured Outputs" (what the assistant actually uses) are computed asynchronously and never appear in the `end-of-call-report` webhook — they have to be fetched afterward via Vapi's Call API. Fixed in `lib/vapi.ts`/`route.ts`, `VAPI_API_KEY` added to Vercel, and the fix confirmed by replaying the real call's ID against the live production endpoint: correct DB row, correct Slack card, and a delivered SMS, all matching what the local test already showed.
   - Remaining: a genuinely fresh real call (rather than a replayed one) as final confirmation — everything it depends on is now individually proven, so this is expected to just work.
   - Add the timing/urgency question to the assistant's system prompt (Steven's own stated next step) once ready, and sanity-check `mapTimeframeToUrgency()`'s heuristic against real wording.
   - Optionally, `VAPI_WEBHOOK_SECRET` for signature verification (currently skipped gracefully since unset).

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note / call) data — must be settled before Build 2 and before Build 4 goes live with a real client. The photo-URL access-model discussion this session is directly relevant here; Build 4's spec §10.4 sharpens it further (live phone numbers through a third party, Vapi).
- SMS response-window commitment for Build 2 — needs Steven's honest worst case. Build 4's SMS provider is now resolved (Twilio, verified). Still open, per Steven: an "already agreed" acknowledgment-text principle from a Build 2 discussion that isn't captured anywhere in this repo yet (spec §10.7) — needs Steven to either restate it or confirm Build 4 should define its own.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task. Also now needed to size Build 4's actual monthly Vapi cost (~30¢/min all-in, per the decision doc).

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing).
- Work proceeds in phases matching the spec's build order; each phase verified before the next starts.
- Hosting: Vercel (Hobby plan for now — non-commercial license note applies at go-live).
- GitHub repo: private.
- DB driver: `@neondatabase/serverless`, not `pg`.
- Form design: functionality-first was the initial call; a real visual styling pass has since landed (color palette, gradient hero, light-blue card) per Steven's request.
- `/api/enquiry` accepts multipart/form-data, not JSON, as of Step 9.
- Build 4 (missed call/voicemail AI intake): use Vapi short-term to ship quickly, build the Twilio-based self-hosted equivalent independently in parallel for long-term ownership. Full rationale in `docs/decisions/2026-08-27-voice-orchestration-vapi-vs-self-build.md`.
- Build 4's routing model evolved from the original three-way split into three Vapi-side routes Steven is building directly: General enquiries (this repo's `/api/voice-intake`), Business/existing-customer queries, and Emergency calls (similar but immediate logic, separate route) — the latter two aren't part of this repo's build.
- `source: "call"` (not the `missed_call_ai_intake` this repo's spec originally proposed) — Steven's explicit instruction.
- **Correction:** an earlier entry here claimed Vapi's API key wasn't needed. Wrong — it's required to fetch Structured Outputs after the fact (see above). `VAPI_API_KEY` needs to be in Vercel, same as the Twilio vars.
