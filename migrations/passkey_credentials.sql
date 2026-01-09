-- Passkey/WebAuthn credentials storage
-- This table stores the public keys and metadata needed for cross-device passkey authentication

CREATE TABLE IF NOT EXISTS passkey_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The credential ID from WebAuthn (base64url encoded)
    credential_id TEXT NOT NULL UNIQUE,
    
    -- The public key in COSE format (base64 encoded)
    public_key TEXT NOT NULL,
    
    -- Counter for replay attack prevention
    counter BIGINT NOT NULL DEFAULT 0,
    
    -- User identifier (derived wallet address)
    user_address TEXT NOT NULL,
    
    -- Human-readable name for the passkey
    display_name TEXT,
    
    -- Authenticator info
    aaguid TEXT, -- Authenticator Attestation GUID
    
    -- Transports supported by this credential
    transports TEXT[], -- ['internal', 'hybrid', 'usb', 'ble', 'nfc']
    
    -- Whether this credential is backed up (synced across devices)
    backed_up BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    
    -- Device info (optional, for user reference)
    device_info JSONB
);

-- Index for looking up credentials by user
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_user_address 
ON passkey_credentials(user_address);

-- Index for looking up by credential_id (used during authentication)
CREATE INDEX IF NOT EXISTS idx_passkey_credentials_credential_id 
ON passkey_credentials(credential_id);

-- Active challenges for WebAuthn ceremonies (short-lived)
CREATE TABLE IF NOT EXISTS passkey_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- The challenge (base64url encoded)
    challenge TEXT NOT NULL UNIQUE,
    
    -- Type of ceremony: 'registration' or 'authentication'
    ceremony_type TEXT NOT NULL CHECK (ceremony_type IN ('registration', 'authentication')),
    
    -- User address (for registration, this is the intended address; for auth, nullable)
    user_address TEXT,
    
    -- Expiration (challenges are short-lived, typically 5 minutes)
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Whether this challenge has been used
    used BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for looking up challenges
CREATE INDEX IF NOT EXISTS idx_passkey_challenges_challenge 
ON passkey_challenges(challenge);

-- Auto-cleanup old challenges (run periodically)
-- DELETE FROM passkey_challenges WHERE expires_at < NOW() OR used = true;

-- Enable RLS
ALTER TABLE passkey_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE passkey_challenges ENABLE ROW LEVEL SECURITY;

-- Policies for passkey_credentials
-- Anyone can read credentials (needed for auth options)
CREATE POLICY "Anyone can read passkey credentials" ON passkey_credentials
    FOR SELECT USING (true);

-- Only service role can insert/update credentials
CREATE POLICY "Service role can insert passkey credentials" ON passkey_credentials
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update passkey credentials" ON passkey_credentials
    FOR UPDATE USING (true);

-- Policies for passkey_challenges
CREATE POLICY "Anyone can read challenges" ON passkey_challenges
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage challenges" ON passkey_challenges
    FOR ALL USING (true);
