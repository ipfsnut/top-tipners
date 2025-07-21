import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, getContract, parseAbiItem } from 'viem'
import { base } from 'viem/chains'
import { createClient } from '@supabase/supabase-js'

// Types
interface Staker {
  address: string
  amount: bigint
  rank: number
}

interface CachedStaker {
  address: string
  amount: string // Stored as string in Supabase
  rank: number
  updated_at: string
}

// TIPN Contract Configuration
const TIPN_STAKING_ADDRESS = '0x715e56a9a4678c21f23513de9d637968d495074a'

// Environment variables (you'll need to set these)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'your-supabase-url'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-supabase-anon-key'
const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID || 'your-thirdweb-client-id'

// TIPN Staking Contract ABI
const TIPN_STAKING_ABI = [
  {"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
  {"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"uint256","name":"tokens","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"token","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"tokens","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"}
] as const

// Create Thirdweb RPC client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(`https://${base.id}.rpc.thirdweb.com/${THIRDWEB_CLIENT_ID}`)
})

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Cache duration (15 minutes)
const CACHE_DURATION_MS = 15 * 60 * 1000

// Check if cached data is still valid
function isCacheValid(timestamp: string): boolean {
  const cacheTime = new Date(timestamp).getTime()
  const now = Date.now()
  return (now - cacheTime) < CACHE_DURATION_MS
}

// Get cached stakers from Supabase
async function getCachedStakers(): Promise<Staker[] | null> {
  try {
    console.log('🗄️ Checking Supabase cache...')
    
    const { data, error } = await supabase
      .from('tipn_stakers')
      .select('*')
      .order('rank', { ascending: true })
      .limit(1000)

    if (error) {
      console.warn('Cache read error:', error.message)
      return null
    }

    if (!data || data.length === 0) {
      console.log('📭 No cached data found')
      return null
    }

    // Check if cache is still valid (using first record timestamp)
    if (!isCacheValid(data[0].updated_at)) {
      console.log('⏰ Cache expired')
      return null
    }

    console.log(`✅ Found ${data.length} cached stakers`)
    
    // Convert cached data back to Staker format
    return data.map((cached: CachedStaker) => ({
      address: cached.address,
      amount: BigInt(cached.amount),
      rank: cached.rank
    }))

  } catch (error) {
    console.warn('Cache error:', error)
    return null
  }
}

// Save stakers to Supabase cache
async function cacheStakers(stakers: Staker[]): Promise<void> {
  try {
    console.log('💾 Saving to Supabase cache...')
    
    // Clear existing cache
    await supabase.from('tipn_stakers').delete().neq('address', '')
    
    // Convert BigInt to string for storage
    const stakersToCache = stakers.map(staker => ({
      address: staker.address,
      amount: staker.amount.toString(),
      rank: staker.rank,
      updated_at: new Date().toISOString()
    }))

    // Insert new data in batches (Supabase has limits)
    const batchSize = 100
    for (let i = 0; i < stakersToCache.length; i += batchSize) {
      const batch = stakersToCache.slice(i, i + batchSize)
      const { error } = await supabase.from('tipn_stakers').insert(batch)
      if (error) {
        console.warn(`Cache batch ${i}-${i + batchSize} error:`, error.message)
      }
    }

    console.log(`✅ Cached ${stakersToCache.length} stakers`)
  } catch (error) {
    console.warn('Cache save error:', error)
  }
}

// Fetch stakers from blockchain using Thirdweb RPC
async function fetchStakersFromBlockchain(): Promise<Staker[]> {
  console.log('🌐 Fetching from Base blockchain via Thirdweb RPC...')
  
  const transferEvents = await publicClient.getLogs({
    address: TIPN_STAKING_ADDRESS,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock: 'earliest',
    toBlock: 'latest'
  })

  console.log(`📄 Found ${transferEvents.length} transfer events`)

  const uniqueStakers = new Set<string>()
  
  transferEvents.forEach(event => {
    if (event.args?.to && event.args.to !== '0x0000000000000000000000000000000000000000') {
      uniqueStakers.add(event.args.to.toLowerCase())
    }
  })

  console.log(`👥 Found ${uniqueStakers.size} unique staker addresses`)

  if (uniqueStakers.size === 0) {
    throw new Error('No stakers found in Transfer events')
  }

  const contract = getContract({
    address: TIPN_STAKING_ADDRESS,
    abi: TIPN_STAKING_ABI,
    client: publicClient
  })

  console.log('💰 Fetching current balances...')
  
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

  const validStakers = stakersWithBalances
    .filter(staker => staker.amount > 0n)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1))
    .map((staker, index) => ({ ...staker, rank: index + 1 }))
    .slice(0, 1000)

  console.log(`✅ Found ${validStakers.length} stakers with balances`)
  
  if (validStakers.length === 0) {
    throw new Error('No stakers with non-zero balances found')
  }
  
  return validStakers
}

// Main fetch function with cache strategy
async function fetchTopStakers(): Promise<Staker[]> {
  // First, try to get cached data
  const cachedStakers = await getCachedStakers()
  if (cachedStakers) {
    console.log('🚀 Using cached data')
    return cachedStakers
  }

  // If no valid cache, fetch from blockchain
  console.log('🔗 Cache miss - fetching from blockchain...')
  const freshStakers = await fetchStakersFromBlockchain()
  
  // Cache the fresh data (don't await - let it happen in background)
  cacheStakers(freshStakers).catch(error => {
    console.warn('Background cache save failed:', error)
  })

  return freshStakers
}

// Hook to fetch top TIPN stakers with Supabase caching
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchTopStakers,
    staleTime: 5 * 60 * 1000, // 5 minutes (less than cache duration)
    refetchInterval: 10 * 60 * 1000, // 10 minutes
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}