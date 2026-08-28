# Missed Call & Voicemail Intake — Build 4 Specification

> Pseudonymized copy. `CLIENT_ALPHA` = the pilot client's business, `CLIENT_ALPHA_CONTACT` = the primary contact. Region (Aberdeen) and trade (roofing) are kept real — see `CLAUDE.md` for the PII policy.

**Purpose:** Turn an inbound phone call that goes unanswered into the same kind of structured Slack lead Build 1 produces from the web form — via an AI voice intake that picks up after the normal ring, not a traditional voicemail beep.

**Status:** General-enquiries branch built and fully verified in production (2026-08-28) — DB write, Slack card, and SMS confirmation all confirmed working against the real deployed endpoint, real Twilio account, and a real received text. The only remaining gap is a genuine phone call: nothing on the Vapi side points at this webhook yet (Server URL is set; the Analysis-tab structured data schema is not). Emergency-branch routing is a separate, later piece — not this route. See §11.

**Depends on:** Build 1's pipeline (live) — this build reuses its DB table, its Slack message builder, and its config pattern rather than creating parallel ones.

## 1. Problem being solved

Single-phone-line trades business. The owner is routinely unreachable — up a roof, driving, mid-job, already on another call. Two failure modes today:

1. No voicemail left — call is simply missed, no record, no possible callback.
2. Voicemail left — unstructured audio that has to be remembered, checked, listened to, and manually actioned. By the time the owner is free, they may not know a lead came in at all, or have to spend time transcribing and prioritizing by ear.

## 2. Desired flow

1. Call rings through normally for the standard duration — no AI involvement while the phone is actively ringing, in case someone is free to answer live.
2. If unanswered, the call falls through to an AI voice intake — not "please leave a message after the tone." The transition from ringing to the AI should feel like a continuous, attended experience, not a beep.
3. The AI opens with a warm, natural-sounding greeting — explicitly not robotic or call-center sounding. Rough shape: identifies as CLIENT_ALPHA, apologises for missing the call, states the callback window commitment (§4 — must be config-driven, not hardcoded), moves straight into taking details.
4. The AI asks a small number of branching questions to route the call. This has evolved from the original three-way split into three named routes Steven is building directly in Vapi: **General enquiries** (this route — the one built and described below), **Business / existing-customer queries**, and **Emergency calls** (separate, similar-but-immediate logic, its own route/assistant, not built here — see §10.1).
5. The general-enquiries assistant currently collects four fields (confirmed directly from its live system prompt in the Vapi dashboard): name, phone, postcode, and a description of the problem. It does **not** yet ask about job type or timing/urgency — Steven is adding that next. This route was built to degrade gracefully in that gap (§3).
6. On completion: a structured Slack card posts to the same channel as Build 1, same visual format, clearly tagged as having come in by phone rather than the web form (§5). A confirmation SMS goes back to the caller summarising what was taken down, so they know they've been heard rather than left in a void.

## 3. Data schema

**Reuses the existing `enquiries` table as-is — no new columns needed, none added.**

| Field | Source in this build |
|---|---|
| `name` | Asked by the AI |
| `phone` | From the assistant's collected field, falling back to the caller-ID number (`call.customer.number`) if that's missing |
| `email` | Not currently asked by this assistant — stays empty |
| `postcode` | Asked by the AI |
| `job_type` | **Defaults to `"other"`.** The current assistant doesn't ask about job type at all (confirmed from its live system prompt) — it only collects name/phone/postcode/description. Visible on the Slack card as "Job type: Something else" alongside the raw description, so a human isn't misled into thinking it was actually classified. |
| `urgency` | **Derived, not asked directly.** The assistant doesn't collect urgency yet either. `lib/vapi.ts`'s `mapTimeframeToUrgency()` accepts an optional `timeframe` field (for when Steven adds the timing question he described) and keyword-maps it onto the existing 3-value enum; defaults to `"this_week"` when no timeframe is present, as a safe middle ground. The raw timeframe text, once collected, is always appended to `message` too — CLIENT_ALPHA_CONTACT sees the caller's actual words, not just the bucketed guess. |
| `message` | The description field, with `Timeframe given: ...` appended when present |
| `photo_urls` | Not applicable to this channel — stays `{}` |
| `source` | **`"call"`** — per Steven's explicit instruction, not the `missed_call_ai_intake` this doc originally proposed |

