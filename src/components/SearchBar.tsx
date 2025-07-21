import React, { useState, useEffect } from 'react'
import { Search, User, MessageCircle } from 'lucide-react'
import { createPublicClient, http, isAddress } from 'viem'
import { mainnet, base } from 'viem/chains'
import type { SearchBarProps } from '@/types'

// Neynar API for Farcaster username resolution
const NEYNAR_API_KEY = import.meta.env?.VITE_NEYNAR_API_KEY
const NEYNAR_BASE_URL = 'https://api.neynar.com/v2'

// Create clients for ENS resolution
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.llamarpc.com')
})

const baseClient = createPublicClient({
  chain: base,
  transport: http('https://mainnet.base.org')
})

interface SearchHint {
  type: 'farcaster' | 'ens' | 'basename' | 'address' | 'error'
  message: string
  resolvedAddress?: string | null
  avatar?: string | null
}

const SearchBar: React.FC<SearchBarProps> = ({ searchTerm, onSearchChange }) => {
  const [isResolving, setIsResolving] = useState(false)
  const [searchHint, setSearchHint] = useState<SearchHint | null>(null)

  // Debounced search resolution
  useEffect(() => {
    if (!searchTerm || searchTerm.length < 2) {
      setSearchHint(null)
      return
    }

    if (isAddress(searchTerm)) {
      setSearchHint(null)
      return
    }

    const timeoutId = setTimeout(async () => {
      setIsResolving(true)
      await resolveSearchTerm(searchTerm)
      setIsResolving(false)
    }, 500) // 500ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const resolveSearchTerm = async (term: string) => {
    try {
      let resolvedAddress: string | null = null
      let hint: SearchHint | null = null

      // Clean the search term
      const cleanTerm = term.trim().toLowerCase()

      // 1. Try Farcaster username search first (highest priority)
      if (NEYNAR_API_KEY && !cleanTerm.includes('.')) {
        try {
          // Remove @ if user typed it
          const username = cleanTerm.startsWith('@') ? cleanTerm.slice(1) : cleanTerm
          
          const response = await fetch(
            `${NEYNAR_BASE_URL}/farcaster/user/search?q=${encodeURIComponent(username)}&limit=5`,
            {
              headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY,
              },
            }
          )

          if (response.ok) {
            const data = await response.json()
            if (data.result?.users && data.result.users.length > 0) {
              // Find exact match first, then partial match
              let user = data.result.users.find((u: any) => 
                u.username.toLowerCase() === username
              )
              if (!user) {
                user = data.result.users[0] // Fallback to first result
              }

              if (user.verified_addresses?.eth_addresses && user.verified_addresses.eth_addresses.length > 0) {
                resolvedAddress = user.verified_addresses.eth_addresses[0]
                hint = {
                  type: 'farcaster',
                  message: `@${user.username}${user.display_name ? ` (${user.display_name})` : ''}`,
                  resolvedAddress,
                  avatar: user.pfp_url
                }
              } else {
                hint = {
                  type: 'error',
                  message: `Found @${user.username} but no verified address`
                }
              }
            }
          }
        } catch (error) {
          console.warn('Farcaster search failed:', error)
        }
      }

      // 2. Try ENS resolution if Farcaster didn't work
      if (!resolvedAddress && cleanTerm.includes('.')) {
        // Try mainnet ENS first (.eth domains)
        if (cleanTerm.endsWith('.eth') && !cleanTerm.endsWith('.base.eth')) {
          try {
            resolvedAddress = await mainnetClient.getEnsAddress({
              name: cleanTerm as `${string}.eth`,
            })
            if (resolvedAddress) {
              hint = {
                type: 'ens',
                message: `ENS: ${cleanTerm}`,
                resolvedAddress
              }
            }
          } catch (error) {
            console.warn('Mainnet ENS resolution failed:', error)
          }
        }

        // Try Base ENS (basename) - including .base.eth domains
        if (!resolvedAddress) {
          try {
            resolvedAddress = await baseClient.getEnsAddress({
              name: cleanTerm,
            })
            if (resolvedAddress) {
              hint = {
                type: 'basename',
                message: `Basename: ${cleanTerm}`,
                resolvedAddress
              }
            }
          } catch (error) {
            console.warn('Base ENS resolution failed:', error)
          }
        }
      }

      // Set the hint and auto-search if we found an address
      if (hint) {
        setSearchHint(hint)
        if (resolvedAddress) {
          // Automatically search for the resolved address
          onSearchChange(resolvedAddress)
        }
      } else if (cleanTerm.length >= 3) {
        setSearchHint({
          type: 'error',
          message: 'No Farcaster user or ENS name found'
        })
      }

    } catch (error) {
      console.error('Search resolution failed:', error)
      setSearchHint({
        type: 'error',
        message: 'Search failed - please try again'
      })
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    onSearchChange(value)
    
    // Clear hint when user types a significantly different value
    if (searchHint && Math.abs(value.length - searchTerm.length) > 2) {
      setSearchHint(null)
    }
  }

  const getSearchIcon = () => {
    if (isResolving) {
      return <Search className="w-5 h-5 text-purple-400 animate-spin" />
    }
    if (searchHint?.type === 'farcaster') {
      return <MessageCircle className="w-5 h-5 text-purple-400" />
    }
    if (searchHint?.type === 'ens') {
      return <User className="w-5 h-5 text-green-400" />
    }
    if (searchHint?.type === 'basename') {
      return <User className="w-5 h-5 text-blue-400" />
    }
    return <Search className="w-5 h-5 text-slate-400" />
  }

  const getHintIcon = () => {
    switch (searchHint?.type) {
      case 'farcaster':
        return <MessageCircle className="w-4 h-4 text-purple-400" />
      case 'ens':
        return <User className="w-4 h-4 text-green-400" />
      case 'basename':
        return <User className="w-4 h-4 text-blue-400" />
      case 'address':
        return <User className="w-4 h-4 text-slate-400" />
      case 'error':
        return <Search className="w-4 h-4 text-red-400" />
      default:
        return <Search className="w-4 h-4 text-slate-400" />
    }
  }

  const getHintColor = () => {
    switch (searchHint?.type) {
      case 'farcaster':
        return 'text-purple-300'
      case 'ens':
        return 'text-green-300'
      case 'basename':
        return 'text-blue-300'
      case 'error':
        return 'text-red-400'
      default:
        return 'text-slate-300'
    }
  }

  return (
    <div className="mb-6 lg:mb-10">
      <div className="relative max-w-lg mx-auto">
        <input
          type="text"
          placeholder="Search by @username, ENS, or address..."
          value={searchTerm}
          onChange={handleInputChange}
          className="w-full px-4 lg:px-6 py-3 lg:py-4 pl-12 lg:pl-14 bg-slate-800/70 backdrop-blur-sm border border-slate-600/50 rounded-xl lg:rounded-2xl focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-400/30 transition-all duration-200 text-base lg:text-lg text-white placeholder-slate-400"
        />
        <div className="absolute left-4 lg:left-5 top-1/2 transform -translate-y-1/2">
          {getSearchIcon()}
        </div>
        
        {/* Search hint */}
        {searchHint && (
          <div className="absolute top-full left-0 right-0 mt-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm z-10 shadow-lg">
            <div className="flex items-center gap-2">
              {/* Avatar for Farcaster users */}
              {searchHint.avatar && searchHint.type === 'farcaster' ? (
                <img
                  src={searchHint.avatar}
                  alt="Profile"
                  className="w-5 h-5 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
              ) : (
                getHintIcon()
              )}
              
              <span className={getHintColor()}>
                {searchHint.message}
              </span>
              
              {searchHint.resolvedAddress && (
                <span className="text-xs text-slate-500 font-mono ml-auto">
                  {searchHint.resolvedAddress.slice(0, 6)}...{searchHint.resolvedAddress.slice(-4)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Search tips */}
      <div className="text-center mt-2 text-xs text-slate-500">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3 text-purple-400" />
            @dwr.eth
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-green-400" />
            vitalik.eth
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3 text-blue-400" />
            alice.base.eth
          </span>
          <span className="text-slate-600">or 0x1234...</span>
        </div>
      </div>
    </div>
  )
}

export default SearchBar