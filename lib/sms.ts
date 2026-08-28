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
 * Not wired to a real provider yet — no SMS_PROVIDER/Twilio credentials
 * exist. Same never-throws pattern as postToSlack: a failure or missing
 * config here must never fail the enquiry, since the DB write and Slack
 * post are what actually matter. See docs/design/specs/
 * build-4-missed-call-voicemail-intake.md §10.2 for the open provider
 * decision.
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
          To: payload.phone,
          From: fromNumber,
          Body: buildConfirmationText(payload),
        }),
      },
    );

    if (!response.ok) {
      return { ok: false, error: `Twilio responded ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}
