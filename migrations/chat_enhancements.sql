-- Chat Enhancements Migration
-- Run this in your Supabase SQL editor

-- 1. Typing Indicators Table
CREATE TABLE IF NOT EXISTS shout_typing_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    user_address TEXT NOT NULL,
    is_typing BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(conversation_id, user_address)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_typing_conversation ON shout_typing_status(conversation_id);

-- Auto-expire typing status after 5 seconds (function)
CREATE OR REPLACE FUNCTION expire_typing_status()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM shout_typing_status 
    WHERE updated_at < NOW() - INTERVAL '5 seconds';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to clean up old typing status
DROP TRIGGER IF EXISTS typing_cleanup_trigger ON shout_typing_status;
CREATE TRIGGER typing_cleanup_trigger
    AFTER INSERT ON shout_typing_status
    EXECUTE FUNCTION expire_typing_status();

-- Enable realtime for typing
ALTER PUBLICATION supabase_realtime ADD TABLE shout_typing_status;

-- 2. Read Receipts Table
CREATE TABLE IF NOT EXISTS shout_read_receipts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    reader_address TEXT NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, reader_address)
);

CREATE INDEX IF NOT EXISTS idx_read_receipts_conversation ON shout_read_receipts(conversation_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_message ON shout_read_receipts(message_id);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE shout_read_receipts;

-- 3. Message Reactions Table (for all messages, not just pixel art)
CREATE TABLE IF NOT EXISTS shout_message_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    user_address TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_address, emoji)
);

CREATE INDEX IF NOT EXISTS idx_msg_reactions_message ON shout_message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_msg_reactions_conversation ON shout_message_reactions(conversation_id);

-- Enable realtime for message reactions
ALTER PUBLICATION supabase_realtime ADD TABLE shout_message_reactions;

-- 4. Add reply_to support to messages (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'shout_messages') THEN
        ALTER TABLE shout_messages ADD COLUMN IF NOT EXISTS reply_to_id TEXT;
        ALTER TABLE shout_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT false;
        ALTER TABLE shout_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE shout_messages ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Enable realtime for messages (IMPORTANT for unread notifications!)
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shout_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shout_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Table might already be in publication
    NULL;
END $$;

-- 5. Muted Conversations Table
CREATE TABLE IF NOT EXISTS shout_muted_conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_address TEXT NOT NULL,
    conversation_id TEXT NOT NULL,
    muted_until TIMESTAMP WITH TIME ZONE, -- NULL = forever, timestamp = until then
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_address, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_muted_user ON shout_muted_conversations(user_address);

-- 6. Link Previews Cache Table
CREATE TABLE IF NOT EXISTS shout_link_previews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    title TEXT,
    description TEXT,
    image_url TEXT,
    site_name TEXT,
    fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_preview_url ON shout_link_previews(url);

-- RLS Policies
ALTER TABLE shout_typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_read_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_muted_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_link_previews ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (you can tighten these later)
CREATE POLICY "Allow all on typing" ON shout_typing_status FOR ALL USING (true);
CREATE POLICY "Allow all on read_receipts" ON shout_read_receipts FOR ALL USING (true);
CREATE POLICY "Allow all on message_reactions" ON shout_message_reactions FOR ALL USING (true);
CREATE POLICY "Allow all on muted" ON shout_muted_conversations FOR ALL USING (true);
CREATE POLICY "Allow all on link_previews" ON shout_link_previews FOR ALL USING (true);

-- Done!
SELECT 'Chat enhancements migration complete!' as status;

