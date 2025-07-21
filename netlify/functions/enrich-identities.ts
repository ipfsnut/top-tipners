// netlify/functions/enrich-identities.ts
import { Handler } from '@netlify/functions'

// Type definitions
interface Staker {
  address: string
  rank: number
}

interface FarcasterUser {
  fid: number
  username: string
  displayName: string
  pfpUrl: string
  bio: string
  followerCount: number
}

interface UpdateData {
  fid: number | null
  farcaster_username: string | null
  farcaster_display_name: string | null
  farcaster_pfp_url: string | null
  farcaster_bio: string | null
  farcaster_follower_count: number
  farcaster_following_count: number
  ens_name: string | null
  basename: string | null
  has_verified_identity: boolean
  identity_type: string
  display_name: string
  profile_url: string | null
  identity_last_updated: string
}

// Simple, reliable background enrichment
export const handler: Handler = async (event, context) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
  const neynarApiKey = process.env.VITE_NEYNAR_API_KEY

  console.log('🔍 Environment check:', {
    hasSupabaseUrl: !!supabaseUrl,
    hasSupabaseKey: !!supabaseAnonKey,
    hasNeynarKey: !!neynarApiKey
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Missing Supabase environment variables' })
    }
  }

  if (!neynarApiKey) {
    console.log('⚠️ No Neynar API key - will skip Farcaster lookups')
  }

  try {
    console.log('🔄 Scheduled identity enrichment starting...')
    
    // Get 3 stakers that need enrichment
    const supabaseResponse = await fetch(
      `${supabaseUrl}/rest/v1/tipn_stakers?select=address,rank&or=(identity_last_updated.is.null,has_verified_identity.eq.false)&order=rank.asc&limit=3`,
      {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!supabaseResponse.ok) {
      const errorText = await supabaseResponse.text()
      console.error('Supabase error:', supabaseResponse.status, errorText)
      throw new Error(`Supabase error: ${supabaseResponse.status} - ${errorText}`)
    }

    const stakersToEnrich = (await supabaseResponse.json()) as Staker[]
    console.log(`📊 Found ${stakersToEnrich.length} stakers to enrich`)
    
    if (!stakersToEnrich || stakersToEnrich.length === 0) {
      console.log('✅ All stakers already enriched')
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'All stakers already enriched', enriched: 0 })
      }
    }

    let enriched = 0
    
    for (const staker of stakersToEnrich) {
      try {
        console.log(`🔍 Enriching rank #${staker.rank}: ${staker.address}`)
        
        // Try Farcaster lookup (only if API key available)
        let farcasterUser: FarcasterUser | null = null
        if (neynarApiKey) {
          try {
            const farcasterResponse = await fetch(
              `https://api.neynar.com/v2/farcaster/user/bulk-by-address?addresses=${staker.address}`,
              {
                headers: {
                  'accept': 'application/json',
                  'api_key': neynarApiKey,
                },
              }
            )

            if (farcasterResponse.ok) {
              const farcasterData: any = await farcasterResponse.json()
              const addressData = farcasterData[staker.address.toLowerCase()]
              if (addressData && addressData.length > 0) {
                const userData = addressData[0]
                farcasterUser = {
                  fid: userData.fid,
                  username: userData.username,
                  displayName: userData.display_name || userData.username,
                  pfpUrl: userData.pfp_url || '',
                  bio: userData.profile?.bio?.text || '',
                  followerCount: userData.follower_count || 0,
                }
                console.log(`✨ Found Farcaster user: ${farcasterUser.displayName}`)
              }
            } else {
              console.log(`ℹ️ Farcaster API returned ${farcasterResponse.status} for ${staker.address}`)
            }
          } catch (farcasterError: any) {
            console.log(`ℹ️ No Farcaster account for ${staker.address}:`, farcasterError?.message || 'Unknown error')
          }
        }

        // Try ENS lookup using public RPC
        let ensName: string | null = null
        try {
          // Use a simple ENS reverse lookup
          const ensResponse = await fetch('https://eth.llamarpc.com', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_call',
              params: [{
                to: '0xa2c122be93b0074270ebee7f6b7292c7deb45047', // ENS Reverse Registrar
                data: `0x691f3431000000000000000000000000${staker.address.slice(2).toLowerCase()}`
              }, 'latest'],
              id: 1
            })
          })
          
          if (ensResponse.ok) {
            const ensData: any = await ensResponse.json()
            if (ensData.result && ensData.result !== '0x' && ensData.result.length > 2) {
              // This would need proper decoding, but for now we'll skip ENS
              console.log(`ℹ️ ENS lookup not implemented yet for ${staker.address}`)
            }
          }
        } catch (ensError: any) {
          console.log(`ℹ️ ENS lookup failed for ${staker.address}:`, ensError?.message || 'Unknown error')
        }

        // Determine identity
        let displayName: string
        let identityType: string
        let hasVerifiedIdentity: boolean
        let profileUrl: string | null = null

        if (farcasterUser) {
          displayName = farcasterUser.displayName
          identityType = 'farcaster'
          hasVerifiedIdentity = true
          profileUrl = `https://warpcast.com/${farcasterUser.username}`
        } else if (ensName) {
          displayName = ensName
          identityType = 'ens'
          hasVerifiedIdentity = true
        } else {
          displayName = `${staker.address.slice(0, 6)}...${staker.address.slice(-4)}`
          identityType = 'address'
          hasVerifiedIdentity = false
        }

        // Update database
        const updateData: UpdateData = {
          fid: farcasterUser?.fid || null,
          farcaster_username: farcasterUser?.username || null,
          farcaster_display_name: farcasterUser?.displayName || null,
          farcaster_pfp_url: farcasterUser?.pfpUrl || null,
          farcaster_bio: farcasterUser?.bio || null,
          farcaster_follower_count: farcasterUser?.followerCount || 0,
          farcaster_following_count: 0,
          ens_name: ensName,
          basename: null,
          has_verified_identity: hasVerifiedIdentity,
          identity_type: identityType,
          display_name: displayName,
          profile_url: profileUrl,
          identity_last_updated: new Date().toISOString()
        }

        console.log(`💾 Updating database for ${staker.address}...`)
        
        const updateResponse = await fetch(
          `${supabaseUrl}/rest/v1/tipn_stakers?address=eq.${staker.address}`,
          {
            method: 'PATCH',
            headers: {
              'apikey': supabaseAnonKey,
              'Authorization': `Bearer ${supabaseAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(updateData)
          }
        )

        if (!updateResponse.ok) {
          const errorText = await updateResponse.text()
          console.error('Update error:', updateResponse.status, errorText)
          throw new Error(`Update failed: ${updateResponse.status} - ${errorText}`)
        }

        enriched++
        console.log(`✅ Enriched ${staker.address}: ${displayName} (${identityType})`)
        
        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 2000))
        
      } catch (error: any) {
        console.warn(`Failed to enrich ${staker.address}:`, error?.message || 'Unknown error')
      }
    }

    console.log(`🎉 Enrichment complete: ${enriched} stakers processed`)

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: 'Enrichment completed', 
        enriched,
        total: stakersToEnrich.length,
        timestamp: new Date().toISOString()
      })
    }

  } catch (error: any) {
    console.error('❌ Scheduled enrichment failed:', error)
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Enrichment failed', 
        details: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      })
    }
  }
}