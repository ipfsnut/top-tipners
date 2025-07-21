// src/hooks/useTopStakers.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchTopTipnHolders } from '@/services/ankrTokenService'
import type { Staker } from '@/types'

// Cache key for last refresh time
const REFRESH_CACHE_KEY = 'tipn_last_refresh'
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes

// Check if refresh is allowed (30-minute cooldown)
function canRefresh(): boolean {
  const lastRefresh = localStorage.getItem(REFRESH_CACHE_KEY)
  if (!lastRefresh) return true
  
  const timeSinceRefresh = Date.now() - parseInt(lastRefresh)
  return timeSinceRefresh >= REFRESH_COOLDOWN_MS
}

// Get time until next refresh is allowed
export function getTimeUntilNextRefresh(): number {
  const lastRefresh = localStorage.getItem(REFRESH_CACHE_KEY)
  if (!lastRefresh) return 0
  
  const timeSinceRefresh = Date.now() - parseInt(lastRefresh)
  const remaining = REFRESH_COOLDOWN_MS - timeSinceRefresh
  return Math.max(0, remaining)
}

// Save to Supabase
async function saveToSupabase(stakers: Staker[]): Promise<void> {
  try {
    console.log('💾 Saving to Supabase...')
    
    // Clear existing data
    await supabase.from('tipn_stakers').delete().neq('address', '')
    
    // Insert new data in batches to avoid payload limits
    const batchSize = 1000
    for (let i = 0; i < stakers.length; i += batchSize) {
      const batch = stakers.slice(i, i + batchSize)
      const stakersToCache = batch.map(staker => ({
        address: staker.address,
        amount: staker.amount.toString(),
        rank: staker.rank,
        updated_at: new Date().toISOString()
      }))

      const { error } = await supabase.from('tipn_stakers').insert(stakersToCache)
      if (error) throw error
      
      console.log(`💾 Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stakers.length / batchSize)}`)
    }
    
    console.log(`✅ Saved ${stakers.length} stakers to Supabase`)
  } catch (error) {
    console.error('Failed to save to Supabase:', error)
    throw error
  }
}

// Load from Supabase
async function loadFromSupabase(): Promise<Staker[]> {
  try {
    console.log('🗄️ Loading from Supabase...')
    
    const { data, error } = await supabase
      .from('tipn_stakers')
      .select('*')
      .order('rank', { ascending: true })
      .limit(1000)

    if (error) throw error
    
    if (!data || data.length === 0) {
      console.log('📭 No cached data found in Supabase')
      return []
    }
    
    const stakers = data.map(cached => ({
      address: cached.address,
      amount: BigInt(cached.amount),
      rank: cached.rank
    }))
    
    console.log(`✅ Loaded ${stakers.length} stakers from Supabase`)
    return stakers
  } catch (error) {
    console.error('Failed to load from Supabase:', error)
    throw error
  }
}

// Main fetch function - always tries Supabase first, then Ankr if needed
async function fetchTopStakers(): Promise<Staker[]> {
  try {
    // Always try Supabase first for fast loading
    const cachedStakers = await loadFromSupabase()
    
    if (cachedStakers.length > 0) {
      console.log('🎯 Using cached data from Supabase')
      return cachedStakers
    }
    
    // If no cached data, fetch fresh data from Ankr
    console.log('🔄 No cached data - fetching fresh data from Ankr...')
    const freshStakers = await fetchTopTipnHolders(1000)
    
    // Save to Supabase with proper error handling (NOT in background)
    try {
      console.log('💾 Saving fresh data to Supabase...')
      await saveToSupabase(freshStakers)
      console.log('✅ Successfully cached data in Supabase')
    } catch (supabaseError) {
      console.error('❌ Failed to save to Supabase:', supabaseError)
      console.error('⚠️ Data will not be cached - next load will fetch fresh from Ankr')
      // Continue anyway - we still have the data to display
    }
    
    return freshStakers
    
  } catch (error) {
    console.error('Failed to fetch top stakers:', error)
    throw error
  }
}

// Force refresh function (with cooldown protection)
export async function forceRefreshStakers(): Promise<Staker[]> {
  if (!canRefresh()) {
    const remainingMs = getTimeUntilNextRefresh()
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    throw new Error(`Please wait ${remainingMinutes} more minutes before refreshing again`)
  }

  console.log('🔄 Force refresh initiated...')
  
  try {
    // Fetch fresh data from Ankr
    const freshStakers = await fetchTopTipnHolders(1000)
    
    // Save to Supabase
    await saveToSupabase(freshStakers)
    
    // Update refresh timestamp
    localStorage.setItem(REFRESH_CACHE_KEY, Date.now().toString())
    
    console.log(`✅ Force refresh completed - ${freshStakers.length} stakers updated`)
    return freshStakers
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error)
    throw error
  }
}

// React Query hook
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchTopStakers,
    staleTime: 10 * 60 * 1000, // 10 minutes - data is considered fresh
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

// Helper to check if refresh is available
export function useCanRefresh() {
  return canRefresh()
}