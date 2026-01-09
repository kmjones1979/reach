-- Channel Chat Enhancements Migration
-- Adds reply support and reactions to public channels

-- 1. Add reply_to support to channel messages
ALTER TABLE shout_channel_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES shout_channel_messages(id) ON DELETE SET NULL;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_channel_messages_reply_to ON shout_channel_messages(reply_to_id);

-- 2. Channel Message Reactions Table
CREATE TABLE IF NOT EXISTS shout_channel_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES shout_channel_messages(id) ON DELETE CASCADE,
    channel_id UUID NOT NULL REFERENCES shout_public_channels(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_address, emoji)
);

-- Indexes for channel reactions
CREATE INDEX IF NOT EXISTS idx_channel_reactions_message ON shout_channel_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_channel_reactions_channel ON shout_channel_reactions(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_reactions_user ON shout_channel_reactions(user_address);

-- Enable RLS
ALTER TABLE shout_channel_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for channel reactions
CREATE POLICY "Anyone can view channel reactions" 
ON shout_channel_reactions FOR SELECT USING (true);

CREATE POLICY "Members can add reactions" 
ON shout_channel_reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove their own reactions" 
ON shout_channel_reactions FOR DELETE USING (true);

-- Enable realtime for channel reactions
ALTER PUBLICATION supabase_realtime ADD TABLE shout_channel_reactions;

-- Enable realtime for channel messages (for real-time updates)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'shout_channel_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE shout_channel_messages;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

SELECT 'Channel chat enhancements migration complete!' as status;
