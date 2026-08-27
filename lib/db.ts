import { randomUUID } from "crypto";
import { neon } from "@neondatabase/serverless";

function getSql() {
  return neon(process.env.DATABASE_URL!);
}

export interface EnquiryInput {
  name: string;
  phone: string;
  email?: string;
  postcode?: string;
  jobType: string;
  urgency: string;
  message?: string;
  photoUrls?: string[];
  source: string;
  dedupeHash: string;
}

export interface InsertedEnquiry {
  id: string;
  createdAt: Date;
}

export async function insertEnquiry(input: EnquiryInput): Promise<InsertedEnquiry> {
  const id = randomUUID();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO enquiries (id, name, phone, email, postcode, job_type, urgency, message, photo_urls, source, dedupe_hash)
    VALUES (${id}, ${input.name}, ${input.phone}, ${input.email ?? null}, ${input.postcode ?? null},
            ${input.jobType}, ${input.urgency}, ${input.message ?? null}, ${input.photoUrls ?? []}, ${input.source}, ${input.dedupeHash})
    RETURNING id, created_at
  `;
  return { id: rows[0].id as string, createdAt: new Date(rows[0].created_at as string) };
}
