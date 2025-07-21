import React from 'react'
import { Search } from 'lucide-react'
import type { SearchBarProps } from '@/types'

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => {
  return (
    <div className="mb-8">
      <div className="relative max-w-md mx-auto">
        <input
          type="text"
          placeholder="Search by address..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-3 pl-12 bg-gray-800 border border-gray-600 rounded-lg focus:border-tipn-primary focus:outline-none focus:ring-2 focus:ring-tipn-primary/20 transition-all duration-200"
        />
        <div className="absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
      </div>
    </div>
  )
}

export default SearchBar