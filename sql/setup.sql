-- Add identity columns to existing tipn_stakers table
-- This allows us to fetch staking data + identities in a single query

-- Add Farcaster columns
ALTER TABLE public.tipn_stakers 
ADD COLUMN IF NOT EXISTS fid INTEGER,
ADD COLUMN IF NOT EXISTS farcaster_username TEXT,
ADD COLUMN IF NOT EXISTS farcaster_display_name TEXT,
ADD COLUMN IF NOT EXISTS farcaster_pfp_url TEXT,
ADD COLUMN IF NOT EXISTS farcaster_bio TEXT,
ADD COLUMN IF NOT EXISTS farcaster_follower_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS farcaster_following_count INTEGER DEFAULT 0;

-- Add ENS/Basename columns  
ALTER TABLE public.tipn_stakers
ADD COLUMN IF NOT EXISTS ens_name TEXT,
ADD COLUMN IF NOT EXISTS basename TEXT;

-- Add identity metadata
ALTER TABLE public.tipn_stakers
ADD COLUMN IF NOT EXISTS has_verified_identity BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS identity_type TEXT DEFAULT 'address',
ADD COLUMN IF NOT EXISTS display_name TEXT,
ADD COLUMN IF NOT EXISTS profile_url TEXT,
ADD COLUMN IF NOT EXISTS identity_last_updated TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance on identity searches
CREATE INDEX IF NOT EXISTS idx_tipn_stakers_farcaster_username 
ON public.tipn_stakers(farcaster_username) WHERE farcaster_username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_ens_name 
ON public.tipn_stakers(ens_name) WHERE ens_name IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_basename 
ON public.tipn_stakers(basename) WHERE basename IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_has_verified_identity 
ON public.tipn_stakers(has_verified_identity);

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_identity_type 
ON public.tipn_stakers(identity_type);

-- Add comments for documentation
COMMENT ON COLUMN public.tipn_stakers.fid IS 'Farcaster ID number';
COMMENT ON COLUMN public.tipn_stakers.farcaster_username IS 'Farcaster username';
COMMENT ON COLUMN public.tipn_stakers.farcaster_display_name IS 'Display name from Farcaster profile';
COMMENT ON COLUMN public.tipn_stakers.farcaster_pfp_url IS 'Profile picture URL from Farcaster';
COMMENT ON COLUMN public.tipn_stakers.farcaster_bio IS 'Bio text from Farcaster profile';
COMMENT ON COLUMN public.tipn_stakers.farcaster_follower_count IS 'Number of Farcaster followers';
COMMENT ON COLUMN public.tipn_stakers.farcaster_following_count IS 'Number of accounts following on Farcaster';
COMMENT ON COLUMN public.tipn_stakers.ens_name IS 'ENS name (.eth domain)';
COMMENT ON COLUMN public.tipn_stakers.basename IS 'Base name (.base.eth domain)';
COMMENT ON COLUMN public.tipn_stakers.has_verified_identity IS 'True if address has any verified identity (Farcaster/ENS/Basename)';
COMMENT ON COLUMN public.tipn_stakers.identity_type IS 'Primary identity type: farcaster, ens, basename, or address';
COMMENT ON COLUMN public.tipn_stakers.display_name IS 'Computed display name based on priority: Farcaster > Basename > ENS > Address';
COMMENT ON COLUMN public.tipn_stakers.profile_url IS 'URL to profile page (e.g., Warpcast profile)';
COMMENT ON COLUMN public.tipn_stakers.identity_last_updated IS 'When identity data was last refreshed from APIs';

-- Optional: Drop the separate farcaster_identities table if you want to clean up
-- DROP TABLE IF EXISTS public.farcaster_identities;