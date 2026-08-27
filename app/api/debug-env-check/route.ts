import { NextResponse } from "next/server";

const CANDIDATE_VARS = [
  "DATABASE_URL",
  "DATABASE_URL_UNPOOLED",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_HOST",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DATABASE",
  "NEON_DATABASE_URL",
  "SLACK_WEBHOOK_URL",
];

export async function GET() {
  const present = Object.fromEntries(
    CANDIDATE_VARS.map((key) => [key, Boolean(process.env[key])]),
  );
  return NextResponse.json({ present });
}
