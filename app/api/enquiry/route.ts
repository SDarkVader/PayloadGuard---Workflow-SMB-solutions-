import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/schema";
import { insertEnquiry } from "@/lib/db";

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

  let inserted;
  try {
    inserted = await insertEnquiry({
      name: data.name,
      phone: data.phone,
      email: data.email || undefined,
      postcode: data.postcode,
      jobType: data.job_type,
      urgency: data.urgency,
      message: data.message,
      source: "web_form",
    });
  } catch {
    return NextResponse.json({ ok: false, error: "Failed to save enquiry" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: inserted.id });
}
