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

// Farcaster types
export interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio?: string
  followerCount?: number
  followingCount?: number
  verifiedAddresses?: string[]
}

export interface UserIdentity {
  address: string
  farcaster: FarcasterUser | null
  ens: string | null
  basename: string | null
  
  // Computed display properties
  displayName: string
  displayAvatar: string | null
  profileUrl: string | null
  hasVerifiedIdentity: boolean
  identityType: 'farcaster' | 'ens' | 'basename' | 'address'
}