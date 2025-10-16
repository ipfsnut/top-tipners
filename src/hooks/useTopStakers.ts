// src/hooks/useTopStakers.ts
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchTopTipnHolders } from '@/services/ankrTokenService'
import { getFarcasterUserByAddress } from '@/utils/farcaster'
import { resolveName } from '@/utils/ens'
import type { StakerWithIdentity } from '@/types'

// Re-export the type for convenience
export type { StakerWithIdentity } from '@/types'

// Cache timing
const REFRESH_COOLDOWN_MS = 30 * 60 * 1000 // 30 minutes
const REFRESH_CACHE_KEY = 'tipn_last_refresh'

function canRefresh(): boolean {
  const lastRefresh = localStorage.getItem(REFRESH_CACHE_KEY)
  if (!lastRefresh) return true
  
  const timeSinceRefresh = Date.now() - parseInt(lastRefresh)
  return timeSinceRefresh >= REFRESH_COOLDOWN_MS
}

export function getTimeUntilNextRefresh(): number {
  const lastRefresh = localStorage.getItem(REFRESH_CACHE_KEY)
  if (!lastRefresh) return 0
  
  const timeSinceRefresh = Date.now() - parseInt(lastRefresh)
  const remaining = REFRESH_COOLDOWN_MS - timeSinceRefresh
  return Math.max(0, remaining)
}

// Fetch identity for a single address
async function enrichWithIdentity(address: string): Promise<Partial<StakerWithIdentity>> {
  try {
    console.log(`🔍 Enriching ${address}...`)
    
    const [farcasterUser, ensData] = await Promise.all([
      getFarcasterUserByAddress(address).catch(() => null),
      resolveName(address).catch(() => ({ ens: null, basename: null }))
    ])

    // Determine display name and identity type
    let displayName: string
    let identityType: 'farcaster' | 'ens' | 'basename' | 'address'
    let profileUrl: string | undefined
    let hasVerifiedIdentity: boolean

    if (farcasterUser) {
      displayName = farcasterUser.displayName || `@${farcasterUser.username}`
      identityType = 'farcaster'
      profileUrl = `https://warpcast.com/${farcasterUser.username}`
      hasVerifiedIdentity = true
    } else if (ensData.basename) {
      displayName = ensData.basename
      identityType = 'basename'
      hasVerifiedIdentity = true
    } else if (ensData.ens) {
      displayName = ensData.ens
      identityType = 'ens'
      hasVerifiedIdentity = true
    } else {
      displayName = `${address.slice(0, 6)}...${address.slice(-4)}`
      identityType = 'address'
      hasVerifiedIdentity = false
    }

    const enriched: Partial<StakerWithIdentity> = {
      displayName,
      identityType,
      hasVerifiedIdentity,
      profileUrl,
      farcasterUsername: farcasterUser?.username,
      farcasterDisplayName: farcasterUser?.displayName,
      farcasterPfpUrl: farcasterUser?.pfpUrl,
      farcasterBio: farcasterUser?.bio,
      farcasterFollowerCount: farcasterUser?.followerCount,
      ensName: ensData.ens || undefined,
      basename: ensData.basename || undefined,
    }

    if (hasVerifiedIdentity) {
      console.log(`✨ Found identity: ${displayName} (${identityType})`)
    }

    return enriched
  } catch (error) {
    console.error(`Failed to enrich ${address}:`, error)
    return {
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      identityType: 'address',
      hasVerifiedIdentity: false
    }
  }
}

// Helper function to create a complete StakerWithIdentity from partial data
function createStakerWithIdentity(
  baseStaker: { address: string; amount: bigint; rank: number },
  identityData?: Partial<StakerWithIdentity>
): StakerWithIdentity {
  const fallbackDisplayName = `${baseStaker.address.slice(0, 6)}...${baseStaker.address.slice(-4)}`
  
  return {
    ...baseStaker,
    displayName: identityData?.displayName || fallbackDisplayName,
    hasVerifiedIdentity: identityData?.hasVerifiedIdentity || false,
    identityType: identityData?.identityType || 'address',
    farcasterUsername: identityData?.farcasterUsername,
    farcasterDisplayName: identityData?.farcasterDisplayName,
    farcasterPfpUrl: identityData?.farcasterPfpUrl,
    farcasterBio: identityData?.farcasterBio,
    farcasterFollowerCount: identityData?.farcasterFollowerCount,
    ensName: identityData?.ensName,
    basename: identityData?.basename,
    profileUrl: identityData?.profileUrl,
  }
}

