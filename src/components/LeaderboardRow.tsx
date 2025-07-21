import React from 'react'
import { ExternalLink } from 'lucide-react'
import { formatAddress, formatTokenAmount, getBaseScanUrl } from '@/utils/format'
import type { LeaderboardRowProps } from '@/types'

const LeaderboardRow: React.FC<LeaderboardRowProps> = ({ staker, index }) => {
  const getRankStyle = (rank: number): string => {
    if (rank === 1) return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-black'
    if (rank === 2) return 'bg-gradient-to-r from-gray-300 to-gray-500 text-black'
    if (rank === 3) return 'bg-gradient-to-r from-amber-600 to-amber-800 text-white'
    return 'bg-gray-800 hover:bg-gray-700'
  }

  const getRankDisplay = (rank: number): React.ReactNode => {
    if (rank === 1) return <span className="text-2xl">🥇</span>
    if (rank === 2) return <span className="text-2xl">🥈</span>
    if (rank === 3) return <span className="text-2xl">🥉</span>
    return <span className="text-lg">#{rank}</span>
  }

  return (
    <tr className={`transition-all duration-200 ${getRankStyle(index + 1)}`}>
      <td className="px-6 py-4 text-center font-bold">
        {getRankDisplay(index + 1)}
      </td>
      <td className="px-6 py-4 font-mono text-sm">
        <div className="flex items-center gap-2">
          <a 
            href={getBaseScanUrl(staker.address)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-tipn-secondary transition-colors duration-200 flex items-center gap-1"
          >
            {formatAddress(staker.address)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </td>
      <td className="px-6 py-4 text-right font-bold text-tipn-primary">
        {formatTokenAmount(staker.amount)} TIPN
      </td>
    </tr>
  )
}

export default Leaderboard