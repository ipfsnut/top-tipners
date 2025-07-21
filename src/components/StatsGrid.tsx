import React from 'react'
import { formatTokenAmount } from '@/utils/format'
import type { StatsGridProps } from '@/types'

const StatsGrid: React.FC<StatsGridProps> = ({ totalStakers, totalStaked, network }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8 mb-8 lg:mb-12">
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-center shadow-2xl border border-slate-700/50">
        <div className="flex flex-col items-center mb-3 lg:mb-4">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl lg:text-3xl">👥</span>
          </div>
          <div className="text-2xl lg:text-4xl font-bold text-white mb-1">
            {totalStakers.toLocaleString()}
          </div>
        </div>
        <div className="text-slate-200 text-lg lg:text-xl font-medium">Top Stakers</div>
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-center shadow-2xl border border-slate-700/50">
        <div className="flex flex-col items-center mb-3 lg:mb-4">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl lg:text-3xl">💰</span>
          </div>
          <div className="text-2xl lg:text-4xl font-bold text-white mb-1">
            {formatTokenAmount(totalStaked)}
          </div>
        </div>
        <div className="text-slate-200 text-lg lg:text-xl font-medium">Total TIPN Staked</div>
      </div>
      
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl lg:rounded-3xl p-6 lg:p-8 text-center shadow-2xl border border-slate-700/50">
        <div className="flex flex-col items-center mb-3 lg:mb-4">
          <div className="w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl lg:text-3xl">⚡</span>
          </div>
          <div className="text-2xl lg:text-4xl font-bold text-white mb-1">{network}</div>
        </div>
        <div className="text-slate-200 text-lg lg:text-xl font-medium">Network</div>
      </div>
    </div>
  )
}

export default StatsGrid