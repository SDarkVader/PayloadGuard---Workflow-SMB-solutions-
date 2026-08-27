CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  phone text NOT NULL,
  email text,
  postcode text,
  job_type text NOT NULL,
  urgency text NOT NULL,
  message text,
  photo_urls text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'new',
  source text NOT NULL,
  dedupe_hash text
);

ALTER TABLE enquiries ADD COLUMN IF NOT EXISTS dedupe_hash text;

CREATE INDEX IF NOT EXISTS idx_enquiries_dedupe_hash ON enquiries (dedupe_hash);
