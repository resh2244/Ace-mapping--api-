-- Cloudflare D1 Initial Migration Schema
-- Simone & Jovita Maps / Address Registration App

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  name TEXT,
  category TEXT,
  formattedAddress TEXT NOT NULL,
  addressLines TEXT NOT NULL,
  regionCode TEXT,
  lat REAL,
  lng REAL,
  granularity TEXT,
  complete INTEGER DEFAULT 0,
  hasUnconfirmedComponents INTEGER DEFAULT 0,
  verdictSummary TEXT,
  notes TEXT,
  photos TEXT,
  googleSubmissionPayload TEXT,
  meetUri TEXT,
  userId TEXT,
  userEmail TEXT,
  userName TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_created ON submissions(createdAt DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_userId ON submissions(userId);
CREATE INDEX IF NOT EXISTS idx_submissions_region ON submissions(regionCode);
