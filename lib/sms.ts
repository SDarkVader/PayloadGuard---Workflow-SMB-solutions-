export interface SmsConfirmationPayload {
  phone: string;
  name: string;
  jobTypeLabel: string;
  callbackWindowMinutes: number;
}

function buildConfirmationText(payload: SmsConfirmationPayload): string {
  return `Thanks ${payload.name}, this is CLIENT_ALPHA. We've got your ${payload.jobTypeLabel.toLowerCase()} enquiry and will call you back within ${payload.callbackWindowMinutes} minutes.`;
}

/**
 * Twilio's API requires E.164 ("+44...") for the To field, but phone
 * numbers arrive from the caller (spoken, transcribed) or the web form in
 * whatever format they were given — commonly UK local format ("07...").
 * Only reformats; never fabricates missing digits, so a mistranscribed
 * number (too short/long) still fails at Twilio, which is correct — this
 * just stops well-formed local numbers from failing on format alone.
 */
export function toE164(rawPhone: string): string {
  const digitsOnly = rawPhone.replace(/[^\d+]/g, "");
  if (digitsOnly.startsWith("+")) return digitsOnly;
  if (digitsOnly.startsWith("0")) return `+44${digitsOnly.slice(1)}`;
  return digitsOnly;
}

/**
 * Same never-throws pattern as postToSlack: a failure or missing config
 * here must never fail the enquiry, since the DB write and Slack post are
 * what actually matter.
 */
export async function sendConfirmationSms(
  payload: SmsConfirmationPayload,
): Promise<{ ok: boolean; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return { ok: false, error: "SMS provider not configured" };
  }

  try {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toE164(payload.phone),
          From: fromNumber,
          Body: buildConfirmationText(payload),
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return { ok: false, error: `Twilio responded ${response.status}: ${body}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}