`lib/db.ts`'s `insertEnquiry()` needed no changes — confirmed by using it unmodified.

### On "voicemail"

As anticipated in this section's earlier draft: the flow never produces a traditional unstructured voicemail recording. The assistant's structured description *is* the record. `source: "call"` reflects that.

## 4. The callback window — must be config, not copy

The 45-minute commitment carries over from the web form for consistency, but per Steven's note it is **not validated with CLIENT_ALPHA_CONTACT** and **must be trivially changeable per client**.

**Existing gap found while reviewing the repo for this spec:** the web form's badge (`app/page.tsx`) currently hardcodes the string `"45-minute callback, with text updates"` directly in JSX — it does not read from `config/client.ts`. That's a pre-existing violation of core principle #3 (config-per-client, logic-shared), not something this build introduces, but this build makes it load-bearing: the same number needs to appear in the AI's spoken greeting, the confirmation SMS, and the web form badge, and it cannot drift between the three.

**Done (2026-08-27):** `callbackWindowMinutes: 45` added to `config/client.ts`, and the web form's hero badge now reads `activeClient.callbackWindowMinutes` instead of a hardcoded string. Still outstanding: once the Vapi assistant and SMS confirmation exist, their greeting/template copy must read this same value rather than hardcoding it again — this fix only covers the one place that existed before this build was scoped.

## 5. Slack message format

**Built.** `lib/slack.ts`'s `SlackEnquiryPayload` gained one new optional field, `channel?: string`, rendered as a `*Source:* {channel}` line only when present — the web form never sets it, so Build 1's already-verified-in-production output is byte-for-byte unchanged. The voice-intake route passes `channel: "Phone call"`. Verified locally: a synthetic call posted with `Source: Phone call` visible, confirmed by Steven via screenshot against the real Slack channel. No photo blocks (not applicable to this channel).

## 6. Confirmation SMS

**Built and verified with a real send.** `lib/sms.ts` follows the same never-throws pattern as `lib/slack.ts`: `sendConfirmationSms()` checks for `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER`, returning `{ ok: false, error: "SMS provider not configured" }` cleanly if any are missing. Provider is Twilio, confirmed by Steven — and the number Vapi calls through (`+447846727576`) turned out to already be Twilio-hosted and SMS-capable (confirmed via Twilio's API: `capabilities.sms: true`, and its `voice_url` already points at Vapi's own inbound-call handler), so the confirmation comes from the same number the caller rang, not an unrelated one.

