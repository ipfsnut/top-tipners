import React, { useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTopStakers, forceRefreshStakers } from '@/hooks/useTopStakers'
import SearchBar from './SearchBar'
import StatsGrid from './StatsGrid'
import LeaderboardRow from './LeaderboardRow'
import Pagination from './Pagination'
import LoadingSpinner from './LoadingSpinner'
import ErrorState from './ErrorState'
import Footer from './Footer'

const ITEMS_PER_PAGE = 50

const Leaderboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)
  
  const queryClient = useQueryClient()
  const { data: stakers, isLoading, isError, refetch } = useTopStakers()

  const filteredStakers = useMemo(() => {
    if (!stakers) return []
    if (!searchTerm) return stakers
    
    return stakers.filter(staker => 
      staker.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      staker.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (staker.farcasterUsername && staker.farcasterUsername.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (staker.ensName && staker.ensName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (staker.basename && staker.basename.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  }, [stakers, searchTerm])

  const totalPages = Math.ceil(filteredStakers.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginatedStakers = filteredStakers.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearchChange = (term: string) => {
    setSearchTerm(term)
    setCurrentPage(1) // Reset to first page when searching
  }

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true)
    try {
      console.log('🔄 Manual refresh initiated by user')
      const freshData = await forceRefreshStakers()
      
      // Update the query cache with fresh data
      queryClient.setQueryData(['topStakers'], freshData)
      
      console.log(`✅ Manual refresh complete - ${freshData.length} stakers updated`)
    } catch (error) {
      console.error('❌ Manual refresh failed:', error)
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const totalStaked = useMemo(() => {
    if (!stakers) return 0n
    return stakers.reduce((sum, staker) => sum + staker.amount, 0n)
  }, [stakers])

  // Count verified identities
  const verifiedCount = useMemo(() => {
    if (!stakers) return 0
    return stakers.filter(staker => staker.hasVerifiedIdentity).length
  }, [stakers])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />
  }

  if (!stakers || stakers.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 max-w-7xl">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-16">
            <div className="mb-6 lg:mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-2xl lg:rounded-3xl mb-4 lg:mb-6 shadow-2xl">
                <span className="text-2xl lg:text-4xl font-bold text-white">T</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-3 lg:mb-6 leading-tight">
              Top Tipners
            </h1>
            <p className="text-lg lg:text-xl text-slate-300 mb-4 lg:mb-6 leading-relaxed max-w-2xl mx-auto">
              Community Leaderboard - Top 1000 $TIPN Stakers on Base
            </p>
          </div>
          <div className="text-center">
            <p className="text-xl text-slate-300">No stakers found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 lg:mb-16">
          <div className="mb-4 md:mb-6 lg:mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 lg:w-24 lg:h-24 bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl md:rounded-2xl lg:rounded-3xl mb-3 md:mb-4 lg:mb-6 shadow-2xl">
              <span className="text-lg md:text-2xl lg:text-4xl font-bold text-white">T</span>
            </div>
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent mb-2 md:mb-3 lg:mb-6 leading-tight px-4">
            Top Tipners
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-slate-300 mb-3 md:mb-4 lg:mb-6 leading-relaxed max-w-2xl mx-auto px-4">
            Community Leaderboard - Top 1000 $TIPN Stakers on Base
          </p>
          <div className="flex flex-col gap-2 md:flex-row items-center justify-center md:gap-3 lg:gap-6 text-xs md:text-sm lg:text-base px-4">
            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-sm rounded-full px-3 py-1.5 md:px-4 md:py-2 border border-slate-600/50">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-green-300 font-medium">Live Data</span>
            </div>
            <div className="text-blue-200 bg-blue-900/30 border border-blue-400/30 rounded-full px-3 py-1.5 md:px-4 md:py-2 backdrop-blur-sm text-center">
              Community Project - Not Official TIPNEARN Team
            </div>
          </div>
        </div>

        <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
        
        <StatsGrid 
          totalStakers={stakers.length}
          totalStaked={totalStaked}
          network="Base"
        />

        {/* Manual Refresh Button */}
        <div className="mb-4 md:mb-6 lg:mb-10 flex justify-center px-4">
          <button
            onClick={handleManualRefresh}
            disabled={isManualRefreshing}
            className="flex items-center gap-2 md:gap-3 px-4 md:px-6 lg:px-8 py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg md:rounded-xl lg:rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 text-sm md:text-base lg:text-lg w-full max-w-xs md:w-auto"
          >
            <RefreshCw className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 ${isManualRefreshing ? 'animate-spin' : ''}`} />
            <span className="truncate">{isManualRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
          </button>
        </div>

        {/* Status Info */}
        <div className="mb-4 md:mb-6 text-center text-xs md:text-sm lg:text-base text-slate-400 space-y-2 px-4">
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 border border-slate-700/50">
            <div className="leading-relaxed">
              Staking data cached for 1 hour. Identity data includes Farcaster, ENS, and Basename resolution.
            </div>
          </div>
          <div className="bg-slate-800/30 backdrop-blur-sm rounded-lg md:rounded-xl px-3 md:px-4 py-2 md:py-3 border border-slate-700/50">
            <div className="leading-relaxed">
              <span className="text-purple-300 font-semibold">{verifiedCount}</span> of {stakers.length} stakers have verified identities
              <span className="text-slate-500 block md:inline md:ml-2">(auto-enriching every 2 hours)</span>
            </div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl md:rounded-2xl lg:rounded-3xl shadow-2xl overflow-hidden border border-slate-700/50 mx-2 md:mx-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/70 backdrop-blur-sm border-b border-slate-600/50">
                <tr>
                  <th className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 text-left font-semibold text-slate-200 text-sm md:text-base lg:text-lg">Rank</th>
                  <th className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 text-left font-semibold text-slate-200 text-sm md:text-base lg:text-lg">User</th>
                  <th className="px-2 md:px-4 lg:px-8 py-3 md:py-4 lg:py-6 text-right font-semibold text-slate-200 text-sm md:text-base lg:text-lg">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {paginatedStakers.map((staker, index) => {
                  const actualRank = startIndex + index + 1
                  
                  return (
                    <LeaderboardRow 
                      key={staker.address}
                      staker={staker}
                      rank={actualRank}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <Pagination 
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />

        <Footer />
      </div>
    </div>
  )
}

export default Leaderboard