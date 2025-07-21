// src/services/ankrTokenService.ts
import type { Staker } from '@/types'

// Environment variable for Ankr API
const ANKR_API_URL = 'https://rpc.ankr.com/multichain'
const ANKR_API_KEY = import.meta.env.VITE_ANKR_API_KEY

// TIPN token contract address on Base
const TIPN_TOKEN_ADDRESS = '0x5ba8d32579a4497c12d327289a103c3ad5b64eb1'

interface AnkrTokenHolder {
  holderAddress: string
  balance: string
  balanceRawInteger: string
}

interface AnkrTokenHoldersResponse {
  result: {
    blockchain: string
    contractAddress: string
    tokenDecimals: number
    holders: AnkrTokenHolder[]
    holdersCount: number
    nextPageToken?: string
  }
}

// Fetch top TIPN token holders from Ankr API
export async function fetchTopTipnHolders(limit: number = 1000): Promise<Staker[]> {
  console.log('🔍 Fetching top TIPN holders from Ankr API...')
  
  if (!ANKR_API_KEY) {
    throw new Error('VITE_ANKR_API_KEY environment variable is required')
  }

  try {
    const response = await fetch(ANKR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANKR_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'ankr_getTokenHolders',
        params: {
          blockchain: 'base',
          contractAddress: TIPN_TOKEN_ADDRESS,
          pageSize: Math.min(limit, 10000), // Ankr max is 10,000
        },
        id: 1,
      }),
    })

    if (!response.ok) {
      throw new Error(`Ankr API error: ${response.status} ${response.statusText}`)
    }

    const data: AnkrTokenHoldersResponse = await response.json()
    
    if (data.result?.holders) {
      const holders = data.result.holders
      console.log(`📊 Found ${holders.length} TIPN token holders`)

      // Convert to our Staker format and sort by balance (already sorted by Ankr)
      const stakers: Staker[] = holders
        .filter(holder => {
          // Filter out zero balances and invalid addresses
          const balance = BigInt(holder.balanceRawInteger || '0')
          return balance > 0n && holder.holderAddress !== '0x0000000000000000000000000000000000000000'
        })
        .slice(0, limit) // Take only the top N
        .map((holder, index) => ({
          address: holder.holderAddress.toLowerCase(),
          amount: BigInt(holder.balanceRawInteger),
          rank: index + 1,
        }))

      console.log(`✅ Processed ${stakers.length} valid TIPN stakers`)
      return stakers
    } else {
      throw new Error('Invalid response format from Ankr API')
    }
  } catch (error) {
    console.error('❌ Failed to fetch TIPN holders from Ankr:', error)
    throw error
  }
}

// Test function to verify API connectivity
export async function testAnkrConnection(): Promise<boolean> {
  try {
    console.log('🧪 Testing Ankr API connection...')
    
    if (!ANKR_API_KEY) {
      console.error('❌ VITE_ANKR_API_KEY not configured')
      return false
    }

    const response = await fetch(ANKR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANKR_API_KEY}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'ankr_getTokenHoldersCount',
        params: {
          blockchain: 'base',
          contractAddress: TIPN_TOKEN_ADDRESS,
        },
        id: 1,
      }),
    })

    if (response.ok) {
      const data = await response.json()
      console.log(`✅ Ankr API test successful. TIPN has ${data.result?.holdersCount} total holders`)
      return true
    } else {
      console.error(`❌ Ankr API test failed: ${response.status}`)
      return false
    }
  } catch (error) {
    console.error('❌ Ankr API test error:', error)
    return false
  }
}