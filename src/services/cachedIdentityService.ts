// src/services/cachedIdentityService.ts - Updated for unified tipn_stakers table
import { supabase } from '@/lib/supabase'
import { getFarcasterUserByAddress } from '@/utils/farcaster'
import { resolveName } from '@/utils/ens'

// Rate limiting configuration for Neynar free plan
const RATE_LIMIT_CONFIG = {
  // Neynar free plan: ~100 requests per day
  MAX_REQUESTS_PER_HOUR: 10, // Very conservative
  MAX_BATCH_SIZE: 5, // Small batches
  DELAY_BETWEEN_REQUESTS: 2000, // 2 seconds between requests
  CACHE_EXPIRY_HOURS: 24 * 7, // Cache for 1 week
  // Supabase query batching limits
  SUPABASE_BATCH_SIZE: 100, // Maximum addresses per Supabase query
}

// Track API usage to respect rate limits
class RateLimiter {
  private requestTimes: number[] = []
  
  canMakeRequest(): boolean {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Remove old requests
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)
    
    return this.requestTimes.length < RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR
  }
  
  recordRequest(): void {
    this.requestTimes.push(Date.now())
  }
  
  getTimeUntilNextRequest(): number {
    if (this.requestTimes.length === 0) return 0
    
    const oldestRequest = Math.min(...this.requestTimes)
    const oneHourFromOldest = oldestRequest + (60 * 60 * 1000)
    const now = Date.now()
    
    return Math.max(0, oneHourFromOldest - now)
  }
  
  getRequestCount(): number {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)
    
    // Remove old requests and return current count
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)
    return this.requestTimes.length
  }
}

const rateLimiter = new RateLimiter()

// Updated interface to match the unified tipn_stakers table
export interface CachedIdentity {
  address: string
  fid: number | null
  farcaster_username: string | null
  farcaster_display_name: string | null
  farcaster_pfp_url: string | null
  farcaster_bio: string | null
  farcaster_follower_count: number
  farcaster_following_count: number
  ens_name: string | null
  basename: string | null
  has_verified_identity: boolean
  identity_type: string
  display_name: string | null
  profile_url: string | null
  identity_last_updated: string
}

// Convert to display format
export interface DisplayIdentity {
  address: string
  farcaster: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
    bio: string
    followerCount: number
    followingCount: number
  } | null
  ens: string | null
  basename: string | null
  displayName: string
  displayAvatar: string | null
  profileUrl: string | null
  hasVerifiedIdentity: boolean
  identityType: 'farcaster' | 'ens' | 'basename' | 'address'
}

// Check if cached data is still fresh
function isCacheExpired(lastUpdated: string): boolean {
  const cacheTime = new Date(lastUpdated).getTime()
  const now = Date.now()
  const expiryTime = RATE_LIMIT_CONFIG.CACHE_EXPIRY_HOURS * 60 * 60 * 1000
  
  return (now - cacheTime) > expiryTime
}

// Load cached identities from the unified tipn_stakers table
export async function loadCachedIdentities(addresses: string[]): Promise<Map<string, CachedIdentity>> {
  try {
    console.log(`📦 Loading ${addresses.length} cached identities from unified tipn_stakers table...`)
    
    const cached = new Map<string, CachedIdentity>()
    
    // Process in batches to avoid URL length issues
    const batchSize = RATE_LIMIT_CONFIG.SUPABASE_BATCH_SIZE
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize).map(addr => addr.toLowerCase())
      
      console.log(`📦 Loading batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(addresses.length / batchSize)} (${batch.length} addresses)`)
      
      const { data, error } = await supabase
        .from('tipn_stakers')
        .select(`
          address,
          fid,
          farcaster_username,
          farcaster_display_name,
          farcaster_pfp_url,
          farcaster_bio,
          farcaster_follower_count,
          farcaster_following_count,
          ens_name,
          basename,
          has_verified_identity,
          identity_type,
          display_name,
          profile_url,
          identity_last_updated
        `)
        .in('address', batch)

      if (error) {
        console.warn(`Failed to load batch ${Math.floor(i / batchSize) + 1}:`, error)
        continue
      }
      
      if (data) {
        data.forEach(row => {
          cached.set(row.address, row as CachedIdentity)
        })
      }
      
      // Small delay between batches to be nice to Supabase
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }
    
    console.log(`✅ Loaded ${cached.size} cached identities from ${Math.ceil(addresses.length / batchSize)} batches`)
    return cached
    
  } catch (error) {
    console.error('Failed to load cached identities:', error)
    return new Map()
  }
}

