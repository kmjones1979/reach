-- Add tags column to shout_agents for searchability
-- Tags are stored as a JSONB array of strings (max 5 tags)

ALTER TABLE shout_agents
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;

-- Create a GIN index for efficient tag searching
CREATE INDEX IF NOT EXISTS idx_shout_agents_tags ON shout_agents USING GIN (tags);

-- Add a check constraint to limit tags to 5
-- Note: This is enforced at the application level, but we add a comment for documentation
COMMENT ON COLUMN shout_agents.tags IS 'Array of up to 5 searchable tags for the agent';

