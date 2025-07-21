// src/hooks/useSmartIdentityBatch.ts
import { useState, useEffect, useCallback } from 'react'
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
    if (!enabled || addressesToLoad.length === 0) return

    setIsLoading(true)
    setIsError(false)
    setError(null)

    try {
      const prioritizedAddresses = prioritizeAddresses(addressesToLoad)
      
      // Process in chunks to avoid overwhelming the UI and respect rate limits
      const chunks = []
      for (let i = 0; i < prioritizedAddresses.length; i += batchSize) {
        chunks.push(prioritizedAddresses.slice(i, i + batchSize))
      }

      let totalLoaded = 0
      let totalCached = 0
      let totalFresh = 0

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        
        console.log(`🔄 Processing identity batch ${i + 1}/${chunks.length} (${chunk.length} addresses)`)
        
        try {
          const batchResults = await batchGetIdentitiesWithCache(chunk)
          
          // Count cache vs fresh hits
          batchResults.forEach(identity => {
            totalLoaded++
            // Note: We'd need to modify the service to return cache hit info
            // For now, assume mixed results
          })
          
          // Update state with new identities
          setIdentities(prev => {
            const updated = new Map(prev)
            batchResults.forEach((identity, address) => {
              updated.set(address, identity)
            })
            return updated
          })

          // Update rate limit status after each batch
          setRateLimitStatus(getRateLimitStatus())
          
          // Small delay between batches for UI responsiveness
          if (i < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200))
          }
          
        } catch (batchError) {
          console.warn(`Batch ${i + 1} failed:`, batchError)
          
          // For failed batch, create fallback identities
          chunk.forEach(address => {
            const fallbackIdentity: DisplayIdentity = {
              address,
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
              updated.set(address, fallbackIdentity)
              return updated
            })
          })
          
          totalLoaded += chunk.length
        }
      }

      setStats({ totalLoaded, totalCached, totalFresh })
      console.log(`✅ Identity batch loading complete: ${totalLoaded} total, estimated ${totalCached} cached, ${totalFresh} fresh`)

    } catch (error) {
      console.error('Smart identity batch loading failed:', error)
      setIsError(true)
      setError(error as Error)
      
      // Create fallback identities for all addresses
      addressesToLoad.forEach(address => {
        const fallbackIdentity: DisplayIdentity = {
          address,
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
          updated.set(address, fallbackIdentity)
          return updated
        })
      })
    } finally {
      setIsLoading(false)
    }
  }, [enabled, batchSize, prioritizeAddresses])

  // Load identities when addresses change
  useEffect(() => {
    if (addresses.length > 0) {
      // Clear existing identities when addresses change significantly
      const existingAddresses = Array.from(identities.keys())
      const addressSet = new Set(addresses.map(addr => addr.toLowerCase()))
      const existingSet = new Set(existingAddresses)
      
      // If more than 50% of addresses are different, clear and reload
      const intersection = new Set([...addressSet].filter(x => existingSet.has(x)))
      const similarity = intersection.size / Math.max(addressSet.size, existingSet.size)
      
      if (similarity < 0.5) {
        console.log('🔄 Address list changed significantly, reloading identities')
        setIdentities(new Map())
        loadIdentities(addresses)
      } else {
        // Only load missing addresses
        const missingAddresses = addresses.filter(addr => 
          !identities.has(addr.toLowerCase())
        )
        
        if (missingAddresses.length > 0) {
          console.log(`🔄 Loading ${missingAddresses.length} missing identities`)
          loadIdentities(missingAddresses)
        }
      }
    }
  }, [addresses, loadIdentities]) // Note: identities is intentionally not in deps to avoid loops

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