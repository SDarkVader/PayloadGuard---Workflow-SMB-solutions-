# Handover

Current-state snapshot. This file is overwritten each phase (unlike `DEVLOG.md`, which is append-only history). Read this first to pick the work back up cold.

**Last updated:** 2026-08-27 (Phase 0)

## Where we are

Repo structure and docs are in place. No application logic has been written and nothing has been deployed yet. This matches Step 1 of the build order in `docs/design/specs/build-1-enquiry-capture-pipeline.md`, which explicitly says "write no logic yet."

Design docs now live under `docs/design/` (index, core principles, canonical specs, categorized addenda) rather than a flat `docs/specs/` — see `docs/design/INDEX.md`.

## What exists

- Next.js 15 + TypeScript + App Router, bare scaffold, default page only.
- Directory structure per the spec, with unimplemented `lib/`/`components/` files marked as one-line stubs naming the build step that fills them in. `app/api/enquiry/route.ts` is **not** created yet — Next.js requires route files to be valid modules, so a placeholder comment fails the build; it gets created for real at Step 3.
- `config/client.ts` has a real, pseudonymized starter config (`CLIENT_ALPHA`, Aberdeen, roofing job types).
- Docs: `CLAUDE.md` (rules), `README.md` (overview), `DEVLOG.md` (history), this file, and the pseudonymized spec under `docs/specs/`.

## What's next (Step 1, unverified)

1. `npm install`, confirm the app builds and runs locally.
2. Push to GitHub `main`.
3. Connect the repo to Vercel, confirm a live HTTPS URL serving the default page.
4. Report back with the live URL before touching any logic — Step 1 is deploy-loop proof, nothing else.

Steps 2–9 (Slack webhook proof, bare endpoint, validation, DB log, Slack post, dedupe, form, photos) are not started. Each one gets its own phase and its own verification before the next starts — see the build order in the spec.

## Open questions (not blockers, tracked from the spec §12)

- Processor status / GDPR posture for photo (and later voice note) data — must be settled before Build 2, not Build 1.
- SMS response-window commitment for Build 2 — needs Steven's honest worst case.
- CLIENT_ALPHA's actual call volume / substrate — a conversation with the client, not a build task.

## Decisions made so far

- Push directly to `main`, no feature-branch hoarding.
- PII pseudonymization: `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT`, real mapping kept outside this repo. Region and trade are real (Aberdeen, roofing — confirmed first target market).
- Work proceeds in phases matching the spec's build order; each phase's outcome is verified and reviewed with Steven before the next starts.
