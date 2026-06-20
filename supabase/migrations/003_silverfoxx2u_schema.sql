-- ========== AGENTS TABLE ==========
CREATE TABLE agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_name VARCHAR(255),
  division VARCHAR(50),
  artist_name VARCHAR(100) DEFAULT 'silverfoxx2u',
  role VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active',
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== MUSIC METRICS ==========
CREATE TABLE music_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES agents(id),
  platform VARCHAR(50),
  song_title VARCHAR(255),
  artist_name VARCHAR(100) DEFAULT 'silverfoxx2u',
  streams INTEGER,
  listeners INTEGER,
  saves INTEGER,
  playlist_adds INTEGER,
  shares INTEGER,
  engagement_rate FLOAT,
  revenue FLOAT,
  date DATE,
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- ========== CONTENT CALENDAR ==========
CREATE TABLE content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform VARCHAR(50),
  content_type VARCHAR(100),
  description TEXT,
  scheduled_date DATE,
  scheduled_time TIME,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== EMAIL SUBSCRIBERS ==========
CREATE TABLE email_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE,
  subscriber_name VARCHAR(100),
  fan_tier VARCHAR(20) DEFAULT 'tier_1',
  lifetime_streams INTEGER DEFAULT 0,
  email_open_rate FLOAT,
  last_email_interaction TIMESTAMP,
  patreon_interested BOOLEAN DEFAULT FALSE,
  merch_interested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== PLAYLIST OPPORTUNITIES ==========
CREATE TABLE playlist_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_name VARCHAR(255),
  platform VARCHAR(50),
  curator_name VARCHAR(100),
  followers INTEGER,
  fit_score FLOAT,
  song_recommended VARCHAR(255),
  pitch_sent BOOLEAN DEFAULT FALSE,
  response_received BOOLEAN DEFAULT FALSE,
  added BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== INSIGHT TRACKING ==========
CREATE TABLE insight_impacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent VARCHAR(100),
  insight_extracted TEXT,
  build_catalyst_application TEXT,
  implementation_status VARCHAR(20),
  expected_impact FLOAT,
  actual_impact FLOAT,
  date_extracted DATE,
  date_implemented TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== TRAINING LOGS ==========
CREATE TABLE training_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_agent_id UUID REFERENCES agents(id),
  to_agent_id UUID REFERENCES agents(id),
  training_topic VARCHAR(255),
  effectiveness_score FLOAT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ========== INDEXES ==========
CREATE INDEX idx_music_metrics_date ON music_metrics(date);
CREATE INDEX idx_music_metrics_platform ON music_metrics(platform);
CREATE INDEX idx_email_subscribers_tier ON email_subscribers(fan_tier);
CREATE INDEX idx_playlist_opportunities_status ON playlist_opportunities(pitch_sent);
CREATE INDEX idx_insight_impacts_status ON insight_impacts(implementation_status);
CREATE INDEX idx_content_calendar_date ON content_calendar(scheduled_date);
