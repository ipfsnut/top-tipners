import React from 'react'

const Header: React.FC = () => {
  return (
    <div className="text-center mb-12">
      <div className="mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-tipn-primary rounded-full mb-4">
          <span className="text-3xl font-bold">T</span>
        </div>
      </div>
      <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-4">
        Top Tipners
      </h1>
      <p className="text-xl text-gray-300 mb-2">
        Community Leaderboard - Top 1000 $TIPN Stakers on Base
      </p>
      <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-900/30 border border-blue-500/50 rounded-full text-sm text-blue-300">
        <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
        Community Project - Not Official TIPNEARN Team
      </div>
    </div>
  )
}

export default Header