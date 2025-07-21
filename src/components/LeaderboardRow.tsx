import React from 'react'
import { ExternalLink } from 'lucide-react'
import { formatTokenAmount, getBaseScanUrl } from '@/utils/format'
import { getOptimizedPfpUrl } from '@/utils/farcaster'
import type { StakerWithIdentity, LeaderboardRowProps } from '@/types'

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ staker, rank }) => {
  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
    return 'bg-gray-800 hover:bg-gray-700 group transition-all duration-200'
  }

  const getRankDisplay = (rank: number): React.ReactNode => {
    if (rank === 1) return <span className="text-2xl">🥇</span>
    if (rank === 2) return <span className="text-2xl">🥈</span>
    if (rank === 3) return <span className="text-2xl">🥉</span>
    return <span className="text-lg font-bold">#{rank}</span>
  }

  const getIdentityBadge = () => {
    if (!staker.hasVerifiedIdentity) return null
    
    switch (staker.identityType) {
      case 'farcaster':
        return {
          icon: '🟣',
          color: 'text-purple-400',
          tooltip: `Farcaster: @${staker.farcasterUsername}`
        }
      case 'basename':
        return {
          icon: '🔵',
          color: 'text-blue-400',
          tooltip: `Basename: ${staker.basename}`
        }
      case 'ens':
        return {
          icon: '🟢',
          color: 'text-green-400',
          tooltip: `ENS: ${staker.ensName}`
        }
      default:
        return null
    }
  }

  const badge = getIdentityBadge()

  return (
    <tr className={getRankStyle(rank)}>
      {/* Rank Column */}
      <td className="px-6 py-4 text-center font-bold">
        {getRankDisplay(rank)}
      </td>
      
      {/* User Column */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {staker.farcasterPfpUrl ? (
              <img
                src={getOptimizedPfpUrl(staker.farcasterPfpUrl, 40)}
                alt={`${staker.displayName} avatar`}
                className="w-10 h-10 rounded-full border-2 border-gray-600 object-cover"
                onError={(e) => {
                  // Fallback to placeholder if image fails to load
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.classList.remove('hidden')
                }}
              />
            ) : null}
            
            {/* Fallback placeholder */}
            <div className={`w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center ${staker.farcasterPfpUrl ? 'hidden' : ''}`}>
              <span className="text-sm font-semibold text-gray-300">
                {staker.displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
          </div>

          {/* Name and Identity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {/* Identity Badge */}
              {badge && (
                <span
                  className={`text-sm ${badge.color} flex-shrink-0`}
                  title={badge.tooltip}
                >
                  {badge.icon}
                </span>
              )}

              {/* Display Name */}
              <div className="flex-1 min-w-0">
                {staker.profileUrl ? (
                  <a
                    href={staker.profileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold hover:text-tipn-secondary transition-colors duration-200 truncate block"
                  >
                    {staker.displayName}
                  </a>
                ) : (
                  <span className="font-semibold truncate block">
                    {staker.displayName}
                  </span>
                )}
              </div>
            </div>

            {/* Farcaster Bio (for top 10 ranks) */}
            {staker.farcasterBio && rank <= 10 && (
              <div className="text-xs text-gray-400 mb-1 truncate">
                {staker.farcasterBio}
              </div>
            )}

            {/* Address/Blockchain Link */}
            <div className="flex items-center gap-1">
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
              
              {/* Multiple identity indicators */}
              {staker.hasVerifiedIdentity && (
                <div className="flex items-center gap-1 ml-2">
                  {staker.ensName && staker.identityType !== 'ens' && (
                    <span className="text-xs text-green-400" title={`Also has ENS: ${staker.ensName}`}>
                      🟢
                    </span>
                  )}
                  {staker.basename && staker.identityType !== 'basename' && (
                    <span className="text-xs text-blue-400" title={`Also has Basename: ${staker.basename}`}>
                      🔵
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </td>

      {/* Staked Amount Column */}
      <td className="px-6 py-4 text-right">
        <div className="flex flex-col items-end">
          <span className="font-bold text-tipn-primary text-lg">
            {formatTokenAmount(staker.amount)} TIPN
          </span>
          
          {/* Additional context for Farcaster users */}
          {staker.farcasterUsername && (
            <div className="text-xs text-gray-400 space-y-1">
              {staker.farcasterFollowerCount && staker.farcasterFollowerCount > 0 && (
                <div>
                  {staker.farcasterFollowerCount.toLocaleString()} followers
                </div>
              )}
            </div>
          )}
          
          {/* Verified identity indicator */}
          {staker.hasVerifiedIdentity && (
            <div className="text-xs text-gray-500">
              Verified {staker.identityType}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default LeaderboardRow