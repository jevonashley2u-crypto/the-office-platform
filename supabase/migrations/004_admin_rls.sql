-- Enable Row Level Security
ALTER TABLE insight_impacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policies to allow public reads (since this is an admin dashboard demo)
CREATE POLICY "Allow public read access on insight_impacts" ON insight_impacts FOR SELECT USING (true);
CREATE POLICY "Allow public read access on content_calendar" ON content_calendar FOR SELECT USING (true);
CREATE POLICY "Allow public read access on agents" ON agents FOR SELECT USING (true);
