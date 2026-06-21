-- Create video queue table for Agents 7 and 8
CREATE TABLE video_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  concept TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  raw_file_path TEXT NOT NULL,
  rendered_file_path TEXT,
  status TEXT DEFAULT 'pending_render', -- pending_render, ready_to_post, posted, failed
  ai_metadata JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_post_time TIMESTAMPTZ,
  platforms JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE video_queue ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for now (can lock down later for production)
CREATE POLICY "Allow public all on video_queue" ON video_queue FOR ALL USING (true);

-- Create Storage Buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('raw_footage', 'raw_footage', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('rendered_shorts', 'rendered_shorts', true);

-- Enable storage RLS
CREATE POLICY "Allow public read rendered" ON storage.objects FOR SELECT USING (bucket_id = 'rendered_shorts');
CREATE POLICY "Allow service role all raw" ON storage.objects FOR ALL USING (bucket_id = 'raw_footage');
CREATE POLICY "Allow service role all rendered" ON storage.objects FOR ALL USING (bucket_id = 'rendered_shorts');
