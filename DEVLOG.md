# Devlog

Append-only. Newest entry at the top. Never edit or delete past entries — if something turns out to be wrong, add a new entry correcting it.

---

## 2026-08-27 — Visual styling pass (colour, hero banner, big photo-upload button)

**Phase:** post-Step-9 polish, no build-order step — Steven's explicit call from the start ("we can change general layout and design as we go, functionality is the objective")

- `app/globals.css`: added a real palette (blue primary, orange accent), rounded/colored form card with a top accent border, colored focus rings, rounded inputs, and a highlight state on the selected urgency option (`:has()`, safe to rely on at this point in evergreen-browser support).
- `components/PhotoInput.tsx`: replaced the bare `<input type="file">` with a big dashed-border button (a styled `<label>` wrapping a visually-hidden native input, same `id`/`onChange`/`disabled` logic — no functional change, confirmed by keeping `handleFiles` untouched).
- `app/page.tsx`: new copy — "Automated Roofing Enquiry" headline and a "45-minute callback, with text updates" badge — plus a gradient hero banner so the page doesn't read as a plain white form; the form card itself also picked up a colored top border for the same reason.
- Verified via `npm run build` (clean) and Playwright screenshots at the 390px mobile viewport: base state, urgency-option selected (highlight renders), and a photo added (styled list + remove button renders). No JSON/API contract touched — `route.ts`, `lib/*`, and `EnquiryForm.tsx`'s submit logic are unchanged.

**Verified:** build clean, visual states correct in a real browser (not just code review), no behavior/contract changes.

---

## 2026-08-27 — Build 4 scoped: missed call / voicemail AI intake

**Phase:** scoping, no build-order step — no code changed

