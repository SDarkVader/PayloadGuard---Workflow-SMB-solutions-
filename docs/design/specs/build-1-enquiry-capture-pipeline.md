# Enquiry Capture Pipeline — Build 1 Specification

> Pseudonymized copy. `CLIENT_ALPHA` = the pilot client's business, `CLIENT_ALPHA_CONTACT` = the primary contact. Region (Aberdeen) and trade (roofing) are kept real — they are the confirmed first target market, not identifying details. See `CLAUDE.md` for the PII policy.

**Purpose:** A contact form that captures structured enquiries with photos, logs them durably, and pushes them to Slack as an actionable card.

**Deployment order:** Build on Steven's own site first. Prove it in production for a week. Then deploy the same codebase for CLIENT_ALPHA with a different config file.

**Status:** Not yet built. This document is the brief for Claude Code.

## 1. Why this build, first

The voicemail pipeline is the bigger win for CLIENT_ALPHA_CONTACT. It is not the right first build.

This one requires no telephony, no Twilio number verification, no audio handling, and no customer data on infrastructure whose legal status is still unresolved. It can be built and deployed in an evening. Once it runs on Steven's own site with a week of real logs behind it, it stops being a demo and becomes a working system he already relies on — which is the difference between a carrot and a promise.

Build two (on-site capture with voice notes) reuses this same endpoint pattern, same log, same Slack card. Nothing here is throwaway.

## 2. Architecture

```
Browser form
    │
    │ POST (multipart/form-data)
    ▼
/api/enquiry ────────────► Blob storage (photos)
    │                              │
    │ 1. validate                 │ returns URLs
    │ 2. dedupe check             │
    │ 3. WRITE LOG ◄──────────────┘
    │ 4. post to Slack
    │ 5. return 200
    ▼
Postgres (source of truth)
    │
    └──► Slack channel (notification)
```

**The log is the source of truth. Slack is a notification.** This ordering is not stylistic — it is the entire accountability claim. If Slack is down, the enquiry still exists and can be replayed. If the log write fails, the request fails. Get this the right way round.

## 3. Data schema

### Enquiry record

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid | yes | Generated server-side |
| `created_at` | timestamptz | yes | Server clock, not client |
| `name` | text | yes | |
| `phone` | text | yes | Normalised to E.164 where possible |
| `email` | text | no | Optional — see §3.1 |
| `postcode` | text | no | Uppercased, whitespace normalised |
| `job_type` | enum | yes | Fixed list, see below |
| `urgency` | enum | yes | `urgent` / `this_week` / `quote_only` |
| `message` | text | no | Free text, max 2000 chars |
| `photo_urls` | text[] | no | Max 4 |
| `status` | enum | yes | Defaults to `new` |
| `source` | text | yes | `web_form` (build 2 will use `site_capture`) |

### Job types (CLIENT_ALPHA — roofing, Aberdeen)

| Value | Label |
|---|---|
| `roof_repair` | Roof repair |
| `roof_replacement` | New roof / replacement |
| `flat_roof` | Flat roof and felt |
| `gutters_roofline` | Gutters, fascias and soffits |
| `pointing_chimney` | Pointing and chimney work |
| `exterior_painting` | Exterior painting |
| `other` | Something else |

Derived from CLIENT_ALPHA's published service list, which runs to thirty-plus entries for SEO purposes. Those are keywords, not workflow. These seven are the day-to-day work and map onto how a job is actually triaged and priced.

Store the machine value, display the label. Keep the mapping in one config object so it can be swapped per client without touching logic.

### 3.1 On making email optional

CLIENT_ALPHA's current form marks name, phone and email as required. That is a leak. Someone standing in the rain looking at slipped slates has a phone number to hand and no patience for typing an email address. Phone required, email optional, is strictly better for conversion — and it is a concrete, defensible improvement to show CLIENT_ALPHA_CONTACT rather than an assertion that the new form is nicer.

## 4. Endpoint behaviour

`POST /api/enquiry` — accepts `multipart/form-data`.

Execute in this order. The order matters.