// Save identity to the unified tipn_stakers table
async function saveCachedIdentity(identity: Partial<CachedIdentity>): Promise<void> {
  try {
    const updateData = {
      fid: identity.fid,
      farcaster_username: identity.farcaster_username,
      farcaster_display_name: identity.farcaster_display_name,
      farcaster_pfp_url: identity.farcaster_pfp_url,
      farcaster_bio: identity.farcaster_bio,
      farcaster_follower_count: identity.farcaster_follower_count || 0,
      farcaster_following_count: identity.farcaster_following_count || 0,
      ens_name: identity.ens_name,
      basename: identity.basename,
      has_verified_identity: identity.has_verified_identity || false,
      identity_type: identity.identity_type || 'address',
      display_name: identity.display_name,
      profile_url: identity.profile_url,
      identity_last_updated: new Date().toISOString()
    }

    const { error } = await supabase
      .from('tipn_stakers')
      .update(updateData)
      .eq('address', identity.address)

    if (error) throw error
    
  } catch (error) {
    console.error(`Failed to cache identity for ${identity.address}:`, error)
  }
}

// Fetch fresh identity data (respecting rate limits)
async function fetchFreshIdentity(address: string): Promise<CachedIdentity> {
  console.log(`🔍 Fetching fresh identity for: ${address}`)
  
  // Check rate limit
  if (!rateLimiter.canMakeRequest()) {
    const waitTime = rateLimiter.getTimeUntilNextRequest()
    console.warn(`⏰ Rate limit reached. Next request available in ${Math.ceil(waitTime / 1000 / 60)} minutes`)
    throw new Error(`Rate limit reached. Please wait ${Math.ceil(waitTime / 1000 / 60)} minutes.`)
  }

  try {
    // Fetch both Farcaster and ENS data
    const [farcasterUser, ensData] = await Promise.all([
      getFarcasterUserByAddress(address).catch(() => null),
      resolveName(address).catch(() => ({ ens: null, basename: null, display: null }))
    ])
    
    // Record API usage
    if (farcasterUser) {
      rateLimiter.recordRequest()
    }

    // Determine display name and type
    let displayName: string
    let identityType: 'farcaster' | 'ens' | 'basename' | 'address'
    let profileUrl: string | null = null
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

    // Create cached identity record for unified table
    const cachedIdentity: CachedIdentity = {
      address: address.toLowerCase(),
      fid: farcasterUser?.fid || null,
      farcaster_username: farcasterUser?.username || null,
      farcaster_display_name: farcasterUser?.displayName || null,
      farcaster_pfp_url: farcasterUser?.pfpUrl || null,
      farcaster_bio: farcasterUser?.bio || null,
      farcaster_follower_count: farcasterUser?.followerCount || 0,
      farcaster_following_count: farcasterUser?.followingCount || 0,
      ens_name: ensData.ens,
      basename: ensData.basename,
      has_verified_identity: hasVerifiedIdentity,
      identity_type: identityType,
      display_name: displayName,
      profile_url: profileUrl,
      identity_last_updated: new Date().toISOString()
    }

    // Save to unified table
    await saveCachedIdentity(cachedIdentity)
    
    console.log(`✅ Fresh identity cached for ${address}: ${displayName} (${identityType})`)
    return cachedIdentity
    
  } catch (error) {
    console.error(`Failed to fetch fresh identity for ${address}:`, error)
    
    // Create fallback cache entry
    const fallbackIdentity: CachedIdentity = {
      address: address.toLowerCase(),
      fid: null,
      farcaster_username: null,
      farcaster_display_name: null,
      farcaster_pfp_url: null,
      farcaster_bio: null,
      farcaster_follower_count: 0,
      farcaster_following_count: 0,
      ens_name: null,
      basename: null,
      has_verified_identity: false,
      identity_type: 'address',
      display_name: `${address.slice(0, 6)}...${address.slice(-4)}`,
      profile_url: null,
      identity_last_updated: new Date().toISOString()
    }
    
    await saveCachedIdentity(fallbackIdentity)
    return fallbackIdentity
  }
}

// Convert cached identity to display format
function convertToDisplayIdentity(cached: CachedIdentity): DisplayIdentity {
  // Build Farcaster object if available
  const farcaster = cached.farcaster_username ? {
    fid: cached.fid!,
    username: cached.farcaster_username,
    displayName: cached.farcaster_display_name || cached.farcaster_username,
    pfpUrl: cached.farcaster_pfp_url || '',
    bio: cached.farcaster_bio || '',
    followerCount: cached.farcaster_follower_count,
    followingCount: cached.farcaster_following_count
  } : null

  // Determine display name and type (priority: Farcaster → Basename → ENS → Address)
  let displayName: string
  let displayAvatar: string | null = null
  let profileUrl: string | null = cached.profile_url
  let identityType: DisplayIdentity['identityType']

  if (farcaster) {
    displayName = farcaster.displayName
    displayAvatar = farcaster.pfpUrl
    identityType = 'farcaster'
  } else if (cached.basename) {
    displayName = cached.basename
    identityType = 'basename'
  } else if (cached.ens_name) {
    displayName = cached.ens_name
    identityType = 'ens'
  } else {
    displayName = cached.display_name || `${cached.address.slice(0, 6)}...${cached.address.slice(-4)}`
    identityType = 'address'
  }

  return {
    address: cached.address,
    farcaster,
    ens: cached.ens_name,
    basename: cached.basename,
    displayName,
    displayAvatar,
    profileUrl,
    hasVerifiedIdentity: cached.has_verified_identity,
    identityType: identityType as DisplayIdentity['identityType']
  }
}

