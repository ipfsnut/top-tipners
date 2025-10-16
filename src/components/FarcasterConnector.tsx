// src/components/FarcasterConnector.tsx
import React, { useContext, useState, useEffect } from 'react'
import { User, Crown } from 'lucide-react'
import { FarcasterContext } from '../App'

const FarcasterConnector: React.FC = () => {
  const { isSDKReady, user, isConnected } = useContext(FarcasterContext)
  const [userPosition, setUserPosition] = useState<{ rank: number; amount: string } | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  // Check user's position in leaderboard when connected
  useEffect(() => {
    if (user?.verifiedAddresses?.ethAddresses?.length > 0) {
      findUserPosition(user.verifiedAddresses.ethAddresses[0])
    } else if (user?.custodyAddress) {
      // Fallback to custody address if no verified addresses
      findUserPosition(user.custodyAddress)
    }
  }, [user])

  const findUserPosition = async (address: string) => {
    setIsSearching(true)
    try {
      // This would integrate with your existing staker data
      // For now, we'll simulate checking the leaderboard
      console.log('🔍 Searching for user position:', address)
      
      // In a real implementation, you'd query your Supabase data
      // const { data } = await supabase.from('tipn_stakers').select('rank, amount').eq('address', address.toLowerCase()).single()
      
      // Simulate search delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // For demo purposes, generate a random position
      const mockRank = Math.floor(Math.random() * 1000) + 1
      const mockAmount = (Math.random() * 100000).toFixed(2)
      
      setUserPosition({ rank: mockRank, amount: mockAmount })
    } catch (error) {
      console.log('ℹ️ User not found in top 1000 stakers')
      setUserPosition(null)
    } finally {
      setIsSearching(false)
    }
  }

  if (!isSDKReady) return null

  // Don't show connector if user is already authenticated via Farcaster context
  if (user && !isConnected) {
    return (
      <div className="bg-purple-900/20 border-b border-purple-500/30">
        <div className="container mx-auto px-4 py-3 max-w-7xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-purple-200">
                  Welcome, @{user.username || 'Farcaster User'}!
                </p>
                <p className="text-xs text-purple-300">
                  Connected via Farcaster
                </p>
              </div>
            </div>
            
            {user.verifiedAddresses?.ethAddresses?.length > 0 && (
              <div className="flex items-center gap-2">
                {isSearching ? (
                  <div className="text-sm text-purple-300">Checking your rank...</div>
                ) : userPosition ? (
                  <div className="bg-purple-800/50 rounded-lg px-3 py-1">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium text-white">
                        Rank #{userPosition.rank}
                      </span>
                      <span className="text-xs text-purple-300">
                        {userPosition.amount} TIPN
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-purple-400">
                    Not in top 1000
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Optional: Show minimal notice for web users (don't require connection)
  if (!user) {
    return (
      <div className="bg-slate-800/30 border-b border-slate-700/30">
        <div className="container mx-auto px-4 py-2 max-w-7xl">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
            <p className="text-sm text-slate-400">
              💡 For wallet connection & personalized rank, open in 
            </p>
            <a
              href="https://warpcast.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-purple-400 hover:text-purple-300 underline"
            >
              Warpcast
            </a>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default FarcasterConnector