1. **Honeypot check.** A hidden field (suggest `company_website`) that is invisible to humans via CSS. If populated, return `200` with a success body and write nothing. Bots must not learn they were caught.
2. **Validate.** Required fields present, `job_type` and `urgency` are members of their enums, `message` within length, at most 4 photos, each under 10MB after client-side compression. On failure return `400` with a field-level error object.
3. **Dedupe.** Hash of `phone + message + truncate(now, 'hour')`. If a matching hash exists, return `200` with the existing enquiry id. Prevents double-taps and refresh resubmits creating duplicate jobs.
4. **Upload photos.** To blob storage. Collect the returned URLs. If an upload fails, continue without it and note the failure in the record — a lost photo must not lose the lead.
5. **Write the log.** Insert the full record into Postgres. **If this fails, return `500`.** This is the only step whose failure is allowed to surface to the customer, because it is the only step whose failure means the enquiry does not exist.
6. **Post to Slack.** See §5.
7. **Return `200`** with the enquiry id.

### Critical: Slack failure must not surface

If step 6 fails, still return `200`. The record is saved. The customer must never see an error for a delivery problem that belongs to us, not to them. Log the Slack failure separately for replay.

Wrap step 6 so that a thrown exception cannot escape into the response path.

## 5. Slack message format

One message per enquiry. Optimised for being read on a phone lock screen, one-handed, possibly on a roof.

- **Header line:** urgency, job type, postcode — e.g. `URGENT · Roof repair · AB16`. This is what appears in the notification preview, so it carries the triage information.
- **Body:** name, phone as a `tel:` link (tap to call, no copy-paste), email if given, free text.
- **Photos:** attached as image blocks so they render inline. CLIENT_ALPHA_CONTACT should see the slates, not read about them.
- **Footer:** enquiry id and timestamp.

Use Incoming Webhooks, not the full Bot API. No OAuth flow, no scopes, no app review. Create the app, enable Incoming Webhooks, add to the channel, copy the URL into an environment variable.

## 6. Photo upload

Requirements:

- `<input type="file" accept="image/*" multiple>` — on mobile this offers the camera directly, so a customer can photograph the roof there and then rather than hunting through a gallery. That is the whole point.
- Maximum 4 photos.
- **Compress client-side before upload.** Modern phone photos are enormous and Vercel Hobby functions have a short execution timeout. Resize longest edge to ~1600px, JPEG quality ~0.8. This typically cuts a 5MB photo to under 400KB with no meaningful loss for assessing roof damage.
- Show upload progress. A silent 20-second wait reads as a broken form.

## 7. Front-end

A single page. Design brief:

The subject is a roofing contractor in Aberdeen — granite, slate, weather. Not a SaaS landing page. Whatever visual direction is chosen, the form itself must be the hero, not buried below marketing copy, because the form *is* the product.

Non-negotiables regardless of aesthetic:

- Works on a phone in bad light, one-handed, outdoors.
- Large tap targets. Job type and urgency as tappable buttons or a native select, not a custom dropdown that fights the OS.
- Visible keyboard focus states.
- Submit button reads `Send enquiry`, and the success state reads `Enquiry sent` — same verb through the flow.
- Success state confirms what was captured: job type, postcode, number of photos received. That is what makes it read as *recorded* rather than *submitted into a void*.
- Errors say what to fix, in plain words, next to the field.

## 8. Repository structure

```
├── app/
│   ├── page.tsx              # The form page
│   ├── layout.tsx
│   ├── globals.css
│   └── api/
│       └── enquiry/
│           └── route.ts      # THE ENDPOINT
├── lib/
│   ├── schema.ts              # Zod schema + enums + job type config
│   ├── db.ts                  # Postgres client and insert
│   ├── slack.ts                # Message construction and post
│   ├── blob.ts                 # Photo upload
│   └── dedupe.ts               # Hash and lookup
├── components/
│   ├── EnquiryForm.tsx
│   └── PhotoInput.tsx          # Compression happens here
├── config/
│   └── client.ts               # Per-client: job types, business name, Slack channel
├── .env.local.example
└── README.md
```

On `config/client.ts`: every client-specific value lives here and nowhere else. Job type list, business name, urgency labels. Deploying for a second client should mean editing one file and setting new environment variables. If client-specific strings leak into `route.ts` or the components, that has gone wrong.

### Environment variables

```
DATABASE_URL=
SLACK_WEBHOOK_URL=
BLOB_READ_WRITE_TOKEN=
```

Never in code. Set in the Vercel dashboard. `.env.local.example` documents the names with empty values and is committed; `.env.local` holds the real values and is git-ignored.

## 9. Build order for Claude Code

Follow this sequence. Do not skip ahead — each step proves one thing, and a failure at step 4 is trivially diagnosed if steps 1 through 3 already passed.

**Step 1 — Deploy an empty app.** Scaffold Next.js with TypeScript and the App Router. Push to GitHub. Connect to Vercel. Confirm a live HTTPS URL serving the default page. Write no logic yet. The deploy loop is what bites people, not the code.

