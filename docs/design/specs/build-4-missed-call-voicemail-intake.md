# Missed Call & Voicemail Intake — Build 4 Specification

> Pseudonymized copy. `CLIENT_ALPHA` = the pilot client's business, `CLIENT_ALPHA_CONTACT` = the primary contact. Region (Aberdeen) and trade (roofing) are kept real — see `CLAUDE.md` for the PII policy.

**Purpose:** Turn an inbound phone call that goes unanswered into the same kind of structured Slack lead Build 1 produces from the web form — via an AI voice intake that picks up after the normal ring, not a traditional voicemail beep.

**Status:** Scoping only. This document formalizes Steven's scoping note (2026-08-27) into the repo's spec format. Not yet built — no Vapi account, phone number, or SMS provider exists yet. See §11 for what has to happen before Claude Code can start building.

**Depends on:** Build 1's pipeline (live) — this build reuses its DB table, its Slack message builder, and its config pattern rather than creating parallel ones.

## 1. Problem being solved

Single-phone-line trades business. The owner is routinely unreachable — up a roof, driving, mid-job, already on another call. Two failure modes today:

1. No voicemail left — call is simply missed, no record, no possible callback.
2. Voicemail left — unstructured audio that has to be remembered, checked, listened to, and manually actioned. By the time the owner is free, they may not know a lead came in at all, or have to spend time transcribing and prioritizing by ear.

## 2. Desired flow

1. Call rings through normally for the standard duration — no AI involvement while the phone is actively ringing, in case someone is free to answer live.
2. If unanswered, the call falls through to an AI voice intake — not "please leave a message after the tone." The transition from ringing to the AI should feel like a continuous, attended experience, not a beep.
3. The AI opens with a warm, natural-sounding greeting — explicitly not robotic or call-center sounding. Rough shape: identifies as CLIENT_ALPHA, apologises for missing the call, states the callback window commitment (§4 — must be config-driven, not hardcoded), moves straight into taking details.
4. The AI asks a small number of branching questions to route the call, kept deliberately simple for v1:
   - **New job enquiry** — fully scoped below (§3).
   - **Existing customer / follow-up on an existing job** — placeholder only, see §10 open question.
   - **Something else** — catch-all, placeholder only, see §10 open question.
5. New-job-enquiry branch collects the same fields as the web form, so both channels produce identically shaped leads (§3).
6. On completion: a structured Slack card posts to the same channel as Build 1, same visual format, clearly tagged as having come in by phone rather than the web form (§5). A confirmation SMS goes back to the caller summarising what was taken down, so they know they've been heard rather than left in a void.

## 3. Data schema

**Reuses the existing `enquiries` table as-is — no new columns.** Every field the AI collects maps directly onto Build 1's schema:

| Field | Source in this build |
|---|---|
| `name` | Asked by the AI |
| `phone` | Caller ID (the number that called), confirmed verbally if unclear |
| `email` | Asked, optional — same as web form |
| `postcode` | Asked, optional — same as web form |
| `job_type` | Same 7-value enum as the web form (`config/client.ts`) — the AI must map the caller's own words onto one of these, not invent new categories |
| `urgency` | Same 3-value enum — the AI must map onto `urgent` / `this_week` / `quote_only` |
| `message` | Free-text description of the problem, same as web form's `message` |
| `photo_urls` | Not applicable to this channel — stays `{}` |
| `source` | **Proposed:** `missed_call_ai_intake` — distinct from `web_form`. Confirm or rename. |

Reusing the table means `lib/db.ts`'s `insertEnquiry()` needs no changes — it already takes `source` as a plain string.

### On "voicemail"

Steven's note titles this "missed call and voicemail intake," but the flow described (§2) never leaves a traditional unstructured voicemail — every unanswered call gets the AI's structured intake instead of a beep. There is no raw audio recording to transcribe after the fact; the AI *is* the intake. Flagging this because it affects the `source` value naming and because it means "voicemail" in the DB/Slack sense should probably read as "missed call," not as a recording — worth confirming that's the intended framing.

## 4. The callback window — must be config, not copy

The 45-minute commitment carries over from the web form for consistency, but per Steven's note it is **not validated with CLIENT_ALPHA_CONTACT** and **must be trivially changeable per client**.

