import { useQuery } from '@tanstack/react-query'
import { createPublicClient, http, getContract, parseAbiItem } from 'viem'
import { base } from 'viem/chains'

// Types
interface Staker {
  address: string
  amount: bigint
  rank: number
}

// TIPN Contract Configuration
const TIPN_STAKING_ADDRESS = '0x715e56a9a4678c21f23513de9d637968d495074a'

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

// Create Base mainnet client
const publicClient = createPublicClient({
  chain: base,
  transport: http()
})

// Fetch stakers from Transfer events
async function fetchStakersFromEvents(): Promise<Staker[]> {
  console.log('🔍 Fetching Transfer events from TIPN staking contract...')
  
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

  console.log(`✅ Final result: ${validStakers.length} stakers with balances`)
  
  if (validStakers.length === 0) {
    throw new Error('No stakers with non-zero balances found')
  }
  
  return validStakers
}

// Hook to fetch top TIPN stakers
export function useTopStakers() {
  return useQuery({
    queryKey: ['topStakers'],
    queryFn: fetchStakersFromEvents,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60000, // 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}