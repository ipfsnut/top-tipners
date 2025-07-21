import { getFarcasterUserByAddress, batchGetFarcasterUsers, type FarcasterUser } from './farcaster'
import { resolveName } from './ens'

// Combined identity information
export interface UserIdentity {
  address: string
  farcaster: FarcasterUser | null
  ens: string | null
  basename: string | null
  
  // Computed display properties
  displayName: string
  displayAvatar: string | null
  profileUrl: string | null
  hasVerifiedIdentity: boolean
  identityType: 'farcaster' | 'ens' | 'basename' | 'address'
}

// Cache for combined identity lookups
const identityCache = new Map<string, UserIdentity>()

// Priority order: Farcaster → Basename → ENS → Address
export async function resolveUserIdentity(address: string): Promise<UserIdentity> {
  const cacheKey = address.toLowerCase()
  
  // Check cache first
  if (identityCache.has(cacheKey)) {
    return identityCache.get(cacheKey)!
  }

  // Fetch both Farcaster and ENS data in parallel
  const [farcasterUser, ensData] = await Promise.all([
    getFarcasterUserByAddress(address),
    resolveName(address)
  ])

  // Determine display name and type based on priority
  let displayName: string
  let displayAvatar: string | null = null
  let profileUrl: string | null = null
  let identityType: UserIdentity['identityType']
  let hasVerifiedIdentity: boolean

  if (farcasterUser) {
    // Priority 1: Farcaster
    displayName = farcasterUser.displayName || `@${farcasterUser.username}`
    displayAvatar = farcasterUser.pfpUrl
    profileUrl = `https://warpcast.com/${farcasterUser.username}`
    identityType = 'farcaster'
    hasVerifiedIdentity = true
  } else if (ensData.basename) {
    // Priority 2: Basename
    displayName = ensData.basename
    identityType = 'basename'
    hasVerifiedIdentity = true
  } else if (ensData.ens) {
    // Priority 3: ENS
    displayName = ensData.ens
    identityType = 'ens'
    hasVerifiedIdentity = true
  } else {
    // Priority 4: Address
    displayName = `${address.slice(0, 6)}...${address.slice(-4)}`
    identityType = 'address'
    hasVerifiedIdentity = false
  }

  const identity: UserIdentity = {
    address,
    farcaster: farcasterUser,
    ens: ensData.ens,
    basename: ensData.basename,
    displayName,
    displayAvatar,
    profileUrl,
    hasVerifiedIdentity,
    identityType
  }

  // Cache the result
  identityCache.set(cacheKey, identity)
  return identity
}

// Batch resolve identities for multiple addresses (optimized)
export async function batchResolveIdentities(addresses: string[]): Promise<Map<string, UserIdentity>> {
  const results = new Map<string, UserIdentity>()
  const uncachedAddresses: string[] = []

  // Check cache first
  addresses.forEach(address => {
    const cached = identityCache.get(address.toLowerCase())
    if (cached) {
      results.set(address, cached)
    } else {
      uncachedAddresses.push(address)
    }
  })

  if (uncachedAddresses.length === 0) {
    return results
  }

  // Batch fetch Farcaster and ENS data
  const [farcasterUsers, ensPromises] = await Promise.all([
    batchGetFarcasterUsers(uncachedAddresses),
    Promise.all(uncachedAddresses.map(addr => resolveName(addr)))
  ])

  // Process results
  uncachedAddresses.forEach((address, index) => {
    const farcasterUser = farcasterUsers.get(address) ?? null
    const ensData = ensPromises[index]

    // Determine display properties
    let displayName: string
    let displayAvatar: string | null = null
    let profileUrl: string | null = null
    let identityType: UserIdentity['identityType']
    let hasVerifiedIdentity: boolean

    if (farcasterUser) {
      displayName = farcasterUser.displayName || `@${farcasterUser.username}`
      displayAvatar = farcasterUser.pfpUrl
      profileUrl = `https://farcaster.xyz/${farcasterUser.username}`
      identityType = 'farcaster'
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

    const identity: UserIdentity = {
      address,
      farcaster: farcasterUser,
      ens: ensData.ens,
      basename: ensData.basename,
      displayName,
      displayAvatar,
      profileUrl,
      hasVerifiedIdentity,
      identityType
    }

    results.set(address, identity)
    identityCache.set(address.toLowerCase(), identity)
  })

  return results
}

// Clear all identity caches
export function clearIdentityCache(): void {
  identityCache.clear()
}

// Helper to get identity badge/icon
export function getIdentityBadge(identity: UserIdentity): { icon: string; color: string; tooltip: string } {
  switch (identity.identityType) {
    case 'farcaster':
      return {
        icon: '🟣', // Purple circle for Farcaster
        color: 'text-purple-400',
        tooltip: `Farcaster: @${identity.farcaster?.username}`
      }
    case 'basename':
      return {
        icon: '🔵', // Blue circle for Base
        color: 'text-blue-400',
        tooltip: `Basename: ${identity.basename}`
      }
    case 'ens':
      return {
        icon: '🟢', // Green circle for ENS
        color: 'text-green-400',
        tooltip: `ENS: ${identity.ens}`
      }
    case 'address':
      return {
        icon: '⚫', // Gray circle for address only
        color: 'text-gray-400',
        tooltip: 'No verified identity'
      }
  }
}