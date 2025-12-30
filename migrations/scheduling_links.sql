-- Scheduling Links Migration
-- Adds support for both paid and unpaid scheduling links with custom slugs
-- Run this in your Supabase SQL Editor

-- Add scheduling link columns to user settings
ALTER TABLE shout_user_settings 
ADD COLUMN IF NOT EXISTS scheduling_slug TEXT UNIQUE,  -- Custom URL slug (e.g., 'alice' -> /schedule/alice)
ADD COLUMN IF NOT EXISTS scheduling_free_enabled BOOLEAN DEFAULT true,  -- Enable free scheduling option
ADD COLUMN IF NOT EXISTS scheduling_paid_enabled BOOLEAN DEFAULT false,  -- Enable paid scheduling option
ADD COLUMN IF NOT EXISTS scheduling_bio TEXT,  -- Short bio for scheduling page
ADD COLUMN IF NOT EXISTS scheduling_title TEXT,  -- Display title (e.g., 'Book a call with Alice')
ADD COLUMN IF NOT EXISTS scheduling_free_duration_minutes INTEGER DEFAULT 15,  -- Duration for free calls
ADD COLUMN IF NOT EXISTS scheduling_paid_duration_minutes INTEGER DEFAULT 30;  -- Duration for paid calls

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_scheduling_slug 
ON shout_user_settings (scheduling_slug) 
WHERE scheduling_slug IS NOT NULL;

-- Add invite tracking to scheduled calls
ALTER TABLE shout_scheduled_calls
ADD COLUMN IF NOT EXISTS invite_token TEXT UNIQUE,  -- Unique token for join link
ADD COLUMN IF NOT EXISTS invite_sent_at TIMESTAMPTZ,  -- When invite email was sent
ADD COLUMN IF NOT EXISTS invite_opened_at TIMESTAMPTZ,  -- When invite was opened
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false,  -- Whether this is a paid call
ADD COLUMN IF NOT EXISTS scheduler_email TEXT,  -- Email of the person who scheduled
ADD COLUMN IF NOT EXISTS scheduler_name TEXT,  -- Name of the person who scheduled
ADD COLUMN IF NOT EXISTS notes TEXT;  -- Optional notes from scheduler

-- Create index for invite token lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_calls_invite_token 
ON shout_scheduled_calls (invite_token) 
WHERE invite_token IS NOT NULL;

-- Function to generate unique invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
    RETURN encode(gen_random_bytes(16), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate invite token on insert
CREATE OR REPLACE FUNCTION set_invite_token()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invite_token IS NULL THEN
        NEW.invite_token := generate_invite_token();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_invite_token ON shout_scheduled_calls;
CREATE TRIGGER trigger_set_invite_token
BEFORE INSERT ON shout_scheduled_calls
FOR EACH ROW
EXECUTE FUNCTION set_invite_token();

-- Comments
COMMENT ON COLUMN shout_user_settings.scheduling_slug IS 'Custom URL slug for scheduling page (e.g., alice -> /schedule/alice)';
COMMENT ON COLUMN shout_user_settings.scheduling_free_enabled IS 'Whether free scheduling option is available';
COMMENT ON COLUMN shout_user_settings.scheduling_paid_enabled IS 'Whether paid scheduling option is available';
COMMENT ON COLUMN shout_user_settings.scheduling_bio IS 'Short bio displayed on scheduling page';
COMMENT ON COLUMN shout_user_settings.scheduling_title IS 'Custom title for scheduling page';
COMMENT ON COLUMN shout_scheduled_calls.invite_token IS 'Unique token for joining the scheduled call';
COMMENT ON COLUMN shout_scheduled_calls.is_paid IS 'Whether this call requires/required payment';

