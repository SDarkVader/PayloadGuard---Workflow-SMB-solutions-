import { NextResponse } from "next/server";

export async function GET() {
  const matchingKeys = Object.keys(process.env).filter((key) =>
    /blob|token/i.test(key),
  );
  return NextResponse.json({ matchingKeys });
}
