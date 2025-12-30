-- Add scheduling capability to agents
-- This allows agents to help users schedule meetings with the agent owner

ALTER TABLE shout_agents
ADD COLUMN IF NOT EXISTS scheduling_enabled BOOLEAN DEFAULT false;

COMMENT ON COLUMN shout_agents.scheduling_enabled IS 'Enable scheduling tool - allows agent to help users book meetings with the owner';

