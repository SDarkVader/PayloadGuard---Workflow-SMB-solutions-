import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/schema";
import { insertEnquiry } from "@/lib/db";
import { postToSlack } from "@/lib/slack";
import { computeDedupeHash, findExistingEnquiryId } from "@/lib/dedupe";
import { uploadPhoto } from "@/lib/blob";

const MAX_PHOTOS = 4;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

function textField(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  return typeof value === "string" && value !== "" ? value : undefined;
}

export async function POST(request: NextRequest) {
  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json(
      { ok: false, errors: { form: ["Could not read submission"] } },
      { status: 400 },
    );
  }

  // Honeypot: a hidden field real users never fill. Bots must not learn they
  // were caught, so this looks identical to a real success response.
  if (textField(formData, "company_website")) {
    return NextResponse.json({ ok: true });
  }

  const result = enquirySchema.safeParse({
    name: textField(formData, "name"),
    phone: textField(formData, "phone"),
    email: textField(formData, "email"),
    postcode: textField(formData, "postcode"),
    job_type: textField(formData, "job_type"),
    urgency: textField(formData, "urgency"),
    message: textField(formData, "message"),
  });
  if (!result.success) {
    return NextResponse.json(
      { ok: false, errors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data = result.data;

  const photoFiles = formData.getAll("photos").filter(
    (entry): entry is File => entry instanceof File && entry.size > 0,
  );
  if (photoFiles.length > MAX_PHOTOS) {
    return NextResponse.json(
      { ok: false, errors: { photos: [`Maximum ${MAX_PHOTOS} photos`] } },
      { status: 400 },
    );
  }
  if (photoFiles.some((file) => file.size > MAX_PHOTO_BYTES)) {
    return NextResponse.json(
      { ok: false, errors: { photos: ["Each photo must be under 10MB"] } },
      { status: 400 },
    );
  }

  const dedupeHash = computeDedupeHash(data.phone, data.message, new Date());

  let inserted;
  const photoUrls: string[] = [];
  try {
    const existingId = await findExistingEnquiryId(dedupeHash);
    if (existingId) {
      return NextResponse.json({ ok: true, id: existingId });
    }

    // A lost photo must not lose the lead — upload failures are logged and
    // skipped, never allowed to fail the whole enquiry.
    for (const file of photoFiles) {
      try {
        const { url } = await uploadPhoto(file);
        photoUrls.push(url);
      } catch (error) {
        console.error(
          `Photo upload failed: ${error instanceof Error ? error.message : "unknown error"}`,
        );
      }
    }

    inserted = await insertEnquiry({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      postcode: data.postcode,
      jobType: data.job_type,
      urgency: data.urgency,
      message: data.message,
      photoUrls,
      source: "web_form",
      dedupeHash,
    });

    // Slack is a notification, not the source of truth — a delivery failure
    // here must never surface to the caller. The record is already saved.
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
      photoUrls,
    });
    if (!slackResult.ok) {
      console.error(`Slack delivery failed for enquiry ${inserted.id}: ${slackResult.error}`);
    }
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save enquiry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id, photoCount: photoUrls.length });
}
