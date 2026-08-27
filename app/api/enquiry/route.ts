import { NextRequest, NextResponse } from "next/server";
import { enquirySchema } from "@/lib/schema";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const result = enquirySchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { ok: false, errors: result.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true });
}
