import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, getContract, parseAbiItem } from 'viem'
import { BASE_MAINNET, TIPN_CONFIG, TIPN_STAKING_ABI } from '@/config/blockchain'
import type { Staker } from '@/types'

// Create public client for Base mainnet
const publicClient = createPublicClient({
  chain: BASE_MAINNET,
  transport: http()
})

// Function to get all stakers from Transfer events (since this is an ERC20-like staking contract)
const getStakingDataFromTransferEvents = async (): Promise<Staker[]> => {
  console.log('Fetching Transfer events from TIPN staking contract...')
  
  // Get all Transfer events where 'to' is not the zero address (mints/stakes)
  const transferEvents = await publicClient.getLogs({
    address: TIPN_CONFIG.stakingAddress,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock: 'earliest',
    toBlock: 'latest'
  })

  console.log(`Found ${transferEvents.length} transfer events`)

  // Get unique addresses that have received tokens (stakers)
  const uniqueStakers = new Set<string>()
  
  transferEvents.forEach(event => {
    if (event.args?.to && event.args.to !== '0x0000000000000000000000000000000000000000') {
      uniqueStakers.add(event.args.to.toLowerCase())
    }
  })

  console.log(`Found ${uniqueStakers.size} unique staker addresses`)

  if (uniqueStakers.size === 0) {
    throw new Error('No stakers found in Transfer events')
  }

  // Get current balances for all unique stakers
  const contract = getContract({
    address: TIPN_CONFIG.stakingAddress,
    abi: TIPN_STAKING_ABI,
    client: publicClient
  })

  console.log('Fetching current balances...')
  
  const stakersWithBalances = await Promise.all(
    Array.from(uniqueStakers).map(async (address) => {
      const balance = await contract.read.balanceOf([address as `0x${string}`])
      return {
        address,
        amount: balance as bigint,
        rank: 0 // Will be set after sorting
      }
    })
  )

  // Filter out zero balances and sort by amount
  const validStakers = stakersWithBalances
    .filter(staker => staker.amount > 0n)
    .sort((a, b) => (a.amount > b.amount ? -1 : 1))
    .map((staker, index) => ({ ...staker, rank: index + 1 }))
    .slice(0, 1000) // Top 1000

  console.log(`Final result: ${validStakers.length} stakers with non-zero balances`)
  
  if (validStakers.length === 0) {
    throw new Error('No stakers with non-zero balances found')
  }
  
  return validStakers
}

// Alternative method: try to get recent stakers from recent Transfer events
const getRecentStakingData = async (): Promise<Staker[]> => {
  console.log('Trying recent Transfer events method...')
  
  // Get Transfer events from the last 100,000 blocks
  const currentBlock = await publicClient.getBlockNumber()
  const fromBlock = currentBlock - 100000n
  
  const recentTransferEvents = await publicClient.getLogs({
    address: TIPN_CONFIG.stakingAddress,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)'),
    fromBlock,
    toBlock: 'latest'
  })

  console.log(`Found ${recentTransferEvents.length} recent transfer events`)

  if (recentTransferEvents.length === 0) {
    throw new Error('No recent Transfer events found')
  }

  // Get unique recent addresses
  const recentStakers = new Set<string>()
  recentTransferEvents.forEach(event => {
    if (event.args?.to && event.args.to !== '0x0000000000000000000000000000000000000000') {
      recentStakers.add(event.args.to.toLowerCase())
    }
  })

  // Get balances for recent stakers
  const contract = getContract({
    address: TIPN_CONFIG.stakingAddress,
    abi: TIPN_STAKING_ABI,
    client: publicClient
  })

  const stakersWithBalances = await Promise.all(
    Array.from(recentStakers).map(async (address) => {
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

  if (validStakers.length === 0) {
    throw new Error('No recent stakers with non-zero balances found')
  }

  return validStakers
}

export const useTopStakers = () => {
  return useQuery({
    queryKey: ['topStakers', 'real-tipn-data'],
    queryFn: async (): Promise<Staker[]> => {
      console.log('🚀 Fetching real TIPN stakers from Base mainnet...')
      console.log('📍 Staking contract:', TIPN_CONFIG.stakingAddress)
      
      try {
        // Try to get all stakers from Transfer events
        return await getStakingDataFromTransferEvents()
        
      } catch (error) {
        console.warn('⚠️ Failed to fetch all Transfer events, trying recent events:', error)
        
        try {
          // Fallback: try recent Transfer events only
          return await getRecentStakingData()
          
        } catch (recentError) {
          console.error('❌ Failed to fetch recent staking data:', recentError)
          throw new Error(`Unable to fetch TIPN staking data from Base mainnet: ${recentError.message}`)
        }
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60000, // Refetch every minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
} { Staker } from '@/types'

// Mock data generator for development
const generateMockStakers = (): Staker[] => {
  const mockData: Staker[] = []
  for (let i = 0; i < 1000; i++) {
    mockData.push({
      address: `0x${Math.random().toString(16).substr(2, 40)}`,
      amount: BigInt(Math.floor(Math.random() * 1000000) + 1000) * BigInt(10 ** TIPN_CONFIG.decimals),
      rank: i + 1
    })
  }
  return mockData.sort((a, b) => (a.amount > b.amount ? -1 : 1))
}

const publicClient = createPublicClient({
  chain: BASE_MAINNET,
  transport: http()
})

export const useTopStakers = () => {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: async (): Promise<Staker[]> => {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      try {
        // TODO: Replace with actual contract call when ready
        /*
        const data = await publicClient.readContract({
          address: TIPN_CONFIG.stakingAddress,
          abi: TIPN_STAKING_ABI,
          functionName: 'getTopStakers',
          args: [1000n]
        })
        
        return data.map((staker, index) => ({
          address: staker.address,
          amount: staker.amount,
          rank: index + 1
        }))
        */
        
        // Return mock data for now
        return generateMockStakers()
      } catch (error) {
        console.error('Error fetching stakers:', error)
        throw new Error('Failed to fetch staker data')
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}