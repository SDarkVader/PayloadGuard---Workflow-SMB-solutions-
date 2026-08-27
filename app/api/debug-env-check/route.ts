import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

export async function GET() {
  try {
    const blob = await put("debug-check.txt", "diagnostic write", { access: "public" });
    await del(blob.url);
    return NextResponse.json({ writeReadDelete: "ok", url: blob.url });
  } catch (error) {
    return NextResponse.json({
      writeReadDelete: "failed",
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