// Main function: Get identity with smart caching (now uses unified table)
export async function getIdentityWithCache(address: string): Promise<DisplayIdentity> {
  const normalizedAddress = address.toLowerCase()
  
  try {
    // Try to load from unified table first
    const cached = await loadCachedIdentities([normalizedAddress])
    const cachedIdentity = cached.get(normalizedAddress)
    
    if (cachedIdentity && cachedIdentity.identity_last_updated && !isCacheExpired(cachedIdentity.identity_last_updated)) {
      console.log(`📦 Using cached identity for ${address}`)
      return convertToDisplayIdentity(cachedIdentity)
    }
    
    // Cache is expired or missing - fetch fresh data (if rate limits allow)
    console.log(`🔄 Cache expired or missing for ${address}`)
    
    if (rateLimiter.canMakeRequest()) {
      const freshIdentity = await fetchFreshIdentity(normalizedAddress)
      return convertToDisplayIdentity(freshIdentity)
    } else {
      // Rate limited - use stale cache if available
      if (cachedIdentity) {
        console.log(`⚠️ Rate limited, using stale cache for ${address}`)
        return convertToDisplayIdentity(cachedIdentity)
      }
      
      // No cache and rate limited - return basic identity
      console.log(`❌ No cache and rate limited for ${address}`)
      return {
        address: normalizedAddress,
        farcaster: null,
        ens: null,
        basename: null,
        displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
        displayAvatar: null,
        profileUrl: null,
        hasVerifiedIdentity: false,
        identityType: 'address'
      }
    }
    
  } catch (error) {
    console.error(`Identity lookup failed for ${address}:`, error)
    
    // Return fallback identity
    return {
      address: normalizedAddress,
      farcaster: null,
      ens: null,
      basename: null,
      displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
      displayAvatar: null,
      profileUrl: null,
      hasVerifiedIdentity: false,
      identityType: 'address'
    }
  }
}

// Batch processing with smart rate limiting
export async function batchGetIdentitiesWithCache(addresses: string[]): Promise<Map<string, DisplayIdentity>> {
  const results = new Map<string, DisplayIdentity>()
  const normalizedAddresses = addresses.map(addr => addr.toLowerCase())
  
  console.log(`🔄 Starting smart batch identity lookup for ${addresses.length} addresses`)
  
  try {
    // Load all cached identities first (from unified table)
    const cached = await loadCachedIdentities(normalizedAddresses)
    
    // Separate fresh vs expired/missing
    const needsFresh: string[] = []
    const canUseCached: string[] = []
    
    normalizedAddresses.forEach(address => {
      const cachedIdentity = cached.get(address)
      
      if (cachedIdentity && cachedIdentity.identity_last_updated && !isCacheExpired(cachedIdentity.identity_last_updated)) {
        canUseCached.push(address)
      } else {
        needsFresh.push(address)
      }
    })
    
    console.log(`📊 Cache analysis: ${canUseCached.length} fresh, ${needsFresh.length} need refresh`)
    
    // Use cached data for fresh entries
    canUseCached.forEach(address => {
      const cachedIdentity = cached.get(address)!
      results.set(address, convertToDisplayIdentity(cachedIdentity))
    })
    
    // For expired/missing entries, fetch fresh data within rate limits
    const maxFreshRequests = Math.min(
      needsFresh.length,
      RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - rateLimiter.getRequestCount()
    )
    
    if (maxFreshRequests > 0) {
      console.log(`🔍 Fetching fresh data for ${maxFreshRequests} addresses`)
      
      // Process in small batches with delays
      for (let i = 0; i < maxFreshRequests; i += RATE_LIMIT_CONFIG.MAX_BATCH_SIZE) {
        const batch = needsFresh.slice(i, i + RATE_LIMIT_CONFIG.MAX_BATCH_SIZE)
        
        const batchPromises = batch.map(async (address) => {
          try {
            const fresh = await fetchFreshIdentity(address)
            results.set(address, convertToDisplayIdentity(fresh))
          } catch (error) {
            console.warn(`Failed to refresh ${address}:`, error)
            
            // Use stale cache if available
            const staleCache = cached.get(address)
            if (staleCache) {
              results.set(address, convertToDisplayIdentity(staleCache))
            } else {
              // Fallback identity
              results.set(address, {
                address,
                farcaster: null,
                ens: null,
                basename: null,
                displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
                displayAvatar: null,
                profileUrl: null,
                hasVerifiedIdentity: false,
                identityType: 'address'
              })
            }
          }
        })
        
        await Promise.allSettled(batchPromises)
        
        // Delay between batches
        if (i + RATE_LIMIT_CONFIG.MAX_BATCH_SIZE < maxFreshRequests) {
          console.log('⏳ Waiting between batches...')
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS))
        }
      }
    }
    
    // For remaining addresses that we couldn't refresh due to rate limits, use stale cache
    const remaining = needsFresh.slice(maxFreshRequests)
    remaining.forEach(address => {
      const staleCache = cached.get(address)
      if (staleCache) {
        console.log(`⚠️ Using stale cache for ${address} due to rate limits`)
        results.set(address, convertToDisplayIdentity(staleCache))
      } else {
        // Basic fallback
        results.set(address, {
          address,
          farcaster: null,
          ens: null,
          basename: null,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          displayAvatar: null,
          profileUrl: null,
          hasVerifiedIdentity: false,
          identityType: 'address'
        })
      }
    })
    
    console.log(`✅ Batch lookup complete: ${results.size} identities processed`)
    return results
    
  } catch (error) {
    console.error('Batch identity lookup failed:', error)
    
    // Return fallback results for all addresses
    normalizedAddresses.forEach(address => {
      if (!results.has(address)) {
        results.set(address, {
          address,
          farcaster: null,
          ens: null,
          basename: null,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          displayAvatar: null,
          profileUrl: null,
          hasVerifiedIdentity: false,
          identityType: 'address'
        })
      }
    })
    
    return results
  }
}

