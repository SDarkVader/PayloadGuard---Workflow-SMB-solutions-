# Devlog

Append-only. Newest entry at the top. Never edit or delete past entries — if something turns out to be wrong, add a new entry correcting it.

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
