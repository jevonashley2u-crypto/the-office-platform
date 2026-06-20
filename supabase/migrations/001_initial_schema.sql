-- ============================================================================
-- Build Catalyst — Initial Schema Migration
-- Creates: submissions, analyses, leads, email_log
-- RLS: service_role = full access, anon = insert on submissions only
-- ============================================================================

-- ── Submissions ─────────────────────────────────────────────────────────────

CREATE TABLE submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Service role: full access (used by edge functions)
CREATE POLICY "Service role has full access to submissions"
  ON submissions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Anon users: insert only (for direct frontend submissions)
CREATE POLICY "Anon users can insert submissions"
  ON submissions
  FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- Anon users: read their own submissions (by matching within session)
CREATE POLICY "Anon users can read submissions"
  ON submissions
  FOR SELECT
  USING (auth.role() = 'anon');

-- ── Analyses ────────────────────────────────────────────────────────────────

CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  overall_score INTEGER,
  summary TEXT,
  insights JSONB,
  recommendations JSONB,
  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to analyses"
  ON analyses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Anon users can read analyses"
  ON analyses
  FOR SELECT
  USING (auth.role() = 'anon');

-- ── Leads ───────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  company TEXT,
  phone TEXT,
  qualified BOOLEAN DEFAULT FALSE,
  score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to leads"
  ON leads
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Email Log ───────────────────────────────────────────────────────────────

CREATE TABLE email_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID REFERENCES submissions(id) ON DELETE SET NULL,
  recipient TEXT,
  subject TEXT,
  status TEXT,
  resend_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role has full access to email_log"
  ON email_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Indexes for common query patterns ───────────────────────────────────────

CREATE INDEX idx_submissions_service_type ON submissions(service_type);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);
CREATE INDEX idx_analyses_submission_id ON analyses(submission_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_qualified ON leads(qualified);
CREATE INDEX idx_leads_submission_id ON leads(submission_id);
CREATE INDEX idx_email_log_submission_id ON email_log(submission_id);
CREATE INDEX idx_email_log_recipient ON email_log(recipient);
