import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    blobTokenConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
  });
}
