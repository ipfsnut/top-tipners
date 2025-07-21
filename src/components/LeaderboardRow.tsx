import React from 'react'
import { ExternalLink } from 'lucide-react'
import { formatTokenAmount, getBaseScanUrl } from '@/utils/format'
import { getOptimizedPfpUrl } from '@/utils/farcaster'
import type { LeaderboardRowProps } from '@/types'

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ staker, rank }) => {
  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 text-white'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300/20 to-gray-500/20 border border-gray-400/30 text-white'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600/20 to-amber-800/20 border border-amber-400/30 text-white'
    return 'bg-slate-800/30 hover:bg-slate-700/50 transition-all duration-200 border border-transparent'
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
      <td className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 text-center font-bold">
        <div className="flex items-center justify-center">
          {getRankDisplay(rank)}
        </div>
      </td>
      
      {/* User Column */}
      <td className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Profile Picture */}
          <div className="flex-shrink-0">
            {staker.farcasterPfpUrl ? (
              <img
                src={getOptimizedPfpUrl(staker.farcasterPfpUrl, 32)}
                alt={`${staker.displayName} avatar`}
                className="w-7 h-7 md:w-10 md:h-10 rounded-full border-2 border-slate-600 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement
                  target.style.display = 'none'
                  const fallback = target.nextElementSibling as HTMLElement
                  if (fallback) fallback.classList.remove('hidden')
                }}
              />
            ) : null}
            
            {/* Fallback placeholder */}
            <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full bg-slate-600 flex items-center justify-center ${staker.farcasterPfpUrl ? 'hidden' : ''}`}>
              <span className="text-xs md:text-sm font-semibold text-slate-300">
                {staker.displayName[0]?.toUpperCase() || '?'}
              </span>
            </div>
          </div>

          {/* Name and Identity Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 md:gap-2 mb-0.5 md:mb-1">
              {/* Identity Badge */}
              {badge && (
                <span
                  className={`text-xs md:text-sm ${badge.color} flex-shrink-0`}
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
                    className="font-semibold hover:text-purple-400 transition-colors duration-200 truncate block text-sm md:text-base"
                  >
                    {staker.displayName}
                  </a>
                ) : (
                  <span className="font-semibold truncate block text-sm md:text-base">
                    {staker.displayName}
                  </span>
                )}
              </div>
            </div>

            {/* Farcaster Bio (for top 10 ranks) - Hide on very small screens */}
            {staker.farcasterBio && rank <= 10 && (
              <div className="text-xs text-slate-400 mb-0.5 md:mb-1 truncate hidden sm:block">
                {staker.farcasterBio}
              </div>
            )}

            {/* Address/Blockchain Link */}
            <div className="flex items-center gap-1 flex-wrap">
              <a
                href={getBaseScanUrl(staker.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 font-mono"
                title={`View on BaseScan: ${staker.address}`}
              >
                <span className="hidden sm:inline">{staker.address.slice(0, 6)}...{staker.address.slice(-4)}</span>
                <span className="sm:hidden">{staker.address.slice(0, 4)}...{staker.address.slice(-2)}</span>
                <ExternalLink className="w-2.5 h-2.5 md:w-3 md:h-3" />
              </a>
              
              {/* Multiple identity indicators */}
              {staker.hasVerifiedIdentity && (
                <div className="flex items-center gap-1 ml-1 md:ml-2">
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
      <td className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 text-right">
        <div className="flex flex-col items-end">
          <span className="font-bold text-purple-400 text-sm md:text-base lg:text-lg">
            <span className="hidden sm:inline">{formatTokenAmount(staker.amount)} TIPN</span>
            <span className="sm:hidden">{formatTokenAmount(staker.amount)}</span>
          </span>
          
          {/* Additional context for Farcaster users - Hide on mobile */}
          {staker.farcasterUsername && (
            <div className="text-xs text-slate-400 space-y-1 hidden md:block">
              {staker.farcasterFollowerCount && staker.farcasterFollowerCount > 0 && (
                <div>
                  {staker.farcasterFollowerCount.toLocaleString()} followers
                </div>
              )}
            </div>
          )}
          
          {/* Verified identity indicator */}
          {staker.hasVerifiedIdentity && (
            <div className="text-xs text-slate-500 hidden sm:block">
              Verified {staker.identityType}
            </div>
          )}
        </div>
      </td>
    </tr>
  )
}

export default LeaderboardRow