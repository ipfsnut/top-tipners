// netlify/functions/frame.ts
import { Handler, HandlerEvent, HandlerContext, HandlerResponse } from '@netlify/functions'

interface FrameRequest {
  untrustedData: {
    fid: number
    url: string
    messageHash: string
    timestamp: number
    network: number
    buttonIndex: number
    castId: {
      fid: number
      hash: string
    }
  }
  trustedData: {
    messageBytes: string
  }
}

interface FrameResponse {
  image: string
  buttons?: Array<{
    label: string
    action?: 'post' | 'post_redirect' | 'link'
    target?: string
  }>
  input?: {
    text: string
  }
  post_url?: string
  refresh_period?: number
}

interface NeynarValidationResponse {
  valid: boolean
  action: {
    type: string
  }
  interactor: {
    fid: number
    username: string
  }
}

// Farcaster frame message validation using Neynar
async function validateFrameMessage(trustedData: string): Promise<boolean> {
  try {
    const neynarApiKey = process.env.VITE_NEYNAR_API_KEY
    if (!neynarApiKey) {
      console.warn('No Neynar API key - skipping frame validation')
      return true // Allow in development, but log warning
    }

    // Validate frame message with Neynar
    const response = await fetch('https://api.neynar.com/v2/farcaster/frame/validate', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        message_bytes_in_hex: trustedData
      })
    })

    if (response.ok) {
      const validation = await response.json() as NeynarValidationResponse
      return validation.valid === true
    }
    
    return false
  } catch (error) {
    console.error('Frame validation error:', error)
    return false
  }
}

// Types for Neynar API response
interface NeynarUser {
  fid: number
  username: string
  display_name: string
  pfp_url: string
  verified_addresses: {
    eth_addresses: string[]
  }
}

interface NeynarResponse {
  result: {
    user: NeynarUser
  }
}

// Helper to get user's staking position
async function getUserStakingPosition(fid: number): Promise<{ rank: number; amount: string; address: string } | null> {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration')
    }

    // First, get the user's verified addresses from Farcaster
    const neynarApiKey = process.env.VITE_NEYNAR_API_KEY
    if (!neynarApiKey) {
      throw new Error('Missing Neynar API key')
    }

    const userResponse = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      headers: {
        'accept': 'application/json',
        'api_key': neynarApiKey,
      },
    })

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data')
    }

    const userData = await userResponse.json() as NeynarResponse
    const addresses = userData.result?.user?.verified_addresses?.eth_addresses || []
    
    if (addresses.length === 0) {
      return null
    }

    // Check each address in our staking database
    for (const address of addresses) {
      const stakingResponse = await fetch(
        `${supabaseUrl}/rest/v1/tipn_stakers?select=rank,amount,address&address=eq.${address.toLowerCase()}`,
        {
          headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (stakingResponse.ok) {
        const stakingData = await stakingResponse.json() as Array<{
          rank: number
          amount: string
          address: string
        }>
        
        if (stakingData.length > 0) {
          const staker = stakingData[0]
          return {
            rank: staker.rank,
            amount: (BigInt(staker.amount) / BigInt(10**18)).toString(),
            address: staker.address
          }
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error getting user staking position:', error)
    return null
  }
}

// Generate frame image URL
function generateFrameImage(type: 'initial' | 'rank', data?: any): string {
  const baseUrl = 'https://top-tipners.epicdylan.com'
  
  if (type === 'initial') {
    return `${baseUrl}/tipn-frame-image.png`
  }
  
  if (type === 'rank' && data) {
    // Generate dynamic image with user's rank
    // For now, return a static image - you could implement dynamic image generation
    return `${baseUrl}/tipn-rank-frame.png?rank=${data.rank}&amount=${data.amount}`
  }
  
  return `${baseUrl}/tipn-frame-image.png`
}

export const handler: Handler = async (event: HandlerEvent, context: HandlerContext): Promise<HandlerResponse> => {
  // Handle CORS for Frame requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Missing request body' })
      }
    }

    const frameRequest: FrameRequest = JSON.parse(event.body)
    
    // Basic validation
    if (!frameRequest.untrustedData || !frameRequest.trustedData) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid frame request format' })
      }
    }
    
    // Validate the frame message
    const isValid = await validateFrameMessage(frameRequest.trustedData.messageBytes)
    if (!isValid) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid frame message' })
      }
    }

    const { fid, buttonIndex } = frameRequest.untrustedData
    
    if (!fid || typeof fid !== 'number') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ error: 'Invalid or missing FID' })
      }
    }
    
    let frameResponse: FrameResponse

    if (buttonIndex === 2) {
      // "Check My Rank" button was clicked
      const stakingPosition = await getUserStakingPosition(fid)
      
      if (stakingPosition) {
        frameResponse = {
          image: generateFrameImage('rank', stakingPosition),
          buttons: [
            {
              label: 'View Full Leaderboard',
              action: 'link',
              target: 'https://top-tipners.epicdylan.com'
            },
            {
              label: 'Share My Rank',
              action: 'link',
              target: `https://warpcast.com/~/compose?text=I'm rank %23${stakingPosition.rank} on the Top Tipners leaderboard with ${stakingPosition.amount} TIPN staked! 🔥%0A%0ACheck your rank: https://top-tipners.epicdylan.com`
            }
          ]
        }
      } else {
        frameResponse = {
          image: generateFrameImage('initial'),
          buttons: [
            {
              label: 'View Leaderboard',
              action: 'link',
              target: 'https://top-tipners.epicdylan.com'
            },
            {
              label: 'Start Staking TIPN',
              action: 'link',
              target: 'https://top-tipners.epicdylan.com'
            }
          ]
        }
      }
    } else {
      // Default response for button 1 or initial load
      frameResponse = {
        image: generateFrameImage('initial'),
        buttons: [
          {
            label: 'View Leaderboard',
            action: 'link',
            target: 'https://top-tipners.epicdylan.com'
          },
          {
            label: 'Check My Rank',
            action: 'post'
          }
        ],
        post_url: 'https://top-tipners.epicdylan.com/.netlify/functions/frame'
      }
    }

    // Return HTML with proper meta tags for Frame protocol
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta property="fc:frame" content="vNext" />
  <meta property="fc:frame:image" content="${frameResponse.image}" />
  <meta property="fc:frame:image:aspect_ratio" content="1.91:1" />
  ${frameResponse.buttons?.map((button, index) => `
  <meta property="fc:frame:button:${index + 1}" content="${button.label}" />
  ${button.action ? `<meta property="fc:frame:button:${index + 1}:action" content="${button.action}" />` : ''}
  ${button.target ? `<meta property="fc:frame:button:${index + 1}:target" content="${button.target}" />` : ''}
  `).join('') || ''}
  ${frameResponse.post_url ? `<meta property="fc:frame:post_url" content="${frameResponse.post_url}" />` : ''}
  <title>Top Tipners Frame</title>
</head>
<body>
  <h1>Top Tipners - TIPN Staking Leaderboard</h1>
  <p>This frame shows the top TIPN stakers on Base mainnet.</p>
</body>
</html>`

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=30'
      },
      body: html
    }

  } catch (error) {
    console.error('Frame handler error:', error)
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }
}