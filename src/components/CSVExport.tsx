// src/components/CSVExport.tsx
import React, { useState } from 'react'
import { Download, FileText, X } from 'lucide-react'
import type { StakerWithIdentity } from '@/types'

interface CSVExportProps {
  stakers: StakerWithIdentity[]
}

const CSVExport: React.FC<CSVExportProps> = ({ stakers }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [exportCount, setExportCount] = useState(100)
  const [isExporting, setIsExporting] = useState(false)

  const maxRecords = Math.min(stakers.length, 1000)

  const formatTokenAmountForCSV = (amount: bigint): string => {
    const divisor = BigInt(10 ** 18)
    const wholePart = amount / divisor
    const fractionalPart = amount % divisor
    
    if (fractionalPart === 0n) {
      return wholePart.toString()
    }
    
    const fractionalStr = fractionalPart.toString().padStart(18, '0')
    const trimmedFractional = fractionalStr.replace(/0+$/, '')
    
    if (trimmedFractional === '') {
      return wholePart.toString()
    }
    
    return `${wholePart.toString()}.${trimmedFractional.slice(0, 6)}`
  }

  const generateCSV = (stakersToExport: StakerWithIdentity[]): string => {
    // CSV headers
    const headers = [
      'Rank',
      'Address',
      'Display Name',
      'Staked Amount (TIPN)',
      'Has Verified Identity',
      'Identity Type',
      'Farcaster Username',
      'Farcaster Display Name',
      'Farcaster Bio',
      'Farcaster Followers',
      'ENS Name',
      'Basename',
      'Profile URL',
      'BaseScan URL'
    ]

    // Escape CSV field (handle commas, quotes, newlines)
    const escapeCSVField = (field: any): string => {
      if (field == null || field === undefined) return ''
      const str = String(field)
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }

    // Generate CSV rows
    const rows = stakersToExport.map(staker => [
      staker.rank.toString(),
      staker.address,
      escapeCSVField(staker.displayName),
      formatTokenAmountForCSV(staker.amount),
      staker.hasVerifiedIdentity ? 'Yes' : 'No',
      staker.identityType,
      escapeCSVField(staker.farcasterUsername || ''),
      escapeCSVField(staker.farcasterDisplayName || ''),
      escapeCSVField(staker.farcasterBio || ''),
      staker.farcasterFollowerCount?.toString() || '',
      escapeCSVField(staker.ensName || ''),
      escapeCSVField(staker.basename || ''),
      escapeCSVField(staker.profileUrl || ''),
      `https://basescan.org/address/${staker.address}`
    ])

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\n')

    return csvContent
  }

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', filename)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      // Get the top N stakers to export
      const stakersToExport = stakers.slice(0, exportCount)
      
      // Generate CSV content
      const csvContent = generateCSV(stakersToExport)
      
      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const filename = `top-tipners-top${exportCount}-${timestamp}.csv`
      
      // Trigger download
      downloadCSV(csvContent, filename)
      
      console.log(`✅ Exported ${stakersToExport.length} stakers to ${filename}`)
      
      // Close modal
      setIsOpen(false)
      
    } catch (error) {
      console.error('❌ CSV export failed:', error)
      alert('Export failed. Please try again.')
    } finally {
      setIsExporting(false)
    }
  }

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value >= 1 && value <= maxRecords) {
      setExportCount(value)
    }
  }

  const quickSelectCounts = [10, 25, 50, 100, 250, 500, 1000].filter(count => count <= maxRecords)

  return (
    <>
      {/* Export Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 md:gap-3 px-4 md:px-6 lg:px-8 py-2.5 md:py-3 lg:py-4 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-lg md:rounded-xl lg:rounded-2xl transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:-translate-y-0.5 text-sm md:text-base lg:text-lg w-full max-w-xs md:w-auto"
      >
        <Download className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6" />
        <span className="truncate">Export CSV</span>
      </button>

      {/* Export Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-xl md:rounded-2xl p-6 md:p-8 max-w-md w-full border border-slate-700 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Export CSV</h3>
                  <p className="text-sm text-slate-400">Download staker data</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Export Options */}
            <div className="space-y-6">
              {/* Record Count Input */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-2">
                  Number of records to export
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={maxRecords}
                    value={exportCount}
                    onChange={handleCountChange}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/30 transition-all duration-200 text-white"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">
                    / {maxRecords}
                  </div>
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div>
                <label className="block text-sm font-medium text-slate-200 mb-3">
                  Quick select
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {quickSelectCounts.map(count => (
                    <button
                      key={count}
                      onClick={() => setExportCount(count)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        exportCount === count
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview Info */}
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h4 className="text-sm font-medium text-slate-200 mb-2">Export Preview</h4>
                <ul className="text-xs text-slate-400 space-y-1">
                  <li>• Ranks 1-{exportCount} stakers</li>
                  <li>• All identity data (Farcaster, ENS, Basename)</li>
                  <li>• Staked amounts in TIPN tokens</li>
                  <li>• Profile URLs and blockchain links</li>
                  <li>• File: top-tipners-top{exportCount}-{new Date().toISOString().split('T')[0]}.csv</li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default CSVExport