-- Alpha Chat Enhancements Migration
-- Adds reply support and reactions to the global Spritz chat

-- 1. Add reply_to support to alpha messages
ALTER TABLE shout_alpha_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES shout_alpha_messages(id) ON DELETE SET NULL;

-- Index for reply lookups
CREATE INDEX IF NOT EXISTS idx_alpha_messages_reply_to ON shout_alpha_messages(reply_to_id);

-- 2. Alpha Message Reactions Table
CREATE TABLE IF NOT EXISTS shout_alpha_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES shout_alpha_messages(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    emoji TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(message_id, user_address, emoji)
);

-- Indexes for alpha reactions
CREATE INDEX IF NOT EXISTS idx_alpha_reactions_message ON shout_alpha_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_alpha_reactions_user ON shout_alpha_reactions(user_address);

-- Enable RLS
ALTER TABLE shout_alpha_reactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alpha reactions
CREATE POLICY "Anyone can view alpha reactions" 
ON shout_alpha_reactions FOR SELECT USING (true);

CREATE POLICY "Members can add reactions" 
ON shout_alpha_reactions FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can remove their own reactions" 
ON shout_alpha_reactions FOR DELETE USING (true);

-- Enable realtime for alpha reactions
ALTER PUBLICATION supabase_realtime ADD TABLE shout_alpha_reactions;

SELECT 'Alpha chat enhancements migration complete!' as status;