// Save to unified table structure
async function saveToSupabase(stakers: StakerWithIdentity[]): Promise<void> {
  try {
    console.log('💾 Saving unified staker data to Supabase...')
    
    // Clear existing data
    await supabase.from('tipn_stakers').delete().neq('address', '')
    
    // Convert and save in batches
    const batchSize = 100
    for (let i = 0; i < stakers.length; i += batchSize) {
      const batch = stakers.slice(i, i + batchSize)
      const rows = batch.map(staker => ({
        address: staker.address,
        amount: staker.amount.toString(),
        rank: staker.rank,
        updated_at: new Date().toISOString(),
        
        // Identity columns
        display_name: staker.displayName,
        farcaster_username: staker.farcasterUsername || null,
        farcaster_display_name: staker.farcasterDisplayName || null,
        farcaster_pfp_url: staker.farcasterPfpUrl || null,
        farcaster_bio: staker.farcasterBio || null,
        farcaster_follower_count: staker.farcasterFollowerCount || 0,
        ens_name: staker.ensName || null,
        basename: staker.basename || null,
        has_verified_identity: staker.hasVerifiedIdentity,
        identity_type: staker.identityType,
        profile_url: staker.profileUrl || null,
        identity_last_updated: new Date().toISOString()
      }))

      const { error } = await supabase.from('tipn_stakers').insert(rows)
      if (error) throw error
      
      console.log(`💾 Saved batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stakers.length / batchSize)}`)
    }
    
    console.log(`✅ Saved ${stakers.length} enriched stakers`)
  } catch (error) {
    console.error('Failed to save to Supabase:', error)
    throw error
  }
}

// Load from unified table structure
async function loadFromSupabase(): Promise<StakerWithIdentity[]> {
  try {
    console.log('🗄️ Loading unified staker data from Supabase...')
    
    const { data, error } = await supabase
      .from('tipn_stakers')
      .select('*')
      .order('rank', { ascending: true })
      .limit(1000)

    if (error) throw error
    
    if (!data || data.length === 0) {
      console.log('📭 No cached data found')
      return []
    }
    
    const stakers: StakerWithIdentity[] = data.map(row => ({
      address: row.address,
      amount: BigInt(row.amount),
      rank: row.rank,
      
      // Identity data - ensure displayName is never undefined
      displayName: row.display_name || `${row.address.slice(0, 6)}...${row.address.slice(-4)}`,
      farcasterUsername: row.farcaster_username || undefined,
      farcasterDisplayName: row.farcaster_display_name || undefined,
      farcasterPfpUrl: row.farcaster_pfp_url || undefined,
      farcasterBio: row.farcaster_bio || undefined,
      farcasterFollowerCount: row.farcaster_follower_count || undefined,
      ensName: row.ens_name || undefined,
      basename: row.basename || undefined,
      hasVerifiedIdentity: row.has_verified_identity || false,
      identityType: row.identity_type || 'address',
      profileUrl: row.profile_url || undefined
    }))
    
    console.log(`✅ Loaded ${stakers.length} enriched stakers from Supabase`)
    return stakers
  } catch (error) {
    console.error('Failed to load from Supabase:', error)
    throw error
  }
}

// Main fetch function - simplified to avoid loading issues
async function fetchTopStakers(): Promise<StakerWithIdentity[]> {
  try {
    console.log('🔄 Fetching top stakers...')
    
    // Try cache first for instant loading
    const cachedStakers = await loadFromSupabase()
    
    if (cachedStakers.length > 0) {
      console.log(`🎯 Using cached data: ${cachedStakers.length} stakers`)
      return cachedStakers
    }
    
    // No cache - fetch fresh and create basic stakers (no enrichment to avoid blocking)
    console.log('📦 No cache found, fetching fresh staking data...')
    const freshStakers = await fetchTopTipnHolders(1000)
    
    // Create basic stakers without enrichment for fast loading
    const basicStakers: StakerWithIdentity[] = freshStakers.map(staker => 
      createStakerWithIdentity(staker)
    )
    
    // Save basic data immediately
    await saveToSupabase(basicStakers)
    
    console.log(`✅ Loaded ${basicStakers.length} stakers (basic data saved)`)
    return basicStakers
    
  } catch (error) {
    console.error('Failed to fetch top stakers:', error)
    throw error
  }
}