**Step 2 — Prove the Slack webhook standalone.** Create the Slack app, enable Incoming Webhooks, add to a test channel. Confirm with curl before writing any application code:

```
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"pipeline test"}' \
  $SLACK_WEBHOOK_URL
```

**Step 3 — Endpoint returns 200.** Create `/api/enquiry` that accepts a POST and returns `{"ok": true}`. No validation, no logging, no Slack. Deploy. Prove it:

```
curl -X POST https://<yourdomain>/api/enquiry \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"07700900000","job_type":"roof_repair","urgency":"urgent","message":"Slates off after the wind"}'
```

**Step 4 — Add validation.** Zod schema. Confirm a bad payload returns `400` with useful errors and a good one still returns `200`.

**Step 5 — Add the log.** Provision Postgres, create the table, insert on every valid request. Confirm rows appear. Confirm a DB failure returns `500`.

**Step 6 — Add Slack.** Post after the log write. Confirm the message renders correctly on a phone. Confirm that a deliberately broken webhook URL still returns `200` to the caller.

**Step 7 — Add dedupe.** Confirm two identical rapid submissions produce one row.

**Step 8 — Build the form.** Only now. The endpoint is already proven, so any failure at this point is definitively front-end.

**Step 9 — Add photos.** Client-side compression, blob upload, inline rendering in Slack. Last because it is the most complex and the least essential to the core loop.

## 10. Verification checklist

Before showing this to anyone:

- [ ] Valid submission returns 200 and appears in Slack within 5 seconds
- [ ] Valid submission appears in Postgres
- [ ] Missing phone returns 400 with a field-level error
- [ ] Broken Slack webhook: caller still gets 200, row still written
- [ ] Broken database: caller gets 500
- [ ] Duplicate submission within the hour produces one row
- [ ] Honeypot submission returns 200 and writes nothing
- [ ] Four photos upload and render inline in Slack
- [ ] Fifth photo is rejected with a clear message
- [ ] Form is usable one-handed on a phone
- [ ] Success state names what was captured
- [ ] No secrets in the repository

## 11. Costs

| Item | Cost |
|---|---|
| Vercel Hobby | £0 |
| GitHub | £0 |
| Vercel Postgres (free tier) | £0 |
| Vercel Blob (free tier) | £0 |
| Domain | ~£10–15/year |
| Slack free tier (testing) | £0 |
| Slack Pro, 3 seats (production) | ~$22/month |

Under £5 this week. Slack Pro becomes necessary at go-live because the free tier only keeps 90 days of searchable history, which is fatal to the audit-trail-for-the-accountant argument — a spring job would be invisible by autumn.

**Note on Vercel Hobby:** it is licensed for non-commercial use. Steven's own site and a demo are fine. Hosting CLIENT_ALPHA's live business system on a paid engagement is Pro territory. That is a decision for go-live, not now.

## 12. Open questions — not blockers for build 1

1. **Processor status.** Once photos and (in build 2) voice notes flow, whose infrastructure holds customer data? Two routes: accept processor status under UK GDPR and write the DPA, or shift the pipeline into CLIENT_ALPHA's own accounts so the data never leaves their estate. Must be settled before build 2.
2. **Response window.** The SMS acknowledgment in build 2 needs a specific commitment — "before 10am tomorrow", not "as soon as possible". Requires CLIENT_ALPHA_CONTACT's honest worst case, not their best.
3. **CLIENT_ALPHA's substrate.** Call volume, time-of-day distribution, who currently picks up, where the existing form's submissions actually go. These numbers decide whether this is worth £20/month or £200/month to them. That is a conversation, not a build.

## 13. What comes next

**Build 2 — On-site capture.** A page the crew opens on a phone: photos, hold-to-record voice note, three urgency buttons, send. Audio transcribed, structured against the schema, lands in Slack as the same card. Plus SMS acknowledgment to the customer. Same endpoint pattern, same log, same Slack format.

**Build 3 — Scheduled reminders.** Reads Google Calendar, emails the customer two days before the job, posts a heads-up to Slack. Depends on CLIENT_ALPHA_CONTACT actually logging jobs in a calendar in a readable format — and ideally the calendar entry is created *by* the pipeline on job confirmation, so they maintain nothing and the structure falls out of normal work.

**Deferred.** Customer-facing status page. Genuinely useful, considerably larger, and not required to prove the core loop.
