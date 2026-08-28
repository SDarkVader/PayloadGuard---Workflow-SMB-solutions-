import { createHmac, timingSafeEqual } from "crypto";
import type { Urgency } from "@/config/client";

/**
 * Vapi's webhook message shapes, per docs.vapi.ai/server-url/events.
 * Two mechanisms can deliver the fields the assistant collected:
 *
 * - "tool-calls": fires mid-call if the assistant has a custom Tool
 *   attached. Not currently configured on the assistant — supported here
 *   for if/when one is added.
 * - "end-of-call-report": fires once after the call ends, but does NOT
 *   itself carry the extracted fields. The assistant here uses Vapi's
 *   "Structured Outputs" feature (confirmed directly in the dashboard —
 *   a distinct, newer mechanism from the older analysisPlan.structuredDataSchema
 *   this code originally assumed), which computes results via a separate
 *   LLM call *after* the report fires and is never included in the
 *   webhook payload — Vapi's own docs confirm this. It has to be fetched
 *   via `GET /call/{id}` afterward — see fetchStructuredOutputs() below.
 *
 * Parameter/schema key names (name/phone/postcode/description/timeframe)
 * matched what the assistant actually sent on a real test call
 * (2026-08-28) — name, phone, postcode, description confirmed; timeframe
 * not yet asked by the assistant.
 */
export interface VapiWebhookMessage {
  message: {
    type: string;
    call?: {
      id?: string;
      assistantId?: string;
      customer?: { number?: string };
    };
    toolCallList?: Array<{
      id: string;
      name: string;
      parameters: Record<string, unknown>;
    }>;
  };
}

/**
 * Structured Outputs are computed asynchronously after end-of-call-report
 * fires, so this polls Vapi's Call API with a few retries rather than a
 * single fixed wait. Returns the first output's parsed result, or null if
 * none is ready within the retry budget, VAPI_API_KEY isn't set, or the
 * call has no structured outputs attached.
 */
export async function fetchStructuredOutputs(
  callId: string,
  { retries = 3, delayMs = 4000 }: { retries?: number; delayMs?: number } = {},
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) return null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    const response = await fetch(`https://api.vapi.ai/call/${callId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) continue;

    const data = (await response.json()) as {
      artifact?: { structuredOutputs?: Record<string, { name?: string; result?: unknown }> };
    };
    const outputs = data.artifact?.structuredOutputs;
    if (!outputs) continue;

    const entries = Object.values(outputs);
    if (entries.length === 0) continue;

    const raw = entries[0].result;
    if (typeof raw === "string") {
      try {
        return JSON.parse(raw);
      } catch {
        continue;
      }
    }
    if (raw && typeof raw === "object") {
      return raw as Record<string, unknown>;
    }
  }

  return null;
}

export interface VoiceIntakeFields {
  name: string;
  phone: string;
  postcode?: string;
  description?: string;
  timeframe?: string;
}

function stringField(params: Record<string, unknown>, key: string): string | undefined {
  const value = params[key];
  return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
}

/**
 * Extracts the fields we care about from one tool call's parameters.
 * Returns null if required fields (name, phone) are missing — the caller
 * should ask Vapi's assistant to collect them rather than logging a
 * half-complete enquiry.
 */
export function extractFields(parameters: Record<string, unknown>): VoiceIntakeFields | null {
  const name = stringField(parameters, "name");
  const phone = stringField(parameters, "phone");
  if (!name || !phone) return null;

  return {
    name,
    phone,
    postcode: stringField(parameters, "postcode"),
    description: stringField(parameters, "description"),
    timeframe: stringField(parameters, "timeframe"),
  };
}

const URGENT_KEYWORDS = [
  "today",
  "asap",
  "as soon as possible",
  "immediate",
  "urgent",
  "emergency",
  "right away",
  "days not weeks",
  "high priority",
];

const QUOTE_ONLY_KEYWORDS = [
  "month",
  "no rush",
  "whenever",
  "not urgent",
  "just a quote",
  "quote only",
  "flexible",
];

/**
 * First-pass heuristic mapping the caller's own words about timing onto the
 * existing 3-value urgency enum shared with the web form. Deliberately
 * simple — Steven is still iterating on the assistant's actual question
 * wording, so this should be revisited once real call transcripts exist
 * rather than tuned against guesses now. Defaults to "this_week" when no
 * timeframe was captured or nothing matches, as the safe middle ground
 * (never silently downgrades to quote_only, never silently escalates to
 * urgent).
 */
export function mapTimeframeToUrgency(timeframe: string | undefined): Urgency {
  if (!timeframe) return "this_week";
  const lower = timeframe.toLowerCase();
  if (URGENT_KEYWORDS.some((k) => lower.includes(k))) return "urgent";
  if (QUOTE_ONLY_KEYWORDS.some((k) => lower.includes(k))) return "quote_only";
  return "this_week";
}

/**
 * Verifies Vapi's HMAC-SHA256 webhook signature (x-vapi-signature header,
 * signing `${timestamp}.${rawBody}` with the shared secret — Vapi's default
 * payload format). Returns true (skips verification) when VAPI_WEBHOOK_SECRET
 * isn't configured yet, so this endpoint works before that's set up; set the
 * secret in the Vapi dashboard's server config once ready and this starts
 * enforcing it.
 */
export function verifyVapiSignature(
  rawBody: string,
  signatureHeader: string | null,
  timestampHeader: string | null,
): boolean {
  const secret = process.env.VAPI_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signatureHeader || !timestampHeader) return false;

  const expected = createHmac("sha256", secret)
    .update(`${timestampHeader}.${rawBody}`)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expected, "hex");
    const actualBuf = Buffer.from(signatureHeader, "hex");
    return expectedBuf.length === actualBuf.length && timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Lightweight sanity check independent of the HMAC secret above — confirms
 * the call came from the expected assistant. Not a security boundary on its
 * own (assistantId isn't secret), but catches misconfiguration and stray
 * requests cheaply. Skipped (returns true) if VAPI_ASSISTANT_ID isn't set.
 */
export function isExpectedAssistant(assistantId: string | undefined): boolean {
  const expected = process.env.VAPI_ASSISTANT_ID;
  if (!expected) return true;
  return assistantId === expected;
}
