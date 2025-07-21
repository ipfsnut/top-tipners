import React, { useState, useMemo } from 'react'
import { useTopStakers } from '@/hooks/useTopStakers'
import Header from './Header'
import SearchBar from './SearchBar'
import StatsGrid from './StatsGrid'
import LeaderboardRow from './LeaderboardRow'
import Pagination from './Pagination'
import LoadingSpinner from './LoadingSpinner'
import ErrorState from './ErrorState'
import Footer from './Footer'
import type { Staker } from '@/types'

const ITEMS_PER_PAGE = 50

const Leaderboard: React.FC = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: stakers, isLoading, isError, error, refetch } = useTopStakers()

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