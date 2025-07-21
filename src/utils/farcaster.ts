// Farcaster user data types
export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
  followerCount?: number
  followingCount?: number
  verifiedAddresses?: string[]
}

// Cache for Farcaster lookups
const farcasterCache = new Map<string, FarcasterUser | null>()

// Environment variable for Neynar API
const NEYNAR_API_KEY = import.meta.env?.VITE_NEYNAR_API_KEY

// Neynar API endpoints
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2'

// Get Farcaster user by verified address
export async function getFarcasterUserByAddress(address: string): Promise<FarcasterUser | null> {
  const cacheKey = `fc_${address.toLowerCase()}`
  
  // Check cache first
  if (farcasterCache.has(cacheKey)) {
    return farcasterCache.get(cacheKey) || null
  }

  if (!NEYNAR_API_KEY) {
    console.warn('VITE_NEYNAR_API_KEY not set - Farcaster lookups disabled')
    farcasterCache.set(cacheKey, null)
    return null
  }

  try {
    // Use Neynar API to find user by verified address
    const response = await fetch(
      `${NEYNAR_BASE_URL}/farcaster/user/bulk-by-address?addresses=${address}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': NEYNAR_API_KEY,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Neynar API error: ${response.status}`)
    }

    const data = await response.json()
    
    // Check if we found a user for this address
    const addressData = data[address.toLowerCase()]
    if (!addressData || addressData.length === 0) {
      farcasterCache.set(cacheKey, null)
      return null
    }

    // Get the first user (primary account)
    const userData = addressData[0]
    
    const farcasterUser: FarcasterUser = {
      fid: userData.fid,
      username: userData.username,
      displayName: userData.display_name || userData.username,
      pfpUrl: userData.pfp_url || '',
      bio: userData.profile?.bio?.text || '',
      followerCount: userData.follower_count || 0,
      followingCount: userData.following_count || 0,
      verifiedAddresses: userData.verified_addresses?.eth_addresses || []
    }

    // Cache the result
    farcasterCache.set(cacheKey, farcasterUser)
    return farcasterUser

  } catch (error) {
    console.warn(`Farcaster lookup failed for ${address}:`, error)
    farcasterCache.set(cacheKey, null)
    return null
  }
}

// Batch lookup for multiple addresses (more efficient)
export async function batchGetFarcasterUsers(addresses: string[]): Promise<Map<string, FarcasterUser | null>> {
  const results = new Map<string, FarcasterUser | null>()
  
  if (!NEYNAR_API_KEY) {
    console.warn('VITE_NEYNAR_API_KEY not set - Farcaster lookups disabled')
    addresses.forEach(addr => results.set(addr, null))
    return results
  }

  // Process in batches of 20 addresses (Neynar API limit)
  const batchSize = 20
  
  try {
    for (let i = 0; i < addresses.length; i += batchSize) {
      const batch = addresses.slice(i, i + batchSize)
      const addressParam = batch.join(',')
      
      const response = await fetch(
        `${NEYNAR_BASE_URL}/farcaster/user/bulk-by-address?addresses=${addressParam}`,
        {
          headers: {
            'accept': 'application/json',
            'api_key': NEYNAR_API_KEY,
          },
        }
      )

      if (response.ok) {
        const data = await response.json()
        
        // Process each address in the batch
        batch.forEach(address => {
          const addressData = data[address.toLowerCase()]
          
          if (addressData && addressData.length > 0) {
            const userData = addressData[0]
            const farcasterUser: FarcasterUser = {
              fid: userData.fid,
              username: userData.username,
              displayName: userData.display_name || userData.username,
              pfpUrl: userData.pfp_url || '',
              bio: userData.profile?.bio?.text || '',
              followerCount: userData.follower_count || 0,
              followingCount: userData.following_count || 0,
              verifiedAddresses: userData.verified_addresses?.eth_addresses || []
            }
            
            results.set(address, farcasterUser)
            farcasterCache.set(`fc_${address.toLowerCase()}`, farcasterUser)
          } else {
            results.set(address, null)
            farcasterCache.set(`fc_${address.toLowerCase()}`, null)
          }
        })
      } else {
        // If batch fails, mark all as null
        batch.forEach(address => {
          results.set(address, null)
          farcasterCache.set(`fc_${address.toLowerCase()}`, null)
        })
      }
      
      // Rate limit: small delay between batches
      if (i + batchSize < addresses.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
  } catch (error) {
    console.error('Batch Farcaster lookup failed:', error)
    // Mark remaining addresses as null
    addresses.forEach(address => {
      if (!results.has(address)) {
        results.set(address, null)
      }
    })
  }

  return results
}

// Clear Farcaster cache
export function clearFarcasterCache(): void {
  farcasterCache.clear()
}

// Helper to get Farcaster profile URL
export function getFarcasterProfileUrl(username: string): string {
  return `https://warpcast.com/${username}`
}

// Helper to get optimized PFP URL
export function getOptimizedPfpUrl(pfpUrl: string, size: number = 32): string {
  if (!pfpUrl) return ''
  
  // If it's an IPFS URL, use a gateway
  if (pfpUrl.startsWith('ipfs://')) {
    const hash = pfpUrl.replace('ipfs://', '')
    return `https://ipfs.io/ipfs/${hash}`
  }
  
  // For other URLs, try to optimize size if possible
  if (pfpUrl.includes('imagedelivery.net')) {
    // Cloudflare Images optimization
    return `${pfpUrl}/w=${size},h=${size}`
  }
  
  return pfpUrl
}