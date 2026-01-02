-- Permanent Rooms Migration
-- Adds support for permanent meeting rooms tied to wallet addresses

-- Add permanent_room_id to shout_users table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shout_users' 
        AND column_name = 'permanent_room_id'
    ) THEN
        ALTER TABLE shout_users ADD COLUMN permanent_room_id TEXT;
    END IF;
END $$;

-- Create index for permanent room lookups
CREATE INDEX IF NOT EXISTS idx_users_permanent_room ON shout_users(permanent_room_id) WHERE permanent_room_id IS NOT NULL;

-- Function to get or create permanent room for a user
CREATE OR REPLACE FUNCTION get_or_create_permanent_room(p_wallet_address TEXT)
RETURNS TEXT AS $$
DECLARE
    v_room_id TEXT;
    v_existing_room_id TEXT;
BEGIN
    -- Check if user already has a permanent room
    SELECT permanent_room_id INTO v_existing_room_id
    FROM shout_users
    WHERE wallet_address = LOWER(p_wallet_address)
    AND permanent_room_id IS NOT NULL;

    IF v_existing_room_id IS NOT NULL THEN
        -- Verify the room still exists and is active
        IF EXISTS (
            SELECT 1 FROM shout_instant_rooms 
            WHERE room_id = v_existing_room_id 
            AND status = 'active'
        ) THEN
            RETURN v_existing_room_id;
        END IF;
    END IF;

    -- Room doesn't exist or is inactive, will be created by API
    -- Return NULL to signal API should create new room
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_or_create_permanent_room IS 'Gets existing permanent room ID for a user, or returns NULL if one needs to be created';

