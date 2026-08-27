# CLAUDE.md

> **Assumption is the mother of all fuck ups.**

If something is unclear, unverified, or not explicitly confirmed — stop and check. Do not guess and proceed as if it were fact. Test claims, don't assume them.

## What this is

PayloadGuard is Steven's organization. This repo currently holds **Build 1: Enquiry Capture Pipeline** — a contact form that captures structured enquiries with photos, logs them durably to Postgres, and pushes them to Slack as an actionable card. Full spec: `docs/design/specs/build-1-enquiry-capture-pipeline.md`. Start any design/spec question at `docs/design/INDEX.md`.

Deployment order per the spec: build and prove on Steven's own site first, then redeploy the same codebase for the first paying client by editing `config/client.ts` and setting new environment variables. Nothing client-specific belongs anywhere else in the code.

This repo will eventually move under the PayloadGuard GitHub organization.

## PII policy — hard rule, no exceptions

Client and contact identities are **not confirmed as real production deployments yet**. Until a client relationship is live and Steven says otherwise:

- No real client business name, contact name, phone number, email, or other identifying detail is ever committed to this repo — not in code, not in docs, not in commit messages, not in comments.
- Use the pseudonym `CLIENT_ALPHA` for the business and `CLIENT_ALPHA_CONTACT` for the primary contact. The real mapping is kept by Steven, outside this repo.
- Geographic/market data that isn't personally identifying (region, trade, job-type taxonomy) is fine to keep real — it's product context, not an identity. Currently: region = Aberdeen, trade = roofing. This is the confirmed first target market.
- If you're unsure whether something counts as PII, treat it as PII. Ask rather than guess — see the rule at the top of this file.

## Workflow

- **Steven is the decision maker.** Test and verify, present findings, let him decide. Don't make judgment calls on his behalf on anything non-trivial.
- **Test, don't guess.** Every phase in the build order ends with a verification step (curl, a screenshot, a log entry) before moving on. If something can't be verified in this environment, say so explicitly rather than claiming it works.
- **Push directly to `main`.** No long-lived feature branches, no branch hoarding. Commit and push as work completes.
- **Work in phases.** Follow the build order in the spec (Step 1 → Step 9). Each phase is reviewed with Steven before the next one starts.
- **Docs stay current, no exceptions.** Every commit that changes behavior or structure updates `README.md` and `HANDOVER.md` in the same commit — even for minor changes. `DEVLOG.md` gets an entry for every phase/session, append-only, never rewritten.
- **Design changes go through the addenda workflow, not ad hoc doc edits.** A design change is a dated, categorized file under `docs/design/addenda/<category>/`, registered in `docs/design/INDEX.md` immediately, then merged into the relevant canonical spec once accepted. Never let specs go stale while addenda pile up unmerged — see `docs/design/addenda/README.md`.

## Where things are

- `docs/design/INDEX.md` — the map. Read this first for anything design-related.
- `docs/design/core-principles.md` — the stable through-line, holds across all builds.
- `docs/design/specs/` — canonical, current spec per build (pseudonymized).
- `docs/design/addenda/` — categorized deltas to specs; see its `README.md` for the merge workflow.
- `docs/decisions/` — engineering/technical decisions made along the way and why (open questions from the spec land here once resolved).
- `DEVLOG.md` — append-only chronological log of what was done, when, and why.
- `HANDOVER.md` — current-state snapshot: what's built, what's next, how to pick this up cold.
- `config/client.ts` — the only place client-specific values live.
