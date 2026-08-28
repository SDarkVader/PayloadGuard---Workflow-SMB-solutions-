# Voice orchestration: Vapi short-term, self-built long-term

**Context:** Build 4 (missed call & voicemail AI intake — see `docs/design/specs/build-4-missed-call-voicemail-intake.md`) needs real-time telephony, speech-to-text, text-to-speech, and interrupt/barge-in handling so an AI phone answer feels like a continuous, attended conversation rather than a stilted IVR.

## Options considered

1. **Vapi** — managed voice agent orchestration. Handles telephony, STT, TTS, and latency/interrupt tuning as one layer. Usage-based, no subscription. Vapi's own platform fee is roughly 5¢/minute, but that only covers orchestration — stacking a speech-to-text provider, an LLM, and voice/telephony costs on top lands total realistic cost around 30¢/minute, per current published 2026 estimates. No seat fees; concurrency beyond the base included lines costs extra per additional concurrent line.
2. **Self-built** — Twilio for raw call handling and audio streaming, our own choice of STT provider, our own LLM calls for branching logic, our own TTS for the reply, our own webhooks out to Slack and SMS. Architecturally achievable — the branching conversation logic is the easy part. The genuinely hard part is real-time audio latency tuning and barge-in handling so the exchange feels natural; that's real infrastructure work to replicate from scratch, not a wrapper around an API.

## Decision

**Use Vapi now, to get Build 4 live and delivering value to CLIENT_ALPHA_CONTACT without delay. Build the self-built Twilio-based equivalent independently in parallel, for long-term ownership and to avoid open-ended per-minute/subscription costs.**

This is consistent with the general preference across this engagement to build and own infrastructure rather than stack SaaS subscriptions indefinitely (see `docs/design/core-principles.md` §7, cheap first) — but the self-built path only pays off once it exists and is proven, and the latency/barge-in problem Vapi solves is genuinely hard. Shipping on Vapi first means CLIENT_ALPHA_CONTACT gets a working system while the owned alternative is built without blocking on it.

## Not yet decided (tracked as open questions in the Build 4 spec, §10)

- Realistic monthly cost depends on CLIENT_ALPHA's actual missed-call volume — not yet estimated, so actual monthly spend under Vapi is unknown.
- Whether/how much of that cost passes through to CLIENT_ALPHA — explicitly deferred, to be addressed separately from the technical build.
- Timeline for the self-built path — "once version one is live and stable," no date attached.

## Cost and hosting ownership

Hosting/build cost (Vercel, the repo itself) is borne by Steven, not passed to CLIENT_ALPHA as a subscription — consistent with Build 1. Per-minute usage costs (Vapi, telephony, SMS) are a genuine variable cost that scales with call volume and sit outside that — a real cost needing a volume estimate before it can be sized.