// Force refresh function
export async function forceRefreshStakers(): Promise<StakerWithIdentity[]> {
  if (!canRefresh()) {
    const remainingMs = getTimeUntilNextRefresh()
    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000))
    throw new Error(`Please wait ${remainingMinutes} more minutes before refreshing again`)
  }

  console.log('🔄 Force refresh initiated...')
  
  try {
    // Get fresh staking data
    const freshStakers = await fetchTopTipnHolders(1000)
    
    // Load existing identities to preserve them
    const existingData = await loadFromSupabase()
    const identityMap = new Map<string, Partial<StakerWithIdentity>>()
    
    existingData.forEach(staker => {
      if (staker.hasVerifiedIdentity) {
        identityMap.set(staker.address, {
          displayName: staker.displayName,
          farcasterUsername: staker.farcasterUsername,
          farcasterDisplayName: staker.farcasterDisplayName,
          farcasterPfpUrl: staker.farcasterPfpUrl,
          farcasterBio: staker.farcasterBio,
          farcasterFollowerCount: staker.farcasterFollowerCount,
          ensName: staker.ensName,
          basename: staker.basename,
          hasVerifiedIdentity: staker.hasVerifiedIdentity,
          identityType: staker.identityType,
          profileUrl: staker.profileUrl
        })
      }
    })
    
    console.log(`🔄 Preserving ${identityMap.size} existing identities`)
    
    // Merge fresh staking data with preserved identities using the helper function
    const mergedStakers: StakerWithIdentity[] = freshStakers.map(staker => {
      const existingIdentity = identityMap.get(staker.address)
      return createStakerWithIdentity(staker, existingIdentity)
    })
    
    // Save merged data
    await saveToSupabase(mergedStakers)
    
    // Update refresh timestamp
    localStorage.setItem(REFRESH_CACHE_KEY, Date.now().toString())
    
    console.log(`✅ Force refresh completed - ${mergedStakers.length} stakers updated`)
    return mergedStakers
    
  } catch (error) {
    console.error('❌ Force refresh failed:', error)
    throw error
  }
}

// React Query hook - same interface as before!
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchTopStakers,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour (updated from cacheTime)
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

export function useCanRefresh() {
  return canRefresh()
}

// Background enrichment function - can be called separately
export async function backgroundEnrichStakers(limit: number = 20): Promise<number> {
  try {
    console.log(`🔍 Starting background enrichment for ${limit} stakers...`)
    
    // Load current cached data
    const cachedStakers = await loadFromSupabase()
    if (cachedStakers.length === 0) {
      console.log('No cached data found for enrichment')
      return 0
    }
    
    // Find stakers without verified identities (top ranked first)
    const unenrichedStakers = cachedStakers
      .filter(staker => !staker.hasVerifiedIdentity)
      .sort((a, b) => a.rank - b.rank) // Sort by rank
      .slice(0, limit) // Take only the specified limit
    
    if (unenrichedStakers.length === 0) {
      console.log('✅ All top stakers already have verified identities')
      return 0
    }
    
    console.log(`🎯 Enriching ${unenrichedStakers.length} stakers...`)
    let enriched = 0
    
    for (const staker of unenrichedStakers) {
      try {
        const identityData = await enrichWithIdentity(staker.address)
        const updatedStaker = createStakerWithIdentity(
          { address: staker.address, amount: staker.amount, rank: staker.rank },
          identityData
        )
        
        // Update in the cached array
        const index = cachedStakers.findIndex(s => s.address === staker.address)
        if (index !== -1) {
          cachedStakers[index] = updatedStaker
          enriched++
        }
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 800))
        
      } catch (error) {
        console.warn(`Failed to enrich ${staker.address}:`, error)
      }
    }
    
    if (enriched > 0) {
      // Save updated data back to Supabase
      await saveToSupabase(cachedStakers)
      console.log(`✅ Background enriched ${enriched} stakers`)
    }
    
    return enriched
  } catch (error) {
    console.error('Background enrichment failed:', error)
    return 0
  }
}