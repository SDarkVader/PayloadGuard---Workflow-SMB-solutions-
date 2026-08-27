import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    slackWebhookConfigured: Boolean(process.env.SLACK_WEBHOOK_URL),
  });
}
