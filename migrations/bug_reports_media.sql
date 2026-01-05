-- Add media_urls column to bug_reports table
-- Stores array of media file URLs (screenshots/videos)

ALTER TABLE shout_bug_reports 
ADD COLUMN IF NOT EXISTS media_urls JSONB DEFAULT '[]'::jsonb;

-- Add index for media_urls queries (if needed)
CREATE INDEX IF NOT EXISTS idx_bug_reports_media_urls ON shout_bug_reports USING GIN (media_urls);

