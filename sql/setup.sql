-- Create table for TIPN stakers cache
CREATE TABLE IF NOT EXISTS public.tipn_stakers (
    address TEXT PRIMARY KEY,
    amount TEXT NOT NULL,
    rank INTEGER NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tipn_stakers_rank 
ON public.tipn_stakers(rank);

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_updated_at 
ON public.tipn_stakers(updated_at);

CREATE INDEX IF NOT EXISTS idx_tipn_stakers_amount 
ON public.tipn_stakers(amount);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tipn_stakers ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access
CREATE POLICY "Allow public read access" ON public.tipn_stakers
    FOR SELECT USING (true);

-- Create policy to allow public insert/update/delete for cache operations
CREATE POLICY "Allow public write access" ON public.tipn_stakers
    FOR ALL USING (true);

-- Grant permissions to anon and authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipn_stakers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipn_stakers TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.tipn_stakers IS 'Cache table for TIPN staking leaderboard data';
COMMENT ON COLUMN public.tipn_stakers.address IS 'Ethereum address of the staker';
COMMENT ON COLUMN public.tipn_stakers.amount IS 'Staked amount in wei (stored as text for BigInt compatibility)';
COMMENT ON COLUMN public.tipn_stakers.rank IS 'Ranking position in the leaderboard';
COMMENT ON COLUMN public.tipn_stakers.updated_at IS 'Timestamp when this record was last updated';