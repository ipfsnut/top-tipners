import React from 'react'

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-tipn-primary mb-4 mx-auto"></div>
        <p className="text-xl text-gray-300">Loading Top Tipners...</p>
        <p className="text-sm text-gray-500 mt-2">Fetching staker data from Base mainnet</p>
      </div>
    </div>
  )
}

export default LoadingSpinner