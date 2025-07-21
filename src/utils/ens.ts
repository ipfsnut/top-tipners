import { createPublicClient, http } from 'viem'
import { base, mainnet } from 'viem/chains'

// Cache for ENS lookups to avoid repeated calls
const ensCache = new Map<string, string | null>()

// Create clients for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com') // Free Ethereum RPC
})

const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

// Check if address has an ENS name (mainnet)
export async function resolveENS(address: string): Promise<string | null> {
  const cacheKey = `ens_${address.toLowerCase()}`
  
  // Check cache first
  if (ensCache.has(cacheKey)) {
    return ensCache.get(cacheKey) || null
  }

  try {
    const ensName = await mainnetClient.getEnsName({
      address: address as `0x${string}`,
    })

    // Cache the result (including null)
    ensCache.set(cacheKey, ensName)
    return ensName
  } catch (error) {
    console.warn(`ENS lookup failed for ${address}:`, error)
    ensCache.set(cacheKey, null)
    return null
  }
}

// Check if address has a Base name (basename)
export async function resolveBasename(address: string): Promise<string | null> {
  const cacheKey = `base_${address.toLowerCase()}`
  
  // Check cache first
  if (ensCache.has(cacheKey)) {
    return ensCache.get(cacheKey) || null
  }

  try {
    // Base uses the same ENS interface but on Base network
    const baseName = await baseClient.getEnsName({
      address: address as `0x${string}`,
    })

    // Cache the result
    ensCache.set(cacheKey, baseName)
    return baseName
  } catch (error) {
    console.warn(`Basename lookup failed for ${address}:`, error)
    ensCache.set(cacheKey, null)
    return null
  }
}

// Combined function to check both ENS and Basename
export async function resolveName(address: string): Promise<{
  ens: string | null
  basename: string | null
  display: string | null
}> {
  // Run both lookups in parallel
  const [ens, basename] = await Promise.all([
    resolveENS(address),
    resolveBasename(address)
  ])

  // Prefer basename for Base network apps, fallback to ENS
  const display = basename || ens

  return {
    ens,
    basename,
    display
  }
}

// Batch resolve names for multiple addresses (more efficient)
export async function batchResolveName(addresses: string[]): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>()
  
  // Process in batches to avoid overwhelming RPC
  const batchSize = 10
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (address) => {
      const { display } = await resolveName(address)
      return { address, name: display }
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    
    batchResults.forEach((result, index) => {
      const address = batch[index]
      if (result.status === 'fulfilled') {
        results.set(address, result.value.name)
      } else {
        results.set(address, null)
      }
    })
    
    // Small delay between batches to be nice to RPC
    if (i + batchSize < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  return results
}

// Clear cache (useful for manual refresh)
export function clearENSCache(): void {
  ensCache.clear()
}