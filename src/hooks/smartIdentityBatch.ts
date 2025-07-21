// src/hooks/useSmartIdentityBatch.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { batchGetIdentitiesWithCache, getRateLimitStatus, type DisplayIdentity } from '@/services/cachedIdentityService'

interface UseSmartIdentityBatchOptions {
  enabled?: boolean
  batchSize?: number
  priority?: 'top-ranks' | 'all' // Prioritize top ranks for limited API calls
}

interface UseSmartIdentityBatchResult {
  identities: Map<string, DisplayIdentity>
  isLoading: boolean
  isError: boolean
  error: Error | null
  rateLimitStatus: ReturnType<typeof getRateLimitStatus>
  totalLoaded: number
  totalCached: number
  totalFresh: number
}

export function useSmartIdentityBatch(
  addresses: string[],
  options: UseSmartIdentityBatchOptions = {}
): UseSmartIdentityBatchResult {
  const { enabled = true, batchSize = 50, priority = 'top-ranks' } = options
  
  const [identities, setIdentities] = useState<Map<string, DisplayIdentity>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [rateLimitStatus, setRateLimitStatus] = useState(getRateLimitStatus())
  const [stats, setStats] = useState({ totalLoaded: 0, totalCached: 0, totalFresh: 0 })

  // Use refs to prevent infinite loops
  const previousAddressesRef = useRef<string[]>([])
  const isLoadingRef = useRef(false)

  // Update rate limit status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setRateLimitStatus(getRateLimitStatus())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Prioritize addresses based on strategy
  const prioritizeAddresses = useCallback((addresses: string[]): string[] => {
    if (priority === 'top-ranks') {
      // Prioritize first 20 addresses (top ranks), then batch the rest
      const topRanks = addresses.slice(0, 20)
      const remaining = addresses.slice(20)
      return [...topRanks, ...remaining]
    }
    return addresses
  }, [priority])

  // Load identities in smart batches
  const loadIdentities = useCallback(async (addressesToLoad: string[]) => {
    if (!enabled || addressesToLoad.length === 0 || isLoadingRef.current) {
      return
    }

    // Prevent concurrent loads
    isLoadingRef.current = true
    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      console.log(`🔄 Loading identities for ${addressesToLoad.length} addresses`)
      
      const batchResults = await batchGetIdentitiesWithCache(addressesToLoad)
      
      // Update state with new identities
      setIdentities(prev => {
        const updated = new Map(prev)
        batchResults.forEach((identity, address) => {
          updated.set(address.toLowerCase(), identity)
        })
        return updated
      })

      // Update stats
      setStats({
        totalLoaded: batchResults.size,
        totalCached: 0, // Would need to be returned from service
        totalFresh: 0   // Would need to be returned from service
      })

      // Update rate limit status
      setRateLimitStatus(getRateLimitStatus())
      
      console.log(`✅ Identity loading complete: ${batchResults.size} identities processed`)

    } catch (error) {
      console.error('Smart identity batch loading failed:', error)
      setIsError(true)
      setError(error as Error)
      
      // Create fallback identities for all addresses
      addressesToLoad.forEach(address => {
        const fallbackIdentity: DisplayIdentity = {
          address: address.toLowerCase(),
          farcaster: null,
          ens: null,
          basename: null,
          displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
          displayAvatar: null,
          profileUrl: null,
          hasVerifiedIdentity: false,
          identityType: 'address'
        }
        
        setIdentities(prev => {
          const updated = new Map(prev)
          updated.set(address.toLowerCase(), fallbackIdentity)
          return updated
        })
      })
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
    }
  }, [enabled, batchGetIdentitiesWithCache])

  // Check if addresses have meaningfully changed
  const hasAddressesChanged = useCallback((newAddresses: string[], oldAddresses: string[]): boolean => {
    if (newAddresses.length !== oldAddresses.length) return true
    
    const newSet = new Set(newAddresses.map(addr => addr.toLowerCase()))
    const oldSet = new Set(oldAddresses.map(addr => addr.toLowerCase()))
    
    // Check if more than 10% of addresses are different
    const intersection = new Set([...newSet].filter(x => oldSet.has(x)))
    const similarity = intersection.size / Math.max(newSet.size, oldSet.size, 1)
    
    return similarity < 0.9 // Only reload if >10% difference
  }, [])

  // Load identities when addresses change (with proper change detection)
  useEffect(() => {
    if (!enabled || addresses.length === 0) {
      return
    }

    const normalizedAddresses = addresses.map(addr => addr.toLowerCase())
    
    // Check if this is a meaningful change
    if (!hasAddressesChanged(normalizedAddresses, previousAddressesRef.current)) {
      return
    }

    // Only load missing addresses to avoid unnecessary API calls
    const missingAddresses = normalizedAddresses.filter(addr => 
      !identities.has(addr.toLowerCase())
    )

    if (missingAddresses.length > 0) {
      console.log(`🔄 Loading ${missingAddresses.length} missing identities`)
      previousAddressesRef.current = normalizedAddresses
      loadIdentities(missingAddresses)
    } else {
      // All addresses already loaded
      previousAddressesRef.current = normalizedAddresses
    }
  }, [addresses, enabled, hasAddressesChanged, loadIdentities])

  return {
    identities,
    isLoading,
    isError,
    error,
    rateLimitStatus,
    totalLoaded: stats.totalLoaded,
    totalCached: stats.totalCached,
    totalFresh: stats.totalFresh
  }
}

// Helper hook for single address identity loading
export function useSmartIdentity(address: string): {
  identity: DisplayIdentity | null
  isLoading: boolean
  isError: boolean
} {
  const { identities, isLoading, isError } = useSmartIdentityBatch(
    address ? [address] : [],
    { enabled: !!address, batchSize: 1 }
  )

  return {
    identity: identities.get(address?.toLowerCase()) || null,
    isLoading,
    isError
  }
}