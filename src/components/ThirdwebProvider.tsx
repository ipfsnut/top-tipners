import React from 'react'
import { ThirdwebProvider } from 'thirdweb/react'
import { base } from 'thirdweb/chains'

interface Props {
  children: React.ReactNode
}

const THIRDWEB_CLIENT_ID = import.meta.env.VITE_THIRDWEB_CLIENT_ID

if (!THIRDWEB_CLIENT_ID) {
  console.warn('VITE_THIRDWEB_CLIENT_ID is not set. Some features may not work properly.')
}

export function AppThirdwebProvider({ children }: Props) {
  return (
    <ThirdwebProvider
      clientId={THIRDWEB_CLIENT_ID}
      activeChain={base}
    >
      {children}
    </ThirdwebProvider>
  )
}