import React, { useState, useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useTopStakers, forceRefreshStakers } from '@/hooks/useTopStakers'
import Header from './Header'
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
      staker.address.toLowerCase().includes(searchTerm.toLowerCase())
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
      // Optionally show a toast notification here
    } finally {
      setIsManualRefreshing(false)
    }
  }

  const totalStaked = useMemo(() => {
    if (!stakers) return 0n
    return stakers.reduce((sum, staker) => sum + staker.amount, 0n)
  }, [stakers])

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (isError) {
    return <ErrorState onRetry={refetch} />
  }

  if (!stakers || stakers.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Header />
        <div className="text-center">
          <p className="text-xl text-gray-300">No stakers found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Header />
      
      <SearchBar searchTerm={searchTerm} onSearchChange={handleSearchChange} />
      
      <StatsGrid 
        totalStakers={stakers.length}
        totalStaked={totalStaked}
        network="Base"
      />

      {/* Manual Refresh Button */}
      <div className="mb-6 flex justify-center">
        <button
          onClick={handleManualRefresh}
          disabled={isManualRefreshing}
          className="flex items-center gap-2 px-6 py-3 bg-tipn-primary hover:bg-tipn-secondary disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all duration-200 shadow-lg"
        >
          <RefreshCw 
            className={`w-5 h-5 ${isManualRefreshing ? 'animate-spin' : ''}`} 
          />
          {isManualRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Cache Info */}
      <div className="mb-6 text-center text-sm text-gray-400">
        Data is cached for 1 hour to minimize blockchain calls. 
        Use the refresh button above to get the latest data.
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700 border-b border-gray-600">
              <tr>
                <th className="px-6 py-4 text-left font-semibold">Rank</th>
                <th className="px-6 py-4 text-left font-semibold">Address</th>
                <th className="px-6 py-4 text-right font-semibold">Staked Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {paginatedStakers.map((staker, index) => (
                <LeaderboardRow 
                  key={staker.address} 
                  staker={staker} 
                  index={startIndex + index} 
                />
              ))}
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
  )
}

export default Leaderboard