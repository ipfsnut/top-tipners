// src/utils/rpcClient.ts
import { createPublicClient, http } from 'viem'
import { base } from 'viem/chains'

// Multiple Base RPC endpoints for redundancy
const BASE_RPC_URLS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-mainnet.public.blastapi.io',
  'https://1rpc.io/base',
  'https://base.blockpi.network/v1/rpc/public',
  'https://base.meowrpc.com',
] as const

// Create a single client factory to avoid type conflicts
function createBaseClient(rpcUrl: string) {
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl, {
      timeout: 15000,
      retryCount: 1,
    })
  })
}

let currentRpcIndex = 0
const failedRpcs = new Set<number>()

// Get next working RPC URL
function getNextRpcUrl(): string {
  const maxAttempts = BASE_RPC_URLS.length
  let attempts = 0

  while (attempts < maxAttempts) {
    if (!failedRpcs.has(currentRpcIndex)) {
      return BASE_RPC_URLS[currentRpcIndex]
    }
    currentRpcIndex = (currentRpcIndex + 1) % BASE_RPC_URLS.length
    attempts++
  }

  // Reset failed RPCs if all have failed
  if (failedRpcs.size === BASE_RPC_URLS.length) {
    failedRpcs.clear()
  }
  
  return BASE_RPC_URLS[0]
}

// Mark RPC as failed
function markRpcAsFailed(index: number) {
  failedRpcs.add(index)
  console.warn(`RPC ${BASE_RPC_URLS[index]} marked as failed`)
  
  // Reset after 5 minutes
  setTimeout(() => {
    failedRpcs.delete(index)
  }, 5 * 60 * 1000)
}

// Execute operation with automatic failover
export async function executeWithFallback<T>(
  operation: (client: ReturnType<typeof createBaseClient>) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const rpcUrl = getNextRpcUrl()
    const client = createBaseClient(rpcUrl)
    
    try {
      // Quick health check first
      await client.getBlockNumber()
      
      // Execute the actual operation
      const result = await operation(client)
      
      // Success - move to next RPC for load balancing
      currentRpcIndex = (currentRpcIndex + 1) % BASE_RPC_URLS.length
      return result
      
    } catch (error) {
      lastError = error as Error
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      console.warn(`RPC ${rpcUrl} attempt ${attempt + 1} failed:`, errorMsg)
      
      // Mark RPC as failed if it's a server/connection error
      if (errorMsg.includes('503') || 
          errorMsg.includes('502') || 
          errorMsg.includes('timeout') || 
          errorMsg.includes('fetch failed')) {
        markRpcAsFailed(currentRpcIndex)
      }
      
      // Move to next RPC
      currentRpcIndex = (currentRpcIndex + 1) % BASE_RPC_URLS.length
      
      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      }
    }
  }

  throw new Error(`All RPC attempts failed. Last error: ${lastError?.message}`)
}

// Export a simple client for backward compatibility
export const robustClient = createBaseClient(BASE_RPC_URLS[0])