Verified 2026-08-28: credentials validated against Twilio's Account API (200, active), the number's SMS capability confirmed the same way, then the real shipped `lib/sms.ts` module (not a re-implementation — run directly via Node's TS support) sent an actual message to Steven's phone, which he confirmed arrived correctly worded, including the config-driven callback-window value. Message copy pulls `callbackWindowMinutes` from config (§4), not hardcoded.

**Done in production (2026-08-28):** all three Twilio env vars added to Vercel. First attempt failed silently in a specific way worth recording — the Key field was filled with the secret *value* instead of the variable *name*, so `process.env.TWILIO_ACCOUNT_SID` never resolved. Confirmed via Vercel's runtime logs (`Confirmation SMS failed ...: SMS provider not configured`) rather than guessing. Fixed, redeployed, re-tested against the live production endpoint: no error logged, and Steven confirmed the text arrived.

## 7. Architecture

```
Caller ──(unanswered)──► Vapi (managed telephony + STT/TTS + call orchestration)
                              │
                              │ webhook, HTTPS POST — one of two message types (both handled):
                              │  • end-of-call-report + analysis.structuredData (current setup,
                              │    no Tool configured on the assistant — this is the live path)
                              │  • tool-calls (supported for if/when a custom Tool is added)
                              ▼
                    /api/voice-intake  (built)
                              │
                              │ 1. verify HMAC signature (skipped gracefully if VAPI_WEBHOOK_SECRET unset)
                              │ 2. dedupe check          ── reuses lib/dedupe.ts
                              │ 3. WRITE LOG              ── reuses lib/db.ts, same `enquiries` table
                              │ 4. post to Slack          ── reuses lib/slack.ts + source tag (§5)
                              │ 5. send confirmation SMS  ── lib/sms.ts (stubbed, §6)
                              │ 6. return 200 (or a tool result, for the tool-calls path)
                              ▼
                    Same Postgres table, same Slack channel as Build 1
```

Verified locally end-to-end against a synthetic `end-of-call-report` payload (since no live call has hit this yet): DB row written with the correct fields and `source: "call"`, Slack card posted and confirmed by Steven via screenshot showing every field plus `Source: Phone call`, a retry with identical data correctly deduped (no second row, no second Slack post), and a payload missing name/phone correctly no-op'd rather than writing a broken row.

**Recommendation: same repo, new route — not a separate service.** Reasoning:

- All the durable-state pieces this build needs already exist and are already channel-agnostic: `insertEnquiry()` takes a plain `source` string, `buildSlackMessage()` is already parameterized by payload not by channel, `config/client.ts` already models config-per-client.
- Vapi is a managed platform — it handles the actual real-time audio (STT, TTS, latency, barge-in) entirely on its own infrastructure. This repo never touches raw audio; it only receives a structured webhook once Vapi has done the hard part. That's a lightweight serverless function, exactly what the existing Vercel deployment already runs for `/api/enquiry`.
- Splitting into a separate service would only start to make sense if/when the self-built Twilio-based path (Steven's longer-term secondary path, §9) needs to host its own real-time audio-handling infrastructure — that's a different shape of workload (long-lived streaming connections) than this Next.js app's request/response functions. Worth revisiting at that point, not now.

## 8. Repository structure — additions

```
app/
  api/
    voice-intake/
      route.ts          # BUILT — receives Vapi webhooks, both message types
lib/
  sms.ts                 # BUILT — confirmation SMS, Twilio-shaped, stubbed until credentials exist
  vapi.ts                 # BUILT — payload parsing, urgency heuristic, signature verification
config/
  client.ts               # DONE — callbackWindowMinutes added (§4)
```

No changes needed to `db/schema.sql`, `lib/db.ts`, or `lib/dedupe.ts` — confirmed by using them unmodified.

### Environment variables

```
VAPI_WEBHOOK_SECRET=      # optional but recommended — HMAC verification skips gracefully if unset
VAPI_ASSISTANT_ID=        # optional — lightweight sanity check, skips gracefully if unset
TWILIO_ACCOUNT_SID=       # for the SMS confirmation to actually send
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

None of these are set in production yet. Notably, **no Vapi API key is needed** — this route only ever receives from Vapi, never calls out to it, so nothing needs storing for that. `VAPI_ASSISTANT_ID` isn't a secret (it's an identifier), so it's low-risk to add whenever convenient.

## 9. Vapi vs. self-built — decision

Recorded in full in `docs/decisions/2026-08-27-voice-orchestration-vapi-vs-self-build.md`. Summary: build on Vapi now to get this live and delivering value without delay; build the Twilio-based self-hosted equivalent independently in parallel for long-term ownership, consistent with this engagement's general preference for owned infrastructure over indefinite SaaS subscriptions. Not a blocker for starting — the self-built path is explicitly a parallel, longer-term track, not a prerequisite.

## 10. Open questions — not yet resolved, need Steven's input

1. **Business/existing-customer queries and Emergency-call branches.** Steven is building these as separate routes/assistants in Vapi directly, with the emergency branch needing "similar but immediate logic" — not part of this route or this spec's build. Whether they should also write a minimal trace row (this spec's original recommendation) is still open once those branches actually exist.
2. ~~SMS provider~~ — resolved: Twilio, confirmed with a real send (§6). No longer open.
3. **Call recording / transcript retention.** Vapi can typically provide a recording and/or transcript of the call. Steven's note doesn't ask for these to be stored, only for the structured fields extracted from them. Given the "Data handling" stance in the scoping note (customer data beyond what's needed to operate the tool requires specific consent and specific use cases, not default collection), the default here should probably be **don't store the raw recording or full transcript**, only the structured fields — but that's your call to confirm, not mine to assume.
4. **Processor status / data residency.** Build 1's spec already flagged this as unresolved before Build 2 (§12.1 of that spec): whose infrastructure holds customer data, and under what legal basis. This build makes it sharper — live phone numbers and spoken details flowing through Vapi (a third party) before they ever reach our Postgres. Needs resolving before this goes live with a real client, not before it's prototyped on Steven's own line.
5. **Real callback-window number.** 45 minutes (now in `config/client.ts` as `callbackWindowMinutes`) is explicitly a placeholder to test against, not validated with CLIENT_ALPHA_CONTACT.
6. **Cost to CLIENT_ALPHA, if any.** Explicitly deferred in Steven's note, to be addressed separately from the technical build.
7. **The Build 2 "acknowledgment text principle."** Steven's note references a principle "already agreed for build 2, on-site capture" for the confirmation-SMS wording. There is no Build 2 spec or decision doc in this repo yet — `docs/design/INDEX.md` lists Build 2 as "Not written yet." This build's SMS copy (§6) is being scoped without that reference. Flagging rather than guessing at content that hasn't been captured anywhere.

## 11. What's left before a real call has been proven end-to-end

1. ~~Confirm repo structure fit~~ — done.
2. ~~Build `/api/voice-intake`, `lib/vapi.ts`, `lib/sms.ts`, config addition~~ — done, verified against synthetic payloads (§7).
3. ~~SMS provider decision~~ — Twilio, confirmed working with a real send to Steven's phone (§6).
4. ~~Add the three Twilio env vars to Vercel's production environment~~ — done; hit and fixed a real misconfiguration (Key field held the secret value, not the variable name) along the way, diagnosed via Vercel's runtime logs rather than guessing (§6).
5. ~~Set the Server URL~~ — done, `https://payload-guard-workflow-smb-solution.vercel.app/api/voice-intake`.
6. **Configure the Analysis-tab structured data schema in Vapi.** This is the one piece left before a real call reaches this webhook at all — Server URL alone isn't enough; Vapi needs to know what structured data to extract and send. Schema given to Steven in chat (name/phone/postcode/description).
7. **Confirm the exact field/schema key names** match what `lib/vapi.ts`'s `extractFields()` expects once the schema above is actually configured — built against a best guess from the live system prompt.
8. **A real end-to-end test call** — ring the number, let it go unanswered, confirm the Slack card, DB row, and SMS all land correctly from an actual call. Everything downstream of Vapi's webhook is now proven in production; this is the only remaining unverified link.
9. Add the timing/urgency question to the assistant's system prompt (Steven's stated next step for the agent itself) and confirm `mapTimeframeToUrgency()`'s keyword heuristic actually fits the real wording once it exists.

## 12. What's out of scope for v1 (from Steven's note)

- Routing to specific team members — posts to the single main Slack channel only.
- Full logic for existing-customer and "something else" branches beyond the minimal trace recommended in §10.1.
- Any customer-facing status page or portal.
- Any use of accumulated call data for downstream purposes beyond immediate lead capture.
