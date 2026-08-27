import { createHash } from "crypto";
import { neon } from "@neondatabase/serverless";

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

function truncateToHour(date: Date): string {
  const truncated = new Date(date);
  truncated.setUTCMinutes(0, 0, 0);
  return truncated.toISOString();
}

export function computeDedupeHash(phone: string, message: string | undefined, at: Date): string {
  const input = `${phone}|${message ?? ""}|${truncateToHour(at)}`;
  return createHash("sha256").update(input).digest("hex");
}

export async function findExistingEnquiryId(hash: string): Promise<string | null> {
  const sql = getSql();
  const rows = await sql`SELECT id FROM enquiries WHERE dedupe_hash = ${hash} LIMIT 1`;
  return rows.length > 0 ? (rows[0].id as string) : null;
}
