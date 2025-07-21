import { TIPN_CONFIG } from '@/config/blockchain'

export const formatAddress = (address: string): string => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatTokenAmount = (amount: bigint, decimals: number = TIPN_CONFIG.decimals): string => {
  const divisor = BigInt(10 ** decimals)
  const wholePart = amount / divisor
  const fractionalPart = amount % divisor
  
  if (fractionalPart === 0n) {
    return wholePart.toLocaleString()
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, '0')
  const trimmedFractional = fractionalStr.replace(/0+$/, '')
  
  if (trimmedFractional === '') {
    return wholePart.toLocaleString()
  }
  
  return `${wholePart.toLocaleString()}.${trimmedFractional.slice(0, 4)}`
}

export const getBaseScanUrl = (address: string): string => {
  return `https://basescan.org/address/${address}`
}