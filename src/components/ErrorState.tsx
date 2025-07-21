import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface ErrorStateProps {
  onRetry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center bg-red-900/20 border border-red-500 rounded-lg p-8 max-w-md">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <p className="text-xl text-red-400 mb-4">Failed to load leaderboard</p>
        <p className="text-gray-300 mb-6">
          Unable to fetch staker data from the blockchain. Please check your connection and try again.
        </p>
        {onRetry && (
          <button 
            onClick={onRetry}
            className="btn-primary flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorState