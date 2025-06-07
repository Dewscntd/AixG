-- Create videos table for Video Ingestion Service
-- This table stores video metadata and upload information

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS videos (
    -- Primary identifiers
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    upload_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Upload metadata
    filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL CHECK (file_size > 0),
    uploaded_by VARCHAR(255) NOT NULL,
    match_id UUID,
    team_id UUID,
    tags TEXT[] DEFAULT '{}',
    
    -- Video status and progress
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADING' 
        CHECK (status IN ('UPLOADING', 'UPLOADED', 'VALIDATING', 'VALIDATED', 'PROCESSING', 'PROCESSED', 'FAILED')),
    upload_progress INTEGER NOT NULL DEFAULT 0 CHECK (upload_progress >= 0 AND upload_progress <= 100),
    
    -- Validation results
    validation_errors TEXT[] DEFAULT '{}',
    validation_warnings TEXT[] DEFAULT '{}',
    
    -- Storage information
    storage_key VARCHAR(1000),
    storage_bucket VARCHAR(255),
    storage_url TEXT,
    storage_etag VARCHAR(255),
    
    -- Video metadata (extracted after upload)
    video_duration INTEGER, -- in seconds
    video_width INTEGER,
    video_height INTEGER,
    video_frame_rate DECIMAL(5,2),
    video_bitrate BIGINT,
    video_codec VARCHAR(50),
    video_format VARCHAR(50),
    video_checksum VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_videos_upload_id ON videos(upload_id);
CREATE INDEX idx_videos_status ON videos(status);
CREATE INDEX idx_videos_uploaded_by ON videos(uploaded_by);
CREATE INDEX idx_videos_match_id ON videos(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX idx_videos_team_id ON videos(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX idx_videos_created_at ON videos(created_at);
CREATE INDEX idx_videos_tags ON videos USING GIN(tags);

-- Create partial indexes for common queries
CREATE INDEX idx_videos_uploading ON videos(created_at) WHERE status = 'UPLOADING';
CREATE INDEX idx_videos_processing ON videos(created_at) WHERE status IN ('VALIDATING', 'PROCESSING');

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE videos IS 'Stores video upload and processing information for the Video Ingestion Service';
COMMENT ON COLUMN videos.id IS 'Unique identifier for the video entity';
COMMENT ON COLUMN videos.upload_id IS 'Unique identifier for the upload session';
COMMENT ON COLUMN videos.status IS 'Current processing status of the video';
COMMENT ON COLUMN videos.upload_progress IS 'Upload progress percentage (0-100)';
COMMENT ON COLUMN videos.validation_errors IS 'Array of validation error messages';
COMMENT ON COLUMN videos.validation_warnings IS 'Array of validation warning messages';
COMMENT ON COLUMN videos.storage_key IS 'Object key in the storage service (S3)';
COMMENT ON COLUMN videos.video_duration IS 'Video duration in seconds';
COMMENT ON COLUMN videos.tags IS 'Array of tags associated with the video';

-- Create a view for video statistics
CREATE OR REPLACE VIEW video_stats AS
SELECT 
    status,
    COUNT(*) as count,
    AVG(file_size) as avg_file_size,
    AVG(video_duration) as avg_duration,
    MIN(created_at) as oldest_upload,
    MAX(created_at) as newest_upload
FROM videos 
GROUP BY status;

COMMENT ON VIEW video_stats IS 'Aggregated statistics about video uploads by status';

-- Grant permissions (adjust as needed for your environment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON videos TO video_ingestion_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO video_ingestion_service;