// Force refresh specific addresses (within rate limits)
export async function forceRefreshIdentities(addresses: string[]): Promise<number> {
  const maxRequests = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - rateLimiter.getRequestCount()
  const toRefresh = addresses.slice(0, maxRequests)
  
  console.log(`🔄 Force refreshing ${toRefresh.length} identities (${maxRequests} allowed)`)
  
  let refreshed = 0
  for (const address of toRefresh) {
    try {
      await fetchFreshIdentity(address.toLowerCase())
      refreshed++
      
      // Delay between requests
      if (refreshed < toRefresh.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS))
      }
    } catch (error) {
      console.warn(`Failed to refresh ${address}:`, error)
    }
  }
  
  return refreshed
}

// Get rate limit status
export function getRateLimitStatus(): {
  requestsUsed: number
  requestsRemaining: number
  timeUntilReset: number
  canMakeRequest: boolean
} {
  const requestsUsed = rateLimiter.getRequestCount()
  const requestsRemaining = RATE_LIMIT_CONFIG.MAX_REQUESTS_PER_HOUR - requestsUsed
  const timeUntilReset = rateLimiter.getTimeUntilNextRequest()
  
  return {
    requestsUsed,
    requestsRemaining,
    timeUntilReset,
    canMakeRequest: rateLimiter.canMakeRequest()
  }
}

// NEW: Function to enrich existing stakers with identity data
export async function enrichExistingStakers(limit: number = 10): Promise<number> {
  console.log(`🔄 Starting to enrich ${limit} existing stakers with identity data...`)
  
  try {
    // Get stakers that don't have identity data yet
    const { data: stakersToEnrich, error } = await supabase
      .from('tipn_stakers')
      .select('address, rank')
      .or('identity_last_updated.is.null,has_verified_identity.eq.false')
      .order('rank', { ascending: true })
      .limit(limit)

    if (error) throw error
    
    if (!stakersToEnrich || stakersToEnrich.length === 0) {
      console.log('✅ All stakers already have identity data')
      return 0
    }
    
    console.log(`🔍 Found ${stakersToEnrich.length} stakers to enrich`)
    
    let enriched = 0
    for (const staker of stakersToEnrich) {
      // Check rate limits
      if (!rateLimiter.canMakeRequest()) {
        console.log(`⏰ Rate limit reached. Enriched ${enriched} of ${stakersToEnrich.length} stakers.`)
        break
      }
      
      try {
        console.log(`🔍 Enriching rank #${staker.rank}: ${staker.address}`)
        await fetchFreshIdentity(staker.address)
        enriched++
        
        // Delay between requests
        if (enriched < stakersToEnrich.length) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.DELAY_BETWEEN_REQUESTS))
        }
        
      } catch (error) {
        console.warn(`Failed to enrich ${staker.address}:`, error)
      }
    }
    
    console.log(`✅ Enriched ${enriched} stakers with identity data`)
    return enriched
    
  } catch (error) {
    console.error('Failed to enrich existing stakers:', error)
    return 0
  }
}