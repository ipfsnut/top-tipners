import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, getContract, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { supabase } from '@/lib/supabase'
import type { Staker } from '@/types'

// TIPN Contract Configuration
const TIPN_STAKING_ADDRESS = '0x715e56a9a4678c21f23513de9d637968d495074a'

// TIPN Staking Contract ABI
const TIPN_STAKING_ABI = [
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"}
] as const

// Base RPC client
const publicClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

// Fetch fresh data from blockchain
async function fetchFromBlockchain(): Promise<Staker[]> {
  console.log('🌐 Fetching fresh data from Base blockchain...')
  
  // Get all Transfer events to find stakers
  const transferEvents = await publicClient.getLogs({
    address: TIPN_STAKING_ADDRESS,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock: 'earliest',
    toBlock: 'latest'
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

  // Get current balances
  const contract = getContract({
    address: TIPN_STAKING_ADDRESS,
    abi: TIPN_STAKING_ABI,
    client: publicClient
  })

  const stakersWithBalances = await Promise.all(
    Array.from(uniqueStakers).map(async (address) => {
      const balance = await contract.read.balanceOf([address as `0x${string}`])
      return {
        address,
        amount: balance as bigint,
        rank: 0
      }
    })
  )

  // Filter, sort, and rank
  const validStakers = stakersWithBalances
    .filter(staker => staker.amount > 0n)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1))
    .map((staker, index) => ({ ...staker, rank: index + 1 }))
    .slice(0, 1000)

  console.log(`✅ Found ${validStakers.length} stakers with balances`)
  return validStakers
}

// Save to Supabase
async function saveToSupabase(stakers: Staker[]): Promise<void> {
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
}

// Load from Supabase fallback
async function loadFromSupabase(): Promise<Staker[]> {
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
}

// Main fetch function
async function fetchTopStakers(): Promise<Staker[]> {
  try {
    // Always try blockchain first
    const freshStakers = await fetchFromBlockchain()
    
    // Save to Supabase in background
    saveToSupabase(freshStakers).catch(error => {
      console.warn('Failed to save to Supabase:', error)
    })
    
    return freshStakers
    
  } catch (blockchainError) {
    console.warn('Blockchain fetch failed:', blockchainError)
    console.log('🔄 Falling back to Supabase data...')
    
    try {
      const supabaseStakers = await loadFromSupabase()
      console.log(`✅ Loaded ${supabaseStakers.length} stakers from Supabase`)
      return supabaseStakers
    } catch (supabaseError) {
      console.error('Supabase fallback failed:', supabaseError)
      throw new Error('Both blockchain and Supabase failed')
    }
  }
}

// React Query hook
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchTopStakers,
    staleTime: 0, // Always refetch on mount
    gcTime: 5 * 60 * 1000, // 5 minutes
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