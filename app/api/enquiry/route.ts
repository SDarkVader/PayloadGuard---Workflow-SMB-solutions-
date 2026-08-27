import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/schema";
import { insertEnquiry } from "@/lib/db";
import { postToSlack } from "@/lib/slack";
import { computeDedupeHash, findExistingEnquiryId } from "@/lib/dedupe";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const result = enquirySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { ok: false, errors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;
  const dedupeHash = computeDedupeHash(data.phone, data.message, new Date());

  let inserted;
  try {
    const existingId = await findExistingEnquiryId(dedupeHash);
    if (existingId) {
      return NextResponse.json({ ok: true, id: existingId });
    }

    inserted = await insertEnquiry({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      postcode: data.postcode,
      jobType: data.job_type,
      urgency: data.urgency,
      message: data.message,
      source: "web_form",
      dedupeHash,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save enquiry" }, { status: 500 });
  }

  // Slack is a notification, not the source of truth — a delivery failure here
  // must never surface to the caller. The record is already saved.
  const slackResult = await postToSlack({
    id: inserted.id,
    createdAt: inserted.createdAt,
    name: data.name,
    phone: data.phone,
    email: data.email || undefined,
    postcode: data.postcode,
    jobType: data.job_type,
    urgency: data.urgency,
    message: data.message,
  });
  if (!slackResult.ok) {
    console.error(`Slack delivery failed for enquiry ${inserted.id}: ${slackResult.error}`);
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
