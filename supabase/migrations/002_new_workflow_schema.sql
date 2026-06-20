-- audits table
CREATE TABLE audits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  annual_revenue TEXT NOT NULL,
  team_size TEXT NOT NULL,
  pain_points TEXT NOT NULL,
  email TEXT NOT NULL,
  report JSONB NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- update leads table schema by replacing it
DROP TABLE IF EXISTS leads;

CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  business_name TEXT NOT NULL,
  industry TEXT NOT NULL,
  best_opportunity TEXT NOT NULL,
  contacted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audits" ON audits
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Service role can manage leads" ON leads
  FOR ALL USING (true) WITH CHECK (true);
