-- Security Migration: Enable RLS on Sensitive Tables
-- This migration fixes critical security vulnerabilities where sensitive user data
-- is exposed without Row Level Security protection.

-- ============================================================================
-- 1. SHOUT_CALENDAR_CONNECTIONS - CRITICAL: Contains OAuth tokens!
-- ============================================================================
ALTER TABLE public.shout_calendar_connections ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own calendar connections" ON public.shout_calendar_connections;
DROP POLICY IF EXISTS "Users can insert own calendar connections" ON public.shout_calendar_connections;
DROP POLICY IF EXISTS "Users can update own calendar connections" ON public.shout_calendar_connections;
DROP POLICY IF EXISTS "Users can delete own calendar connections" ON public.shout_calendar_connections;
DROP POLICY IF EXISTS "Service role has full access to calendar connections" ON public.shout_calendar_connections;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to calendar connections"
ON public.shout_calendar_connections
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access calendar connections directly (must go through API)
-- No policy for anon = no access

-- ============================================================================
-- 2. SHOUT_PHONE_NUMBERS - CRITICAL: Contains verification codes!
-- ============================================================================
ALTER TABLE public.shout_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own phone numbers" ON public.shout_phone_numbers;
DROP POLICY IF EXISTS "Users can insert own phone numbers" ON public.shout_phone_numbers;
DROP POLICY IF EXISTS "Users can update own phone numbers" ON public.shout_phone_numbers;
DROP POLICY IF EXISTS "Users can delete own phone numbers" ON public.shout_phone_numbers;
DROP POLICY IF EXISTS "Service role has full access to phone numbers" ON public.shout_phone_numbers;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to phone numbers"
ON public.shout_phone_numbers
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access phone numbers directly (must go through API)
-- No policy for anon = no access

-- ============================================================================
-- 3. SHOUT_USER_SETTINGS - Contains user preferences and scheduling settings
-- ============================================================================
ALTER TABLE public.shout_user_settings ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own settings" ON public.shout_user_settings;
DROP POLICY IF EXISTS "Users can manage own settings" ON public.shout_user_settings;
DROP POLICY IF EXISTS "Service role has full access to user settings" ON public.shout_user_settings;
DROP POLICY IF EXISTS "Anyone can view public scheduling info" ON public.shout_user_settings;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to user settings"
ON public.shout_user_settings
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Allow public read access to scheduling-enabled profiles (for booking pages)
CREATE POLICY "Anyone can view public scheduling info"
ON public.shout_user_settings
FOR SELECT
TO anon
USING (scheduling_enabled = true OR public_landing_enabled = true);

-- ============================================================================
-- 4. SHOUT_POINTS - Contains user points/rewards
-- ============================================================================
ALTER TABLE public.shout_points ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own points" ON public.shout_points;
DROP POLICY IF EXISTS "Service role has full access to points" ON public.shout_points;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to points"
ON public.shout_points
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access points directly
-- No policy for anon = no access

-- ============================================================================
-- 5. SHOUT_FRIENDS - Contains friend relationships
-- ============================================================================
ALTER TABLE public.shout_friends ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies (including the ones that exist but RLS was disabled)
DROP POLICY IF EXISTS "Users can add friends" ON public.shout_friends;
DROP POLICY IF EXISTS "Users can remove friends" ON public.shout_friends;
DROP POLICY IF EXISTS "Users can view their friends" ON public.shout_friends;
DROP POLICY IF EXISTS "Service role has full access to friends" ON public.shout_friends;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to friends"
ON public.shout_friends
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access friends directly
-- No policy for anon = no access

-- ============================================================================
-- 6. SHOUT_FRIEND_REQUESTS - Contains friend request data
-- ============================================================================
ALTER TABLE public.shout_friend_requests ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can create requests" ON public.shout_friend_requests;
DROP POLICY IF EXISTS "Users can update requests to them" ON public.shout_friend_requests;
DROP POLICY IF EXISTS "Users can view their requests" ON public.shout_friend_requests;
DROP POLICY IF EXISTS "Service role has full access to friend requests" ON public.shout_friend_requests;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to friend requests"
ON public.shout_friend_requests
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access friend requests directly
-- No policy for anon = no access

-- ============================================================================
-- 7. SHOUT_CALLS - Contains call records
-- ============================================================================
ALTER TABLE public.shout_calls ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can create calls" ON public.shout_calls;
DROP POLICY IF EXISTS "Anyone can delete calls" ON public.shout_calls;
DROP POLICY IF EXISTS "Anyone can update calls" ON public.shout_calls;
DROP POLICY IF EXISTS "Anyone can view calls" ON public.shout_calls;
DROP POLICY IF EXISTS "Service role has full access to calls" ON public.shout_calls;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to calls"
ON public.shout_calls
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Anon users cannot access calls directly
-- No policy for anon = no access

-- ============================================================================
-- 8. SHOUT_USERNAMES - Contains username mappings
-- ============================================================================
ALTER TABLE public.shout_usernames ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Anyone can read usernames" ON public.shout_usernames;
DROP POLICY IF EXISTS "Users can claim username" ON public.shout_usernames;
DROP POLICY IF EXISTS "Users can update own username" ON public.shout_usernames;
DROP POLICY IF EXISTS "Service role has full access to usernames" ON public.shout_usernames;
DROP POLICY IF EXISTS "Anyone can view usernames" ON public.shout_usernames;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to usernames"
ON public.shout_usernames
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Usernames should be publicly readable (for user lookup)
CREATE POLICY "Anyone can view usernames"
ON public.shout_usernames
FOR SELECT
TO anon
USING (true);

-- ============================================================================
-- 9. SHOUT_SOCIALS - Contains social media links
-- ============================================================================
ALTER TABLE public.shout_socials ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view own socials" ON public.shout_socials;
DROP POLICY IF EXISTS "Users can manage own socials" ON public.shout_socials;
DROP POLICY IF EXISTS "Service role has full access to socials" ON public.shout_socials;
DROP POLICY IF EXISTS "Anyone can view socials" ON public.shout_socials;

-- Service role (backend) has full access
CREATE POLICY "Service role has full access to socials"
ON public.shout_socials
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Socials should be publicly readable (for profile display)
CREATE POLICY "Anyone can view socials"
ON public.shout_socials
FOR SELECT
TO anon
USING (true);

-- ============================================================================
-- VERIFICATION: Check RLS is enabled on all tables
-- ============================================================================
-- Run this query to verify:
-- SELECT schemaname, tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE tablename LIKE 'shout_%' AND schemaname = 'public';
