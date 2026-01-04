-- Bug Reports Table
-- Stores user-submitted bug reports

CREATE TABLE IF NOT EXISTS shout_bug_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_address TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Agents', 'Friends', 'Calls', 'Chats', 'Rooms', 'Livestream', 'Settings', 'Configuration', 'Other')),
    description TEXT NOT NULL,
    replication_steps TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
    admin_notes TEXT,
    resolved_by TEXT,
    resolved_at TIMESTAMPTZ,
    github_issue_url TEXT,
    github_issue_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_bug_reports_user_address ON shout_bug_reports(user_address);
CREATE INDEX IF NOT EXISTS idx_bug_reports_category ON shout_bug_reports(category);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON shout_bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at ON shout_bug_reports(created_at DESC);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_bug_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_bug_reports_updated_at
    BEFORE UPDATE ON shout_bug_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_bug_reports_updated_at();

