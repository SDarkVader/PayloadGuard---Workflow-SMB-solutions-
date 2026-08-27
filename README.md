# PayloadGuard — Workflow SMB Solutions

Workflow automation tooling for small/medium businesses. This repo currently holds **Build 1: Enquiry Capture Pipeline** — start at `docs/design/INDEX.md` for the current spec and design status, and `HANDOVER.md` for build status.

## Stack

- Next.js (App Router) + TypeScript
- Zod for validation
- Postgres (source of truth), Vercel Blob (photos), Slack Incoming Webhook (notification)

## Getting started

```bash
npm install
cp .env.local.example .env.local   # fill in real values, never commit this file
npm run dev
```

## Repository structure

```
app/
  page.tsx             # form page
  layout.tsx
  globals.css
  api/enquiry/route.ts # the endpoint
lib/
  schema.ts            # Zod schema + enums
  db.ts                # Postgres client + insert
  slack.ts             # Slack message + post
  blob.ts              # photo upload
  dedupe.ts            # hash + lookup
components/
  EnquiryForm.tsx
  PhotoInput.tsx
config/
  client.ts            # the only place client-specific values live
docs/
  design/
    INDEX.md           # start here — map of all specs and addenda, always current
    core-principles.md # stable through-line, holds across all builds
    specs/              # canonical, current spec per build (pseudonymized — see CLAUDE.md)
    addenda/             # categorized design deltas — see addenda/README.md for the merge workflow
  decisions/           # engineering decisions log
```

## Working conventions

See `CLAUDE.md` for the full rules this repo is built under. In short: test don't guess, Steven decides, push straight to `main`, docs stay current every commit, no real client PII in the repo (see the PII policy in `CLAUDE.md`).

## Status

See `HANDOVER.md` for what's built, what's next, and how to pick this up.
