import { activeClient, type JobType, type Urgency } from "@/config/client";

export interface SlackEnquiryPayload {
  id: string;
  createdAt: Date;
  name: string;
  phone: string;
  email?: string;
  postcode?: string;
  jobType: JobType;
  urgency: Urgency;
  message?: string;
}

function buildSlackMessage(payload: SlackEnquiryPayload) {
  const urgencyLabel = activeClient.urgencyLabels[payload.urgency];
  const jobTypeLabel = activeClient.jobTypes[payload.jobType];
  const headerLine = [urgencyLabel.toUpperCase(), jobTypeLabel, payload.postcode]
    .filter(Boolean)
    .join(" · ");

  const bodyLines = [`*${payload.name}*`, `<tel:${payload.phone}|${payload.phone}>`];
  if (payload.email) bodyLines.push(payload.email);
  if (payload.message) bodyLines.push(payload.message);

  const footer = `Enquiry ${payload.id} · ${payload.createdAt.toISOString()}`;

  return {
    text: headerLine,
    blocks: [
      { type: "header", text: { type: "plain_text", text: headerLine } },
      { type: "section", text: { type: "mrkdwn", text: bodyLines.join("\n") } },
      { type: "context", elements: [{ type: "mrkdwn", text: footer }] },
    ],
  };
}

/**
 * Never throws — a Slack delivery failure must not surface to the caller.
 * The caller logs { ok: false } for replay rather than letting it escape.
 */
export async function postToSlack(
  payload: SlackEnquiryPayload,
): Promise<{ ok: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, error: "SLACK_WEBHOOK_URL not set" };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSlackMessage(payload)),
    });

    if (!response.ok) {
      return { ok: false, error: `Slack responded ${response.status}` };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "unknown error" };
  }
}
