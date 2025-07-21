// src/hooks/useTopStakers.ts
import { useQuery } from '@tanstack/react-query'
import { parseAbiItem } from 'viem'
import { executeWithFallback } from '@/utils/rpcClient'
import { supabase } from '@/lib/supabase'
import { TIPN_CONFIG, TIPN_STAKING_ABI } from '@/config/blockchain'
import type { Staker } from '@/types'

// Fetch fresh data from blockchain using the existing config
async function fetchFromBlockchain(): Promise<Staker[]> {
  console.log('🌐 Fetching fresh data from Base blockchain...')
  
  try {
    // Get Transfer events to find all stakers
    const transferEvents = await executeWithFallback(async (client) => {
      return await client.getLogs({
        address: TIPN_CONFIG.stakingAddress,
        event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
        fromBlock: 'earliest',
        toBlock: 'latest'
      })
    })

    console.log(`📄 Found ${transferEvents.length} transfer events`)

    // Extract unique staker addresses
    const uniqueStakers = new Set<string>()
    transferEvents.forEach(event => {
      if (event.args?.to && event.args.to !== '0x0000000000000000000000000000000000000000') {
        uniqueStakers.add(event.args.to.toLowerCase())
      }
    })

    console.log(`👥 Found ${uniqueStakers.size} unique staker addresses`)

    if (uniqueStakers.size === 0) {
      return []
    }

    // Get current balances using multicall for efficiency
    const stakersArray = Array.from(uniqueStakers)
    const batchSize = 100 // Reasonable batch size

    const stakersWithBalances: { address: string; amount: bigint }[] = []

    for (let i = 0; i < stakersArray.length; i += batchSize) {
      const batch = stakersArray.slice(i, i + batchSize)
      
      try {
        const balanceResults = await executeWithFallback(async (client) => {
          return await client.multicall({
            contracts: batch.map(address => ({
              address: TIPN_CONFIG.stakingAddress,
              abi: TIPN_STAKING_ABI,
              functionName: 'balanceOf',
              args: [address as `0x${string}`]
            }))
          })
        })

        // Process results
        balanceResults.forEach((result, index) => {
          if (result.status === 'success') {
            const balance = result.result as bigint
            if (balance > 0n) {
              stakersWithBalances.push({
                address: batch[index],
                amount: balance
              })
            }
          }
        })

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(stakersArray.length / batchSize)}`)
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Batch failed for addresses ${i}-${i + batchSize}:`, error)
        // Continue with next batch rather than failing completely
      }
    }

    // Sort and rank
    const validStakers = stakersWithBalances
      .filter(staker => staker.amount > 0n)
      .sort((a, b) => (a.amount > b.amount ? -1 : 1))
      .map((staker, index) => ({ 
        address: staker.address,
        amount: staker.amount,
        rank: index + 1 
      }))
      .slice(0, 1000)

    console.log(`✅ Found ${validStakers.length} valid stakers`)
    return validStakers

  } catch (error) {
    console.error('Blockchain fetch failed:', error)
    throw error
  }
}

// Save to Supabase
async function saveToSupabase(stakers: Staker[]): Promise<void> {
  try {
    console.log('💾 Saving to Supabase...')
    
    // Clear existing data
    await supabase.from('tipn_stakers').delete().neq('address', '')
    
    // Insert new data
    const stakersToCache = stakers.map(staker => ({
      address: staker.address,
      amount: staker.amount.toString(),
      rank: staker.rank,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase.from('tipn_stakers').insert(stakersToCache)
    if (error) throw error
    
    console.log(`✅ Saved ${stakersToCache.length} stakers to Supabase`)
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
    
    return data.map(cached => ({
      address: cached.address,
      amount: BigInt(cached.amount),
      rank: cached.rank
    }))
  } catch (error) {
    console.error('Failed to load from Supabase:', error)
    throw error
  }
}

// Main fetch function
async function fetchTopStakers(): Promise<Staker[]> {
  try {
    // Try blockchain first
    const freshStakers = await fetchFromBlockchain()
    
    // Save to Supabase in background
    saveToSupabase(freshStakers).catch(error => {
      console.warn('Background save failed:', error)
    })
    
    return freshStakers
    
  } catch (blockchainError) {
    console.warn('Blockchain fetch failed, trying Supabase fallback:', blockchainError)
    
    try {
      const supabaseStakers = await loadFromSupabase()
      console.log(`✅ Loaded ${supabaseStakers.length} stakers from Supabase fallback`)
      return supabaseStakers
    } catch (supabaseError) {
      console.error('Both blockchain and Supabase failed:', supabaseError)
      throw new Error('Unable to fetch staker data from any source')
    }
  }
}

// React Query hook
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchTopStakers,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  })
}

// Manual refresh function
export async function forceRefreshStakers(): Promise<Staker[]> {
  console.log('🔄 Manual refresh triggered...')
  return fetchTopStakers()
}