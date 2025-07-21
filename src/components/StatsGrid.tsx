import React from 'react'
import { formatTokenAmount } from '@/utils/format'
import type { StatsGridProps } from '@/types'

const StatsGrid: React.FC<StatsGridProps> = ({ totalStakers, totalStaked, network }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-tipn-primary mb-2">
          {totalStakers.toLocaleString()}
        </div>
        <div className="text-gray-300">Total Stakers</div>
      </div>
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-tipn-primary mb-2">
          {formatTokenAmount(totalStaked)}
        </div>
        <div className="text-gray-300">Total TIPN Staked</div>
      </div>
      <div className="card p-6 text-center">
        <div className="text-3xl font-bold text-tipn-primary mb-2">{network}</div>
        <div className="text-gray-300">Network</div>
      </div>
    </div>
  )
}

export default StatsGrid