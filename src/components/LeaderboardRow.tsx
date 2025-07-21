import React from 'react'
import { ExternalLink } from 'lucide-react'
import { formatTokenAmount, getBaseScanUrl } from '@/utils/format'
import { type DisplayIdentity } from '@/services/cachedIdentityService'
import { getOptimizedPfpUrl } from '@/utils/farcaster'
import type { LeaderboardRowProps } from '@/types'

interface CachedLeaderboardRowProps extends LeaderboardRowProps {
  identity: DisplayIdentity | null
}

const CachedLeaderboardRow: React.FC<CachedLeaderboardRowProps> = ({ staker, index, identity }) => {
  const isLoadingIdentity = !identity

  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
    return 'bg-gray-800 hover:bg-gray-700 group'
  }

  const getRankDisplay = (rank: number): React.ReactNode => {
    if (rank === 1) return <span className="text-2xl">🥇</span>
    if (rank === 2) return <span className="text-2xl">🥈</span>
    if (rank === 3) return <span className="text-2xl">🥉</span>
    return <span className="text-lg">#{rank}</span>
  }

  const getIdentityBadge = () => {
    if (!identity) return null
    
    switch (identity.identityType) {
      case 'farcaster':
        return {
          icon: '🟣',
          color: 'text-purple-400',
          tooltip: `Farcaster: @${identity.farcaster?.username}`
        }
      case 'basename':
        return {
          icon: '🔵',
          color: 'text-blue-400',
          tooltip: `Basename: ${identity.basename}`
        }
      case 'ens':
        return {
          icon: '🟢',
          color: 'text-green-400',
          tooltip: `ENS: ${identity.ens}`
        }
      default:
        return null
    }
  }

  const badge = getIdentityBadge()
  const hasProfilePic = identity?.displayAvatar

  return (
    <tr className={`transition-all duration-200 ${getRankStyle(index + 1)}`}>
      <td className="px-6 py-4 text-center font-bold">
        {getRankDisplay(index + 1)}
      </td>
      
      <td className="px-6 py-4 text-sm">
        <div className="flex items-center gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {hasProfilePic ? (
              <img
                src={getOptimizedPfpUrl(identity!.displayAvatar!, 32)}
                alt={`${identity!.displayName} avatar`}
                className="w-8 h-8 rounded-full border-2 border-gray-600"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                }}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-xs text-gray-300">
                  {identity?.displayName?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
          </div>

          {/* Name and Identity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {/* Identity Badge */}
              {badge && (
                <span
                  className={`text-sm ${badge.color}`}
                  title={badge.tooltip}
                >
                  {badge.icon}
                </span>
              )}

              {/* Display Name */}
              <div className="flex flex-col">
                {identity?.profileUrl ? (
                  <a
                    href={identity.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium hover:text-tipn-secondary transition-colors duration-200 truncate"
                  >
                    <span className={isLoadingIdentity ? 'animate-pulse' : ''}>
                      {identity?.displayName || `${staker.address.slice(0, 6)}...${staker.address.slice(-4)}`}
                    </span>
                  </a>
                ) : (
                  <span className={`font-medium truncate ${isLoadingIdentity ? 'animate-pulse' : ''}`}>
                    {identity?.displayName || `${staker.address.slice(0, 6)}...${staker.address.slice(-4)}`}
                  </span>
                )}

                {/* Address/Blockchain Link */}
                <a
                  href={getBaseScanUrl(staker.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors flex items-center gap-1 font-mono"
                  title={`View on BaseScan: ${staker.address}`}
                >
                  {staker.address.slice(0, 6)}...{staker.address.slice(-4)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Farcaster Bio (for top ranks) */}
            {identity?.farcaster?.bio && index < 10 && (
              <div className="text-xs text-gray-400 mt-1 truncate">
                {identity.farcaster.bio}
              </div>
            )}
          </div>
        </div>
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span className="font-bold text-tipn-primary">
            {formatTokenAmount(staker.amount)} TIPN
          </span>
          
          {/* Follower count for Farcaster users */}
          {identity?.farcaster?.followerCount && identity.farcaster.followerCount > 0 && (
            <span className="text-xs text-gray-400">
              {identity.farcaster.followerCount.toLocaleString()} followers
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

export default CachedLeaderboardRow