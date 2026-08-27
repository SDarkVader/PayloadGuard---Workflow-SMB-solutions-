import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ blobTokenConfigured: false });
  }

  try {
    const blob = await put("debug-check.txt", "diagnostic write", { access: "public" });
    await del(blob.url);
    return NextResponse.json({ blobTokenConfigured: true, writeReadDelete: "ok" });
  } catch (error) {
    return NextResponse.json({
      blobTokenConfigured: true,
      writeReadDelete: "failed",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
