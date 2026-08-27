# Core design principles

The through-line. These hold across every build in this repo and don't change per-client or per-feature. A design addendum that contradicts one of these is a change to *this* document, not just to a spec — flag it explicitly rather than letting it drift in quietly (see `addenda/README.md`).

1. **The log is the source of truth; notifications are not.** Whatever durable store holds the record of what happened (currently Postgres) must succeed before anything else is allowed to fail silently. A notification channel (Slack, SMS, email) failing must never surface as an error to the customer or block the record from existing.
2. **Fail loud only where failure means data loss.** A step whose failure means "the thing doesn't exist" surfaces an error. A step whose failure means "the thing exists but wasn't announced/enriched" degrades quietly and gets logged for replay.
3. **Config-per-client, logic-shared.** Everything that varies by client (business name, job-type taxonomy, labels, notification channel) lives in one config file per deployment. Application logic never branches on which client it's serving.
4. **Prove each layer before building the next.** Deploy loop first, then the bare endpoint, then validation, then the durable write, then notification, then dedupe, then the UI, then the expensive/optional parts (photos, media). Each step has an explicit verification before the next starts.
5. **Mobile-first, one-handed, bad-light usable.** The people using the capture surfaces are often on a job site, not at a desk. Large tap targets, native controls over custom widgets, visible focus states, no silent waits.
6. **PII pseudonymization until a deployment is real.** See `CLAUDE.md`. Client identity is `CLIENT_ALPHA` / `CLIENT_ALPHA_CONTACT` until Steven confirms a live deployment; non-identifying market context (region, trade) stays real.
7. **Cheap first.** Free-tier infrastructure until a build is proven; a licensing/cost decision (e.g. Vercel Hobby vs Pro) is made explicitly at go-live, not assumed in advance.

## Status

Introduced 2026-08-27, extracted from the Build 1 spec. No amendments yet — see `docs/design/INDEX.md` for the current addendum log.
