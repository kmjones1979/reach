-- Add public_bio column to shout_user_settings
-- This stores the user's public profile bio (max 280 characters)

ALTER TABLE shout_user_settings
ADD COLUMN IF NOT EXISTS public_bio TEXT DEFAULT NULL;

-- Add a check constraint to limit bio length
ALTER TABLE shout_user_settings
ADD CONSTRAINT public_bio_length_check CHECK (char_length(public_bio) <= 280);

-- Comment on the column
COMMENT ON COLUMN shout_user_settings.public_bio IS 'User bio displayed on public profile page (max 280 chars)';