- Steven provided a detailed scoping note for a fourth build: an AI voice intake that picks up unanswered calls (after the normal ring, no AI while it's actively ringing), greets naturally, branches into new-enquiry / existing-customer / something-else, and for new enquiries collects the same field set as the Build 1 web form, then posts the same-shaped Slack card (tagged as phone-sourced) and sends a confirmation SMS. Decision already made in the note: use Vapi (managed voice orchestration) short-term to ship quickly, build a Twilio-based self-hosted equivalent independently in parallel for long-term ownership — consistent with this engagement's general preference for owned infrastructure over indefinite subscriptions.
- His own next-step #1 asked me to confirm how this slots into the existing repo. Reviewed `lib/db.ts`, `lib/slack.ts`, `db/schema.sql`, and `config/client.ts` against the new requirements: the `enquiries` table's `source` column, `insertEnquiry()`, and `buildSlackMessage()` are all already channel-agnostic and need no schema or logic changes — this build only needs a new route (`/api/voice-intake`), a new `lib/sms.ts` (same never-throws pattern as `lib/slack.ts`), and a new `lib/vapi.ts` to map Vapi's webhook payload onto the existing `EnquiryInput`/`SlackEnquiryPayload` shapes. **Recommendation: same repo, new route, not a separate service** — Vapi owns all the real-time audio infrastructure; this repo only ever receives a structured webhook once Vapi has already done the hard part, which is exactly what the existing Vercel serverless functions already do for `/api/enquiry`.
- Wrote this up as `docs/design/specs/build-4-missed-call-voicemail-intake.md` (pseudonymized, mirrors the Build 1 spec's structure) and `docs/decisions/2026-08-27-voice-orchestration-vapi-vs-self-build.md` (the Vapi-vs-self-build call, with the cost figures from Steven's note — ~5¢/min Vapi platform fee, ~30¢/min realistic all-in). Registered both in `docs/design/INDEX.md`, which also got its stale Build 1 status line corrected (it still read "Phase 0 — repo scaffold only," long out of date).
- **Found and flagged, not fixed:** the web form's "45-minute callback" badge (`app/page.tsx`) is hardcoded in JSX rather than reading from `config/client.ts` — a real gap now that Build 4 needs the same number in three places (spoken greeting, confirmation SMS, web badge) without drift. Proposed a `callbackWindowMinutes` config field in the spec; left unbuilt pending Steven's confirmation, since it's a small independent change that doesn't need Vapi to exist first.
- Deliberately did not resolve several open questions rather than guessing: SMS provider, whether to retain call recordings/transcripts (data-handling stance in Steven's own note suggests no, but that's his call), what the placeholder existing-customer/something-else branches should actually do in v1, the real (non-45-minute) callback commitment, and a "Build 2 acknowledgment-text principle" Steven's note references that isn't captured anywhere in this repo — flagged for him to either restate or confirm Build 4 should define its own. All logged as open questions in the new spec, §10.

**Verified:** N/A — documentation only, no code or infrastructure changed. Nothing to test yet; blocked on Steven provisioning a Vapi account and phone number before any code gets written (spec §11).

---

## 2026-08-27 — Slack message: every field explicitly labeled

**Phase:** Slack notification quality, no build-order step

- `lib/slack.ts`: previously only name (bold, unlabeled) and phone (as a `tel:` link) were guaranteed visible in the body; email and message were appended with no label if present, and postcode/job type/urgency only appeared inside the compact header line (`URGENT · Flat roof · AB24 3FX`) with no field name attached. Rewrote the body so every field gets an explicit `*Label:* value` line — Name, Phone, Email (if present), Postcode (if present), Job type, Urgency, Message (if present) — so nothing is ambiguous or easy to miss, the description/message field included. The compact header line is unchanged and still gives a fast triage glance.
- Verified locally against the real Slack webhook (posting doesn't need Vercel's OIDC token the way Blob does, so this didn't need a production deploy): submitted a full multipart request with invented data covering every optional field (email, postcode, a multi-sentence message) via `POST /api/enquiry` against `next start`. Response `200 { photoCount: 0 }`; queried the DB directly and confirmed every field — name, phone, email, postcode, job_type, urgency, message — persisted exactly as sent, which is the same payload `postToSlack` receives. Test row deleted afterward (`before: 1, after: 0`).
- Confirmed by Steven via screenshot: the message posted with every field clearly labeled and correctly valued — Name, Phone, Email, Postcode, Job type, Urgency, and Message (the invented flat-roof/felt description in full) — plus the existing compact header line and footer.

**Verified:** build clean, DB row confirms the full labeled payload sent to `postToSlack`, and Steven confirmed the rendered Slack message shows every field with its label, description included.

---

## 2026-08-27 — Card background light blue, entry fields white

**Phase:** post-Step-9 polish (continuation of the styling pass above), no build-order step

- Added a dedicated `--color-card-bg` token (light blue, `#dbeafe`; a muted navy in dark mode) separate from `--color-surface` (white/dark-neutral, used for the actual input fields), so the two can be styled independently rather than sharing one variable.
- Form card background switched to `--color-card-bg`; all entry fields (text/email/tel inputs, select, textarea, and the photo-upload button, which was previously blue-tinted) switched to or kept `--color-surface` — white, so they stand out clearly against the light-blue card.
- Verified via `npm run build` (clean) and a Playwright screenshot at 390px confirming the card is visibly light blue and every field is white.

**Verified:** build clean, screenshot confirms the intended contrast.

---

## 2026-08-27 — Step 9 photo upload verified in production; Build 1 core loop (Steps 1–9) complete

**Phase:** production verification, closing out Step 9

- Deployment `dpl_Gs581xQSuvG7eMQuPow4QCDLihcS` (commit `4d1b7ae`, the Step 9 photo-upload code) confirmed `READY` via the Vercel API.
- Submitted a real multipart request to the live endpoint (`POST /api/enquiry` on `payload-guard-workflow-smb-solution.vercel.app`) with two synthetic test JPEGs (this sandbox has no image tooling, so a minimal valid 1×1-pixel JPEG was generated via Node rather than skipped) and pseudonymized test data. Response: `200 { ok: true, photoCount: 2 }`.
- Queried the production DB directly for the resulting row: `photo_urls` held two real `https://*.public.blob.vercel-storage.com/...` URLs, not empty — confirming the OIDC Blob path (previously only proven with a raw `put()`/`del()` call) works end-to-end through the actual application code path.
- Both URLs independently `curl`'d: `200`, `content-type: image/jpeg`, correct byte size — confirmed publicly reachable, not just present in the DB.
- Steven confirmed via Slack screenshot that the enquiry card posted with an inline image block in place. The block rendered as a blank/gray square — expected and correct, since the uploaded file was a synthetic 1×1-pixel placeholder, not a real photo; the mechanism (upload → URL → DB → Slack image block) is what was under test, and it's confirmed working. A real user-submitted photo will render normally.
- Test enquiry row deleted from production DB after verification (`before: 1, after: 0`, confirmed by count). Queried the full `enquiries` table afterward — empty, so no other stray test rows (from this or earlier sessions) were left behind either. The two tiny synthetic test images remain in Blob storage (harmless, 287 bytes each, not linked from any DB row); not worth a temporary delete route for.

**Verified:** the last unverified piece of Build 1's core loop — real photo upload through production, DB persistence, public reachability, and inline Slack rendering.

**Result: Build 1's core loop (spec §9, Steps 1–9) is functionally complete and verified end-to-end in production.** Spec §10's full verification checklist (edge cases: broken Slack webhook, broken DB, 5th photo rejection, honeypot, mobile usability pass, etc.) has not yet been run as a formal pass — see `HANDOVER.md`.

---

## 2026-08-27 — Step 9: photos, built and verified (with one real bug caught and fixed)

**Phase:** 9 (photos — last piece of Build 1's core loop, per spec §9)

- `POST /api/enquiry` switched from JSON to `multipart/form-data` (matches the spec's architecture diagram, §2) — this is a real contract change, not additive; `EnquiryForm.tsx` now submits via `FormData` instead of a hand-built JSON object, which also let the submit handler shrink since `new FormData(form)` grabs every named field automatically (honeypot included).
- `components/PhotoInput.tsx`: `<input type="file" accept="image/*" multiple>`, client-side compression via `createImageBitmap` + canvas (resize to 1600px longest edge, JPEG quality 0.8, no extra dependency), enforces max 4 with a clear message when exceeded, preview list with remove buttons, "Compressing photos…" status text.
- `lib/blob.ts`: `uploadPhoto()` via `@vercel/blob`'s `put()`, random UUID key per photo (`enquiry-photos/<uuid>.jpg`) — independent of the enquiry id, so no ordering dependency on when the DB row gets created.
- `app/api/enquiry/route.ts`: added photo count/size validation (max 4, 10MB each → 400), then per-spec upload behavior — each photo uploaded in its own try/catch, a failed upload is logged and skipped rather than failing the whole enquiry ("a lost photo must not lose the lead").
- `lib/slack.ts`: `photoUrls` added to the payload, rendered as Slack `image` blocks between the body and footer so they show inline.
- **Real bug caught by testing, not just code review:** first version had the front-end report its *own* photo count (`photos.length`, captured before the request) in the success message, rather than what the server actually stored. Local Playwright testing surfaced this immediately — Blob uploads fail in this sandbox (see below), so the DB row had `photo_urls: []`, yet the success message confidently said "with 2 photos received." Fixed by having the endpoint return `photoCount: photoUrls.length` (the real, post-upload count) and having the client display that instead of its own guess. This isn't just a local-environment workaround — the same lie would happen in production any time a real upload genuinely fails, which the spec explicitly anticipates ("if an upload fails, continue without it"). The success state has to reflect what got persisted, not what the client attempted.
- **Environment limit, not a bug:** Vercel Blob's newer connection type authenticates via OIDC tokens minted by Vercel's platform infrastructure at request time. This sandbox's local `next start` has no such token (confirmed via the exact error: `Vercel Blob: No blob credentials found ... use oidcToken (or VERCEL_OIDC_TOKEN) with storeId`), so photo uploads can only be verified against the real deployment, not locally. Everything else (form, compression, validation, DB write with empty photo_urls, Slack post without image blocks) was fully verified locally first.
- Test images generated in-browser via canvas (no image tooling installed in this sandbox) rather than skipping the real-file test.

**Verified locally (Playwright + real DB/Slack, Blob upload path excluded — see above):** field errors, honeypot, valid submission without photos, compression producing a smaller file, and — after the fix — an honest success message when photos didn't actually get stored.

**Not yet verified:** the actual photo upload + inline Slack rendering, which needs the real deployment. Next step is pushing and checking production directly.

---

## 2026-08-27 — Vercel Blob provisioned; confirmed working via OIDC, not a static token

**Phase:** infra verification, no build-order step

- Steven created a Blob store (`payloadguard-photos`, LHR1, Public access — required for Slack's inline image rendering, which fetches URLs directly with no auth) and connected it to the project.
- First check: `BLOB_READ_WRITE_TOKEN` absent. Redeployed (env vars only apply to builds started after they're set) — still absent. Confirmed in the dashboard that the store genuinely showed as "Connected" to the project, so the connection itself wasn't the problem.
- Widened the diagnostic to list all env var names matching `/blob|token/i` rather than keep guessing single names: found `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY` present, `BLOB_READ_WRITE_TOKEN` genuinely never provided. This is Vercel's newer OIDC-based Blob connection — the SDK exchanges a store ID + OIDC token for a short-lived credential internally, rather than using a long-lived static token. Confirmed by testing the actual thing that matters — `put()`/`del()` — directly, rather than continuing to hunt for an env var this connection type doesn't use: real write + delete succeeded with zero explicit configuration.
- Consequence for `lib/blob.ts` (Step 9, not yet built): call `@vercel/blob`'s `put()`/`del()` with no explicit token argument — the SDK handles the OIDC exchange automatically via `BLOB_STORE_ID`. Don't add code that checks for or requires `BLOB_READ_WRITE_TOKEN`.
- Bumped `@vercel/blob` from an arbitrarily-pinned `0.27.1` to `2.8.0` — the old version pulled in a vulnerable `undici`; `npm audit` clean after the bump, `put()`/`del()` API unchanged for our usage.
- Diagnostic route removed after confirming; production `/api/enquiry` unaffected throughout (not re-verified this entry since no app code changed, only the diagnostic).

**Verified:** real Blob write/read/delete succeeded in production via the OIDC connection, no static token anywhere.

**Not done:** `lib/blob.ts` and the rest of Step 9 (client-side compression, wiring into the form and endpoint, inline Slack rendering).

---

## 2026-08-27 — Step 8: the enquiry form, built and verified in a real browser

**Phase:** 8 (front-end, per spec §9 — "only now")

- Steven signed off explicitly: functionality is the objective, layout/design can change later. Built accordingly — plain, functional CSS, no visual investment beyond the spec's non-negotiables.
- `components/EnquiryForm.tsx`: client component, all fields from the data schema (name/phone required, email/postcode/message optional, job_type as a native `<select>` populated from `config/client.ts`, urgency as a tappable radio-button group rather than a select since there are only 3 options and the spec explicitly wants large tap targets over a dropdown). Honeypot field (`company_website`) included, visually hidden off-screen (not `display:none`, so it stays in the DOM for anything that scrapes visible-in-markup fields) and `tabIndex={-1}` so real keyboard users skip straight past it.
- Wired the honeypot server-side too: `app/api/enquiry/route.ts` now checks `company_website` before validation (spec §4 step 1) and returns an identical-looking `200` without writing anything if populated — bots get no signal they were caught.
- Submit flow: `400` → field-level errors rendered next to each field, form stays. Any other non-2xx or network failure → plain-language error message, tells the customer to call instead. Success → replaces the form with "Enquiry sent" and confirms job type + postcode (photo count deliberately not included yet — that's Step 9, no photo input exists on the form yet).
- `app/page.tsx` now renders the real form instead of the placeholder text.
- **Tested in an actual browser, not just curl** — installed `playwright` temporarily (`npm install --no-save`, never touched package.json/lock) and drove the pre-installed Chromium against `next start` at a mobile viewport (390×844): empty submit → field errors shown correctly next to fields; valid submit → real DB write + real Slack post confirmed (screenshot from Steven matched the id exactly, `775b07df...`) + success state rendered correctly; Tab key → visible focus ring confirmed on-screen, honeypot correctly skipped in tab order. Screenshots reviewed directly, not just trusted from text output.
- Cleaned up: scratch test script deleted, test DB row deleted, `playwright` was never added to package.json (confirmed via `git status` before committing).

**Verified:** full form flow in a real browser — errors, success, focus visibility, honeypot skip, and the real DB+Slack write all confirmed with screenshots, not assumed from code review.

**Not done:** Step 9 (photos — client-side compression, blob upload, inline Slack rendering, success state extended to include photo count).

---

## 2026-08-27 — Step 7: dedupe wired in and verified

**Phase:** 7 (dedupe, per spec §9)

- `lib/dedupe.ts`: `computeDedupeHash(phone, message, at)` — sha256 of `phone|message|hour-bucket`, hour truncated in UTC. `findExistingEnquiryId(hash)` looks it up.
- `db/schema.sql` updated: added `dedupe_hash text` column + index. Written idempotently (`CREATE TABLE IF NOT EXISTS` with the column included, plus `ALTER TABLE ADD COLUMN IF NOT EXISTS` below it) so it's safe to run against either a fresh table or the one already live in production.
- Applied the migration directly to production. First attempt ran the whole file as one `sql()` call and failed — the Neon HTTP driver's tagged-template query doesn't support multiple statements per call (`cannot insert multiple commands into a prepared statement`). Split into individual statements and ran each in sequence; confirmed via `information_schema.columns` that `dedupe_hash` exists.
- `lib/db.ts`: `insertEnquiry()` now stores `dedupe_hash` on every row.
- `app/api/enquiry/route.ts`: after validation, compute the hash from the current request; if a matching hash already exists, return `200` with the existing id and skip both the insert and the Slack post (it's the same enquiry, already announced). Otherwise insert as before (now with the hash) and proceed to Slack.
- Verified locally against the real database: identical payload submitted twice → same id both times, confirmed only one row in the DB; a payload with a different message (same phone, same hour) → a genuinely new id and a second row. Both test rows deleted after confirming.

**Verified:** dedupe collapses true duplicates, doesn't over-collapse distinct enquiries. Confirmed against the real production database, not mocked.

**Not done:** honeypot handling, Step 8 (the actual form), Step 9 (photos).

---

## 2026-08-27 — Step 6: Slack wired in, full pipeline verified

**Phase:** 6 (Slack notification, per spec §9)

- Wired `lib/slack.ts`'s `postToSlack()` into `app/api/enquiry/route.ts`, called after the DB insert succeeds. `postToSlack()` already never throws (built in Step 2's session), so the critical rule — Slack failure must never surface to the caller — is enforced by construction, not an extra try/catch. A failed delivery is logged via `console.error` (Vercel function logs) for now; no dedicated replay queue exists yet, out of scope for this build.
- Verified locally against the real webhook and real DB together: valid payload → `200` with id, row confirmed in Postgres, message confirmed landing correctly in Slack (screenshot from Steven — header now carries the postcode: `URGENT · Roof repair · AB16`, matching the DB row's id exactly).
- Verified the critical failure case: deliberately broken `SLACK_WEBHOOK_URL` → still `200` with id, DB row still written and confirmed present, failure logged server-side (`Slack delivery failed for enquiry ...: Slack responded 404`) rather than thrown.
- Both test rows deleted after verification — table stays empty of test data.

**Verified:** full pipeline (validate → DB write → Slack notify) confirmed working end-to-end locally, both the happy path and the Slack-failure path, before pushing.

**Not done:** Step 7 (dedupe), Steps 8–9 (form, photos).

---

## 2026-08-27 — Step 5: DB log wired in and verified end-to-end

**Phase:** 5 (Postgres log, per spec §9)

- Got the real `DATABASE_URL` connection string from Steven, saved to local `.env.local`.
- First attempt used `pg` (node-postgres) against the pooled connection string. Hung indefinitely rather than erroring — checked rather than assumed: tested raw TCP to the Neon host on port 5432 directly (`/dev/tcp/...`), confirmed connection failed. This sandbox's outbound network only routes proxied HTTPS; there is no path to arbitrary TCP ports including Postgres's 5432.
- Switched to `@neondatabase/serverless`, Neon's HTTP-based driver (queries over HTTPS instead of raw TCP). This isn't just a sandbox workaround — it's also Neon/Vercel's own recommended driver for serverless functions generally, since it sidesteps connection-pool exhaustion under concurrent invocations. Swapped `pg`/`@types/pg` out for it in package.json.
- `db/schema.sql`: `enquiries` table per the spec's data schema (§3). `id` is generated in application code via `crypto.randomUUID()` rather than a Postgres extension (`gen_random_uuid()` needs `pgcrypto` on older PG versions) — simpler, no extension dependency, still satisfies "generated server-side."
- `lib/db.ts`: `insertEnquiry()` using the Neon HTTP driver, parameterized query, returns `{ id, createdAt }`.
- Proved standalone first (same pattern as Slack): temporary script ran the schema migration, inserted a test row, queried it back to confirm the exact fields landed correctly, deleted it. Table confirmed created and working before touching the endpoint.
- Wired into `app/api/enquiry/route.ts`: after Zod validation passes, inserts the record (`source: "web_form"`); success now returns `{ ok: true, id }` (the endpoint finally has a real id, not just a stub `ok: true`); DB failure is caught and returns `500` without leaking internals.
- Verified all three of the spec's checklist cases locally against `next start`, hitting the real database: valid payload → `200` with id, confirmed the row actually exists in Postgres with correct fields via a separate query (not just trusting the response), then deleted the test row; invalid payload → still `400`, confirmed no DB hit; DB failure (deliberately broken `DATABASE_URL`) → `500`, no crash, no leaked error detail.

**Verified:** locally against the real production database (Neon has one database, no separate per-environment split at this stage) — write, read-back, and failure path all confirmed before pushing.

**Not done:** Step 6 (Slack wiring — `lib/slack.ts` already built, needs plugging in after the DB insert), Step 7 (dedupe), Steps 8–9 (form, photos).

---

## 2026-08-27 — Postgres provisioned; DATABASE_URL confirmed reaching production

**Phase:** infra verification, no build-order step

- Steven provisioned Postgres via Vercel's Storage tab (Neon-backed marketplace integration — Vercel's native Postgres product is now a Neon integration, confirmed via Vercel docs search rather than assumed) and connected it to the project.
- Same pattern as the Slack env var check: rather than assume the connection worked or guess the variable name, deployed a temporary diagnostic route checking presence (never values) of every plausible name Neon's integration might use.
- Result: `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `POSTGRES_URL`, `POSTGRES_URL_NON_POOLING`, `POSTGRES_PRISMA_URL`, `POSTGRES_HOST`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DATABASE` all present. `DATABASE_URL` — the exact name the spec calls for — is confirmed, so `lib/db.ts` needs no naming workaround.
- Removed the diagnostic route immediately, redeployed, confirmed both that the debug route now 404s and `/api/enquiry` still returns 200 for a valid payload.
- Still need the actual `DATABASE_URL` connection string value in local `.env.local` to build/test `lib/db.ts` before it's wired in — asked Steven to pull it from the Storage tab's quickstart snippet.

**Verified:** `DATABASE_URL` reachable in production. Diagnostic route fully removed.

**Not done:** `lib/db.ts` itself (Step 5) — next up once the local connection string is in hand for testing.

---

## 2026-08-27 — SLACK_WEBHOOK_URL confirmed reaching production

**Phase:** infra verification, no build-order step

- Steven added `SLACK_WEBHOOK_URL` as a Vercel **Shared** (team-level) environment variable rather than a per-project one, then reported the standard per-project env var fields greyed out on mobile.
- Rather than guess whether the Shared variable actually applies to this project, deployed a temporary diagnostic route (`app/api/debug-env-check/route.ts`, boolean presence check only, never the value) to prove it directly.
- First attempt used a leading underscore (`_env-check`) — Next.js treats underscore-prefixed segments as private/unrouted folders, so the route silently never registered. Caught by checking the build output's route table rather than assuming the file existed meant it worked; renamed to `debug-env-check` and it appeared correctly.
- Deployed, curled `https://payload-guard-workflow-smb-solution.vercel.app/api/debug-env-check` → `{"slackWebhookConfigured":true}`. Confirmed: the Shared variable does reach this project's production runtime. The greyed-out UI Steven saw isn't blocking anything.
- Removed the diagnostic route immediately, redeployed, confirmed both that debug-env-check now 404s and that `/api/enquiry` still works correctly.

**Verified:** `SLACK_WEBHOOK_URL` reachable in production. Diagnostic route fully removed, confirmed via live 404 + `/api/enquiry` still returning 200 for a valid payload.

**Not done:** still waiting on `DATABASE_URL` for Step 5.

---

## 2026-08-27 — Step 2 confirmed; lib/slack.ts built and proven standalone

**Phase:** 2 done; Slack module built ahead of Step 6 wiring (held back deliberately)

- Steven created the Slack app, enabled Incoming Webhooks, added it to a test channel, and confirmed "pipeline test" landed. Step 2 (spec §9) is done.
- `SLACK_WEBHOOK_URL` saved to local `.env.local` (gitignored, confirmed via `git check-ignore`, confirmed absent from `git status`). Production env var still needs Steven to add it in the Vercel dashboard — no tool available here can set Vercel env vars (checked the Vercel MCP toolset and the `vercel` CLI; neither is available/authenticated in this environment), so this one is on him.
- Built `lib/slack.ts` for real: message formatting per spec §5 (header line urgency/job-type/postcode, tap-to-call phone, footer with id/timestamp), `postToSlack()` wrapped in try/catch so a delivery failure can never throw — returns `{ ok: false, error }` instead, matching the "Slack failure must not surface" rule.
- Deliberately did **not** wire this into `app/api/enquiry/route.ts` yet. Spec §9 Step 6 is "Post to Slack. Post after the log write" — Step 5 (DB log) doesn't exist yet, and wiring notification ahead of the durable write would invert the core principle (log is source of truth, notification is not). Holding the line on build order even though Steven only asked for Slack, not to skip Step 5.
- Proved the module standalone instead, same spirit as Step 2's own curl proof: temporary script (`scratch-test-slack.ts`, never committed, deleted immediately after) imported `postToSlack` directly and ran three cases via `npx tsx`:
  - Real webhook, valid payload → `{"ok":true}`, message confirmed formatted correctly.
  - Broken webhook URL → `{"ok":false,"error":"Slack responded 404"}`, no throw.
  - Missing env var → `{"ok":false,"error":"SLACK_WEBHOOK_URL not set"}`, no throw.
- `npm run build` and `npm run lint` still clean; `/api/enquiry` route size unchanged in the build output, confirming `lib/slack.ts` genuinely isn't bundled into it yet.

**Verified:** Slack module works standalone against the real webhook, both success and failure paths. Endpoint itself unchanged.

**Not done:** Step 5 (DB) — next up once Steven has `DATABASE_URL`. Step 6 (actually wiring Slack into the endpoint) waits on that.

---

## 2026-08-27 — Steps 3 & 4: bare endpoint + validation

**Phase:** 3–4 (built in parallel with Step 2, which Steven is doing on his own account)

- Steven asked what could be built ahead of connecting external services. Steps 3 (bare `POST /api/enquiry` returning `{"ok": true}`) and 4 (Zod validation) need zero external credentials, so built both now rather than block on Slack setup. Explicitly did not touch Steps 5/6 (DB, Slack) or Step 8 (form) — those need Steven's setup or come later in the sequence by design.
- `app/api/enquiry/route.ts` created for real (the Phase 0 stub attempt had been reverted because Next.js requires route files to be valid modules).
- `lib/schema.ts`: Zod schema for the enquiry input, enum values for `job_type`/`urgency` derived directly from `config/client.ts` rather than duplicated, so the two can't drift.
- Verified locally before any push: `npm run build`, `npm run lint`, then `npm run start` + curl against `localhost:3000` for three cases — empty body, invalid enum values, and the spec's own valid-payload example. All three matched expected status/body.
- No DB write, Slack post, or dedupe yet. No env vars touched.

**Verified:** locally (build/lint/curl), then re-verified against the live production URL after deploy — all three cases (empty body, invalid enums, valid payload) matched local results exactly.

**Not done:** Step 2 (Steven, in progress), Steps 5–9.

---

## 2026-08-27 — Step 1: live deploy verified

**Phase:** 1 (deploy loop, per spec §9)

- Discovered a live Vercel MCP connection already available (Hobby plan, team `stevenallandark-2930's projects`) — no manual dashboard setup needed from Steven after all.
- First `create_git_project` call failed 403 (permission/GitHub App access); Steven granted access, retry succeeded and reused an already-existing Vercel project (`payload-guard-workflow-smb-solutions`) linked to `main`.
- Deployment initially appeared inaccessible (302 → Vercel SSO login) — this is deployment protection (`ssoProtection: all_except_custom_domains`) gating the per-deployment preview URL, not a broken build. Verified via `get_project_deployment_protection` rather than assuming.
- Confirmed the actual page content two ways: `web_fetch_vercel_url` (authenticated) returned 200 with the correct HTML, then a plain unauthenticated `curl` against the stable production alias `https://payload-guard-workflow-smb-solution.vercel.app` also returned 200 — so the production URL is genuinely public, no Vercel login required. Preview URLs stay SSO-gated, which is fine, nothing needs to hit those.
- Flagged to Steven, not yet decided: GitHub repo is public (content is clean, no PII/secrets — confirmed by a full-tree grep for the pseudonymized-out terms before the Phase 0 commit).
- No env vars, Postgres, or Blob storage set up yet — that starts at Step 5.

**Verified:** live HTTPS URL reachable and correct, unauthenticated. Step 1 checklist item (spec §9) done.

**Not done:** Steps 2–9.

---

## 2026-08-27 — Repo structure + docs scaffold

**Phase:** 0 (repo setup, no application logic yet)

- Read the Build 1 spec (Enquiry Capture Pipeline) in full.
- Renamed the working branch to `main`; agreed workflow going forward is direct commits to `main`, no long-lived feature branches.
- Agreed PII policy: pilot client pseudonymized as `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT` everywhere in this repo until a real deployment is confirmed. Region (Aberdeen) and trade (roofing) kept real per Steven — confirmed first target market, not identifying info.
- Scaffolded Next.js 15 + TypeScript + App Router, bare default page, no business logic (matches spec Step 1 — "deploy an empty app").
- Created the directory layout from the spec (§8): `lib/`, `components/`, `config/`. Files for phases not yet started (`lib/schema.ts`, `lib/db.ts`, `lib/slack.ts`, `lib/dedupe.ts`, `lib/blob.ts`, `components/EnquiryForm.tsx`, `components/PhotoInput.tsx`) are one-line stubs noting which build step fills them in — intentional, not forgotten. `app/api/enquiry/route.ts` deliberately **not** created yet: tried a one-line-comment stub there first, `next build` failed it as "not a module" since Next.js validates route files against its handler-export contract — unlike `lib/`/`components/`, that path isn't a safe place for a placeholder. It gets created for real at Step 3. Caught by actually running the build, not assumed.
- `config/client.ts` written with the pseudonymized `CLIENT_ALPHA` config and real job-type taxonomy from the spec.
- Added `docs/design/specs/build-1-enquiry-capture-pipeline.md` — pseudonymized copy of the full spec, kept in-repo for reference during the build.
- Steven flagged that design addendums will keep coming and asked for an explicit, categorized structure instead of a flat growing doc pile. Restructured `docs/` into `docs/design/`: `INDEX.md` (always-current map), `core-principles.md` (the stable through-line extracted from the Build 1 spec — log-as-truth, config-per-client, phased verification, mobile-first, PII policy, cheap-first), `specs/` (canonical per-build specs), `addenda/` (categorized, dated deltas that get merged into the canonical spec once accepted — see `docs/design/addenda/README.md` for the workflow). `docs/decisions/` kept separate for engineering/technical decisions, distinct from product/design deltas.
- Added `CLAUDE.md`, `README.md`, `HANDOVER.md` establishing working conventions (test not guess, Steven decides, docs current every commit, PII policy, addenda workflow).

**Verified:** not yet — no deploy has happened. Next session's first job is Step 1's actual verification (push, connect Vercel, confirm live URL) before writing any logic.

**Not done / explicitly deferred:** Steps 2 through 9 of the build order (Slack webhook proof, bare endpoint, validation, DB log, Slack integration, dedupe, form, photos). Nothing implemented ahead of the current phase.
