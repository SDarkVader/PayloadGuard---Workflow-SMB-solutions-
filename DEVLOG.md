# Devlog

Append-only. Newest entry at the top. Never edit or delete past entries — if something turns out to be wrong, add a new entry correcting it.

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
