import { NextRequest, NextResponse } from "next/server";
import { activeClient } from "@/config/client";
import { insertEnquiry } from "@/lib/db";
import { postToSlack } from "@/lib/slack";
import { computeDedupeHash, findExistingEnquiryId } from "@/lib/dedupe";
import { sendConfirmationSms } from "@/lib/sms";
import {
  extractFields,
  fetchStructuredOutputs,
  isExpectedAssistant,
  mapTimeframeToUrgency,
  verifyVapiSignature,
  type VapiWebhookMessage,
} from "@/lib/vapi";

/**
 * Logs one collected general-enquiry call: dedupe check, DB write
 * (source: "call"), Slack post (tagged "Phone call"), confirmation SMS.
 * Never throws — a bad/incomplete call must not crash the webhook handler.
 */
async function logVoiceEnquiry(fields: {
  name: string;
  phone: string;
  postcode?: string;
  description?: string;
  timeframe?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const urgency = mapTimeframeToUrgency(fields.timeframe);
  const description = [fields.description, fields.timeframe ? `Timeframe given: ${fields.timeframe}` : null]
    .filter(Boolean)
    .join("\n\n");

  const dedupeHash = computeDedupeHash(fields.phone, description || undefined, new Date());

  try {
    const existingId = await findExistingEnquiryId(dedupeHash);
    if (existingId) return { ok: true };

    const inserted = await insertEnquiry({
      name: fields.name,
      phone: fields.phone,
      postcode: fields.postcode,
      jobType: "other",
      urgency,
      message: description || undefined,
      source: "call",
      dedupeHash,
    });

    const slackResult = await postToSlack({
      id: inserted.id,
      createdAt: inserted.createdAt,
      name: fields.name,
      phone: fields.phone,
      postcode: fields.postcode,
      jobType: "other",
      urgency,
      message: description || undefined,
      channel: "Phone call",
    });
    if (!slackResult.ok) {
      console.error(`Slack delivery failed for voice enquiry ${inserted.id}: ${slackResult.error}`);
    }

    const smsResult = await sendConfirmationSms({
      phone: fields.phone,
      name: fields.name,
      jobTypeLabel: activeClient.jobTypes.other,
      callbackWindowMinutes: activeClient.callbackWindowMinutes,
    });
    if (!smsResult.ok) {
      console.error(`Confirmation SMS failed for voice enquiry ${inserted.id}: ${smsResult.error}`);
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(`Voice intake failed to save enquiry: ${message}`);
    return { ok: false, error: message };
  }
}

/**
 * Receives Vapi's webhook for the general-enquiries call branch. Handles
 * two possible mechanisms (see lib/vapi.ts for why both exist):
 *
 * - "end-of-call-report" — fires once after the call ends. The fields
 *   themselves come from Vapi's Structured Outputs, computed
 *   asynchronously and fetched via a follow-up API call
 *   (fetchStructuredOutputs) rather than read off this payload directly —
 *   confirmed necessary via a real test call (2026-08-28).
 * - "tool-calls" — fires mid-call if a Tool is added later; blocks on the
 *   response, which is fed back to the assistant.
 *
 * Source-tagged "call" so it's clearly distinct from the web form in both
 * Postgres and Slack. Emergency-branch calls are a separate route/assistant,
 * not handled here (see docs/design/specs/build-4-missed-call-voicemail-intake.md).
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const signatureValid = verifyVapiSignature(
    rawBody,
    request.headers.get("x-vapi-signature"),
    request.headers.get("x-vapi-timestamp"),
  );
  if (!signatureValid) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: VapiWebhookMessage;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const message = payload.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  if (!isExpectedAssistant(message.call?.assistantId)) {
    return NextResponse.json({ error: "unexpected assistant" }, { status: 403 });
  }

  if (message.type === "end-of-call-report") {
    const callId = message.call?.id;
    const structuredData = callId ? await fetchStructuredOutputs(callId) : null;
    const fields = structuredData ? extractFields(structuredData) : null;

    if (!fields) {
      // No structured data (call ended before all fields were collected,
      // Structured Outputs weren't ready within the retry budget, or
      // VAPI_API_KEY isn't set) — nothing to log.
      console.error(`Voice intake: no structured data for call ${callId ?? "unknown"}`);
      return NextResponse.json({ ok: true });
    }

    const phone = fields.phone || message.call?.customer?.number || "";
    if (!phone) {
      return NextResponse.json({ ok: true });
    }

    await logVoiceEnquiry({ ...fields, phone });
    return NextResponse.json({ ok: true });
  }

  if (message.type === "tool-calls" && message.toolCallList) {
    const callerNumber = message.call?.customer?.number;
    const results = [];

    for (const toolCall of message.toolCallList) {
      const fields = extractFields(toolCall.parameters);

      if (!fields) {
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: "Missing name or phone number — please ask the caller for both before finishing.",
        });
        continue;
      }

      const phone = fields.phone || callerNumber || "";
      if (!phone) {
        results.push({
          toolCallId: toolCall.id,
          name: toolCall.name,
          result: "No phone number available — please confirm a callback number with the caller.",
        });
        continue;
      }

      const logged = await logVoiceEnquiry({ ...fields, phone });
      results.push({
        toolCallId: toolCall.id,
        name: toolCall.name,
        result: logged.ok
          ? `Logged. Let the caller know someone will call them back within ${activeClient.callbackWindowMinutes} minutes.`
          : "Something went wrong logging this — apologise and let the caller know we'll still get their number from the call record.",
      });
    }

    return NextResponse.json({ results });
  }

  // Any other message type (status-update, transcript, etc.) — acknowledge without processing.
  return NextResponse.json({ ok: true });
}
