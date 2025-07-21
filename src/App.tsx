// src/App.tsx
import React, { useEffect, useState } from 'react'
import sdk from '@farcaster/frame-sdk'
import ErrorBoundary from './components/ErrorBoundary'
import Leaderboard from './components/Leaderboard'
import FarcasterConnector from './components/FarcasterConnector'

interface FarcasterContext {
  isSDKReady: boolean
  user: any | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  context: any | null
  isFrameContext: boolean
}

export const FarcasterContext = React.createContext<FarcasterContext>({
  isSDKReady: false,
  user: null,
  isConnected: false,
  connect: async () => {},
  disconnect: () => {},
  context: null,
  isFrameContext: false
})

function App() {
  const [isSDKReady, setIsSDKReady] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [context, setContext] = useState<any>(null)
  const [isFrameContext, setIsFrameContext] = useState(false)

  useEffect(() => {
    const initializeFrameSDK = async () => {
      try {
        console.log('🔗 Initializing Farcaster Frame SDK...')
        
        // Check if we're in a Farcaster frame context
        const isInFrame = typeof window !== 'undefined' && window.parent !== window
        setIsFrameContext(isInFrame)
        
        if (isInFrame) {
          console.log('📱 Detected frame environment')
          
          // Get the frame context - this returns a Promise
          const frameContext = await sdk.context
          console.log('📱 Farcaster context:', frameContext)
          
          setContext(frameContext)
          
          // Check if we have user data from the frame context
          if (frameContext?.user) {
            console.log('✅ User authenticated via Farcaster frame:', frameContext.user)
            setUser(frameContext.user)
            setIsConnected(true)
          }
        } else {
          console.log('🌐 Running in regular browser (not in frame)')
        }
        
        setIsSDKReady(true)
        
      } catch (error) {
        console.warn('⚠️ Frame SDK initialization failed (likely not in Farcaster frame):', error)
        setIsSDKReady(true) // Still proceed for web users
      }
    }

    initializeFrameSDK()
  }, [])

  const connect = async () => {
    try {
      console.log('🔗 Attempting to connect wallet...')
      
      // Check if we have wallet functionality
      if (sdk.wallet && sdk.wallet.ethProvider) {
        console.log('💰 Wallet provider available')
        
        // Request account access
        const accounts = await sdk.wallet.ethProvider.request({
          method: 'eth_requestAccounts'
        })
        
        if (accounts && accounts.length > 0) {
          console.log('✅ Wallet connected:', accounts[0])
          setIsConnected(true)
          
          // You might want to store the connected address
          // setConnectedAddress(accounts[0])
        }
      } else {
        console.log('ℹ️ No wallet functionality available in this context')
        // For regular browsers, you might want to show a message or redirect
        alert('Please open this app in Warpcast or connect through a Web3 wallet')
      }
      
    } catch (error) {
      console.error('❌ Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setUser(null)
    console.log('🔌 Disconnected')
  }

  const contextValue: FarcasterContext = {
    isSDKReady,
    user,
    isConnected,
    connect,
    disconnect,
    context,
    isFrameContext
  }

  if (!isSDKReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-400 mb-4 mx-auto"></div>
          <p className="text-xl text-slate-300">Loading Farcaster Mini App...</p>
          <p className="text-sm text-slate-500 mt-2">Initializing Frame SDK</p>
        </div>
      </div>
    )
  }

  return (
    <FarcasterContext.Provider value={contextValue}>
      <ErrorBoundary>
        <div className="min-h-screen bg-slate-900 text-white">
          <FarcasterConnector />
          <Leaderboard />
        </div>
      </ErrorBoundary>
    </FarcasterContext.Provider>
  )
}

export default App