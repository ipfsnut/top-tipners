export interface Staker {
  address: string
  amount: bigint
  rank: number
}

export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export interface LeaderboardRowProps {
  staker: Staker
  index: number
}

export interface SearchBarProps {
  searchTerm: string
  onSearchChange: (term: string) => void
}

export interface StatsGridProps {
  totalStakers: number
  totalStaked: bigint
  network: string
}
