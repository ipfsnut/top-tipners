// Basic staker interface (original)
export interface Staker {
  address: string
  amount: bigint
  rank: number
}

// Extended staker interface with identity data (NEW - replaces separate identity interfaces)
export interface StakerWithIdentity {
  // Core staker data
  address: string
  amount: bigint
  rank: number
  
  // Identity data (embedded in same object)
  displayName: string
  farcasterUsername?: string
  farcasterDisplayName?: string
  farcasterPfpUrl?: string
  farcasterBio?: string
  farcasterFollowerCount?: number
  ensName?: string
  basename?: string
  hasVerifiedIdentity: boolean
  identityType: 'farcaster' | 'ens' | 'basename' | 'address'
  profileUrl?: string
}

// Component prop interfaces
export interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}

export interface LeaderboardRowProps {
  staker: StakerWithIdentity
  rank: number
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

// Legacy Farcaster types (still used by utils)
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

// Legacy identity interface (deprecated - use StakerWithIdentity instead)
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