**Existing gap found while reviewing the repo for this spec:** the web form's badge (`app/page.tsx`) currently hardcodes the string `"45-minute callback, with text updates"` directly in JSX — it does not read from `config/client.ts`. That's a pre-existing violation of core principle #3 (config-per-client, logic-shared), not something this build introduces, but this build makes it load-bearing: the same number needs to appear in the AI's spoken greeting, the confirmation SMS, and the web form badge, and it cannot drift between the three.

**Done (2026-08-27):** `callbackWindowMinutes: 45` added to `config/client.ts`, and the web form's hero badge now reads `activeClient.callbackWindowMinutes` instead of a hardcoded string. Still outstanding: once the Vapi assistant and SMS confirmation exist, their greeting/template copy must read this same value rather than hardcoding it again — this fix only covers the one place that existed before this build was scoped.

## 5. Slack message format

Same visual format as Build 1 (§5 of the Build 1 spec), reusing `lib/slack.ts`'s `buildSlackMessage()` unchanged in structure — header line (urgency, job type, postcode), then the labeled field lines added recently (Name, Phone, Email, Postcode, Job type, Urgency, Message), then footer.

**Addition needed:** a way to distinguish this channel from the web form at a glance, per Steven's explicit requirement ("clearly tagged as having come in via missed call... rather than the web form"). Proposed: a `*Source:* Missed call` line in the same labeled-field style as the rest of the body — consistent with the labeling convention just shipped for Build 1, cheap to add, no visual redesign needed. No photo blocks (not applicable to this channel).

## 6. Confirmation SMS

New capability — Build 1 has no SMS sending today. Needs:

- A provider decision (open question, §10 — Twilio is the obvious default since it's already under consideration for the long-term self-built voice path, but that's not yet decided specifically for SMS).
- A new `lib/sms.ts` module following the same pattern as `lib/slack.ts` and every other notification module in this repo: **never throws**, failure is logged for replay and must never surface to the caller or block the DB write (core principle #1 — the log is the source of truth, notifications are not).
- A message template pulling `callbackWindowMinutes` from config (§4) and the fields just captured, so the caller sees a concrete summary of what was taken down — mirrors the acknowledgment-text principle referenced from Build 2 in Steven's note. *(That principle isn't captured anywhere in this repo yet — see §10.)*

## 7. Architecture

```
Caller ──(unanswered)──► Vapi (managed telephony + STT/TTS + call orchestration)
                              │
                              │ webhook (function-call / end-of-call report), HTTPS POST
                              ▼
                    /api/voice-intake  (new route, same repo)
                              │
                              │ 1. validate payload from Vapi
                              │ 2. dedupe check          ── reuses lib/dedupe.ts
                              │ 3. WRITE LOG              ── reuses lib/db.ts, same `enquiries` table
                              │ 4. post to Slack          ── reuses lib/slack.ts + source tag (§5)
                              │ 5. send confirmation SMS  ── new lib/sms.ts
                              │ 6. return 200 to Vapi
                              ▼
                    Same Postgres table, same Slack channel as Build 1
```

**Recommendation: same repo, new route — not a separate service.** Reasoning:

