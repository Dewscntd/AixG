-- Performance testing data for FootAnalytics
-- This script creates sample data for performance testing

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create sample teams
INSERT INTO teams (id, name, league, country, created_at) VALUES
  (uuid_generate_v4(), 'Maccabi Tel Aviv', 'Israeli Premier League', 'Israel', NOW()),
  (uuid_generate_v4(), 'Hapoel Beer Sheva', 'Israeli Premier League', 'Israel', NOW()),
  (uuid_generate_v4(), 'Maccabi Haifa', 'Israeli Premier League', 'Israel', NOW()),
  (uuid_generate_v4(), 'Hapoel Tel Aviv', 'Israeli Premier League', 'Israel', NOW()),
  (uuid_generate_v4(), 'Beitar Jerusalem', 'Israeli Premier League', 'Israel', NOW())
ON CONFLICT (name) DO NOTHING;

-- Create sample players (100 players for performance testing)
DO $$
DECLARE
    team_ids UUID[];
    team_id UUID;
    i INTEGER;
BEGIN
    -- Get team IDs
    SELECT ARRAY(SELECT id FROM teams LIMIT 5) INTO team_ids;
    
    -- Create 100 players (20 per team)
    FOR i IN 1..100 LOOP
        team_id := team_ids[((i - 1) % 5) + 1];
        
        INSERT INTO players (id, name, position, jersey_number, team_id, created_at) VALUES
        (
            uuid_generate_v4(),
            'Player ' || i,
            CASE (i % 4)
                WHEN 0 THEN 'Goalkeeper'
                WHEN 1 THEN 'Defender'
                WHEN 2 THEN 'Midfielder'
                ELSE 'Forward'
            END,
            (i % 99) + 1,
            team_id,
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Create sample matches (50 matches for performance testing)
DO $$
DECLARE
    team_ids UUID[];
    home_team_id UUID;
    away_team_id UUID;
    i INTEGER;
BEGIN
    SELECT ARRAY(SELECT id FROM teams LIMIT 5) INTO team_ids;
    
    FOR i IN 1..50 LOOP
        home_team_id := team_ids[((i - 1) % 5) + 1];
        away_team_id := team_ids[(i % 5) + 1];
        
        -- Skip if same team
        IF home_team_id != away_team_id THEN
            INSERT INTO matches (id, home_team_id, away_team_id, match_date, status, created_at) VALUES
            (
                uuid_generate_v4(),
                home_team_id,
                away_team_id,
                NOW() - INTERVAL '1 day' * (i % 30),
                CASE (i % 3)
                    WHEN 0 THEN 'completed'
                    WHEN 1 THEN 'in_progress'
                    ELSE 'scheduled'
                END,
                NOW()
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
END $$;

-- Create sample video files (100 videos for performance testing)
DO $$
DECLARE
    match_ids UUID[];
    match_id UUID;
    i INTEGER;
BEGIN
    SELECT ARRAY(SELECT id FROM matches LIMIT 50) INTO match_ids;
    
    FOR i IN 1..100 LOOP
        match_id := match_ids[((i - 1) % 50) + 1];
        
        INSERT INTO video_files (id, match_id, filename, file_size, duration, status, created_at) VALUES
        (
            uuid_generate_v4(),
            match_id,
            'match_video_' || i || '.mp4',
            1024 * 1024 * 500 + (i * 1024 * 1024), -- 500MB + i MB
            3600 + (i * 60), -- 1 hour + i minutes
            CASE (i % 4)
                WHEN 0 THEN 'uploaded'
                WHEN 1 THEN 'processing'
                WHEN 2 THEN 'completed'
                ELSE 'failed'
            END,
            NOW()
        )
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Create performance testing indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_date ON matches(match_date);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_video_files_status ON video_files(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_players_team_id ON players(team_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_match_id ON analytics_results(match_id);

-- Update table statistics
ANALYZE teams;
ANALYZE players;
ANALYZE matches;
ANALYZE video_files;
