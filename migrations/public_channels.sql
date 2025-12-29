-- Public Channels System
-- Allows users to browse and join public group chats

-- Public Channels Table
CREATE TABLE IF NOT EXISTS shout_public_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    emoji TEXT DEFAULT '💬',
    category TEXT DEFAULT 'general',
    creator_address TEXT, -- NULL for system-created channels
    is_official BOOLEAN DEFAULT false, -- Official Spritz channels
    member_count INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Channel Members Table
CREATE TABLE IF NOT EXISTS shout_channel_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES shout_public_channels(id) ON DELETE CASCADE,
    user_address TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notifications_muted BOOLEAN DEFAULT false,
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(channel_id, user_address)
);

-- Channel Messages Table (public, unencrypted)
CREATE TABLE IF NOT EXISTS shout_channel_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES shout_public_channels(id) ON DELETE CASCADE,
    sender_address TEXT NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_members_user ON shout_channel_members(user_address);
CREATE INDEX IF NOT EXISTS idx_channel_members_channel ON shout_channel_members(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_channel ON shout_channel_messages(channel_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_created ON shout_channel_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_channels_category ON shout_public_channels(category);

-- Enable RLS
ALTER TABLE shout_public_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shout_channel_messages ENABLE ROW LEVEL SECURITY;

-- Policies for public channels
CREATE POLICY "Anyone can view public channels"
ON shout_public_channels FOR SELECT USING (true);

CREATE POLICY "Users can create channels"
ON shout_public_channels FOR INSERT WITH CHECK (true);

CREATE POLICY "Creators can update their channels"
ON shout_public_channels FOR UPDATE USING (true);

-- Policies for channel members
CREATE POLICY "Anyone can view channel members"
ON shout_channel_members FOR SELECT USING (true);

CREATE POLICY "Users can join channels"
ON shout_channel_members FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can leave channels"
ON shout_channel_members FOR DELETE USING (true);

CREATE POLICY "Users can update their membership"
ON shout_channel_members FOR UPDATE USING (true);

-- Policies for channel messages
CREATE POLICY "Anyone can view channel messages"
ON shout_channel_messages FOR SELECT USING (true);

CREATE POLICY "Members can send messages"
ON shout_channel_messages FOR INSERT WITH CHECK (true);

-- Function to increment member count
CREATE OR REPLACE FUNCTION increment_channel_members(channel_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE shout_public_channels 
    SET member_count = member_count + 1, updated_at = NOW()
    WHERE id = channel_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement member count
CREATE OR REPLACE FUNCTION decrement_channel_members(channel_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE shout_public_channels 
    SET member_count = GREATEST(0, member_count - 1), updated_at = NOW()
    WHERE id = channel_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to increment message count
CREATE OR REPLACE FUNCTION increment_channel_messages(channel_uuid UUID)
RETURNS void AS $$
BEGIN
    UPDATE shout_public_channels 
    SET message_count = message_count + 1, updated_at = NOW()
    WHERE id = channel_uuid;
END;
$$ LANGUAGE plpgsql;

-- Insert default official channels
INSERT INTO shout_public_channels (name, description, emoji, category, is_official) VALUES
    ('Ethereum', 'Discuss Ethereum, smart contracts, and the EVM ecosystem', '⟠', 'crypto', true),
    ('Solana', 'Talk about Solana, high-speed transactions, and the Solana ecosystem', '◎', 'crypto', true),
    ('Crypto', 'General cryptocurrency discussions and news', '₿', 'crypto', true),
    ('DeFi', 'Decentralized finance protocols, yield farming, and liquidity', '🏦', 'crypto', true),
    ('Privacy', 'Privacy tech, zero-knowledge proofs, and anonymous systems', '🔒', 'tech', true),
    ('Security', 'Cybersecurity, smart contract audits, and best practices', '🛡️', 'tech', true),
    ('Technology', 'General tech discussions, programming, and development', '💻', 'tech', true),
    ('AI', 'Artificial intelligence, machine learning, and AI agents', '🤖', 'tech', true),
    ('DeSci', 'Decentralized science, open research, and scientific DAOs', '🔬', 'science', true),
    ('Finance', 'Traditional finance, markets, and economics', '📈', 'finance', true),
    ('Sports', 'Sports discussions, fantasy leagues, and game predictions', '⚽', 'lifestyle', true),
    ('Education', 'Learning resources, tutorials, and educational content', '📚', 'lifestyle', true),
    ('Movies', 'Film discussions, reviews, and recommendations', '🎬', 'entertainment', true),
    ('Music', 'Music discussions, playlists, and artist discoveries', '🎵', 'entertainment', true),
    ('Events', 'Conferences, meetups, and community events', '📅', 'community', true),
    ('Coffee', 'Casual conversations and daily chats over virtual coffee', '☕', 'community', true)
ON CONFLICT (name) DO NOTHING;

