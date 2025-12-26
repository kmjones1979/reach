-- Favorite Agents Migration
-- Allow users to save/favorite discovered agents for quick access

CREATE TABLE IF NOT EXISTS shout_agent_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    agent_id UUID NOT NULL REFERENCES shout_agents(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Each user can only favorite an agent once
    CONSTRAINT unique_favorite UNIQUE (user_address, agent_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorites_user ON shout_agent_favorites(user_address);
CREATE INDEX IF NOT EXISTS idx_favorites_agent ON shout_agent_favorites(agent_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON shout_agent_favorites(created_at DESC);

-- Enable RLS
ALTER TABLE shout_agent_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own favorites" ON shout_agent_favorites;
CREATE POLICY "Users can manage own favorites" ON shout_agent_favorites
    FOR ALL USING (true);