- All the durable-state pieces this build needs already exist and are already channel-agnostic: `insertEnquiry()` takes a plain `source` string, `buildSlackMessage()` is already parameterized by payload not by channel, `config/client.ts` already models config-per-client.
- Vapi is a managed platform — it handles the actual real-time audio (STT, TTS, latency, barge-in) entirely on its own infrastructure. This repo never touches raw audio; it only receives a structured webhook once Vapi has done the hard part. That's a lightweight serverless function, exactly what the existing Vercel deployment already runs for `/api/enquiry`.
- Splitting into a separate service would only start to make sense if/when the self-built Twilio-based path (Steven's longer-term secondary path, §9) needs to host its own real-time audio-handling infrastructure — that's a different shape of workload (long-lived streaming connections) than this Next.js app's request/response functions. Worth revisiting at that point, not now.

## 8. Repository structure — additions

```
app/
  api/
    voice-intake/
      route.ts          # NEW — receives Vapi webhooks
lib/
  sms.ts                 # NEW — confirmation SMS, same never-throws pattern as slack.ts
  vapi.ts                 # NEW — maps Vapi's webhook payload onto EnquiryInput / SlackEnquiryPayload
config/
  client.ts               # ADD callbackWindowMinutes (§4)
```

No changes needed to `db/schema.sql`, `lib/db.ts`, or `lib/dedupe.ts` — all already reusable as-is.

### Environment variables (new)

```
VAPI_API_KEY=
VAPI_WEBHOOK_SECRET=       # for verifying inbound webhook signatures
SMS_PROVIDER_...=          # depends on provider decision, §10
```

None of these exist yet — no Vapi account or SMS provider has been set up (Steven's own next-step #2).

## 9. Vapi vs. self-built — decision

Recorded in full in `docs/decisions/2026-08-27-voice-orchestration-vapi-vs-self-build.md`. Summary: build on Vapi now to get this live and delivering value without delay; build the Twilio-based self-hosted equivalent independently in parallel for long-term ownership, consistent with this engagement's general preference for owned infrastructure over indefinite SaaS subscriptions. Not a blocker for starting — the self-built path is explicitly a parallel, longer-term track, not a prerequisite.

## 10. Open questions — not yet resolved, need Steven's input

1. **Existing-customer and "something else" branches — placeholder behaviour.** Steven's note defers full logic for these, which is fine, but v1 still needs *some* defined behaviour so a call on these branches doesn't silently vanish. Recommend: even the placeholder branches write a minimal log row (at least name + phone + a branch tag) and post a minimal Slack card, so principle #2 ("fail loud only where failure means data loss") holds — a call that isn't a new-job-enquiry shouldn't be a call that leaves no trace at all. This is a recommendation, not a decision — needs your confirmation before it's built this way.
2. **SMS provider.** Not yet chosen. Twilio is the obvious default (also under consideration for the long-term self-built voice path) but that's a separate decision from voice orchestration.
3. **Call recording / transcript retention.** Vapi can typically provide a recording and/or transcript of the call. Steven's note doesn't ask for these to be stored, only for the structured fields extracted from them. Given the "Data handling" stance in the scoping note (customer data beyond what's needed to operate the tool requires specific consent and specific use cases, not default collection), the default here should probably be **don't store the raw recording or full transcript**, only the structured fields — but that's your call to confirm, not mine to assume.
4. **Processor status / data residency.** Build 1's spec already flagged this as unresolved before Build 2 (§12.1 of that spec): whose infrastructure holds customer data, and under what legal basis. This build makes it sharper — live phone numbers and spoken details flowing through Vapi (a third party) before they ever reach our Postgres. Needs resolving before this goes live with a real client, not before it's prototyped on Steven's own line.
5. **Real callback-window number.** 45 minutes (now in `config/client.ts` as `callbackWindowMinutes`) is explicitly a placeholder to test against, not validated with CLIENT_ALPHA_CONTACT.
6. **Cost to CLIENT_ALPHA, if any.** Explicitly deferred in Steven's note, to be addressed separately from the technical build.
7. **The Build 2 "acknowledgment text principle."** Steven's note references a principle "already agreed for build 2, on-site capture" for the confirmation-SMS wording. There is no Build 2 spec or decision doc in this repo yet — `docs/design/INDEX.md` lists Build 2 as "Not written yet." This build's SMS copy (§6) is being scoped without that reference. Flagging rather than guessing at content that hasn't been captured anywhere.

## 11. What has to happen before Claude Code can start building

In order, per Steven's own next-steps list:

1. ~~Confirm repo structure fit~~ — done, this document (§7 gives the recommendation).
2. Vapi account created, phone number provisioned, basic call flow set up for the new-job-enquiry branch (Steven).
3. Greeting and branching script copy written and tested for natural, non-robotic delivery.
4. Then Claude Code can build `/api/voice-intake`, `lib/vapi.ts`, `lib/sms.ts`, and the config addition (§4, §8), against a real Vapi webhook payload rather than a guessed one.

Nothing in this repo needs to change to prepare for step 2 — the config addition in §4 is the only piece that could reasonably be done ahead of Vapi setup.

## 12. What's out of scope for v1 (from Steven's note)

- Routing to specific team members — posts to the single main Slack channel only.
- Full logic for existing-customer and "something else" branches beyond the minimal trace recommended in §10.1.
- Any customer-facing status page or portal.
- Any use of accumulated call data for downstream purposes beyond immediate lead capture.
