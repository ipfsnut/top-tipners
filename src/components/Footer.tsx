import React from 'react'
import { ExternalLink, Github } from 'lucide-react'

const Footer: React.FC = () => {
  return (
    <div className="mt-16 text-center text-gray-400">
      <div className="border-t border-gray-700 pt-8">
        <p className="mb-4">
          This is a <strong className="text-tipn-primary">community-built</strong> project and is not affiliated with the official TIPNEARN team.
        </p>
        <div className="flex flex-wrap justify-center items-center gap-6 text-sm mb-4">
          <a 
            href="https://base.org" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-tipn-primary transition-colors flex items-center gap-1"
          >
            Built on Base ⚡
            <ExternalLink className="w-3 h-3" />
          </a>
          <span className="text-gray-600">•</span>
          <span>Data updates every 30 seconds</span>
          <span className="text-gray-600">•</span>
          <span>Open Source Community Project</span>
        </div>
        <div className="flex justify-center items-center gap-4 text-xs text-gray-500">
          <span>© 2025 Community Contributors</span>
          <a 
            href="https://github.com/your-repo/top-tipners" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-tipn-primary transition-colors flex items-center gap-1"
          >
            <Github className="w-4 h-4" />
            View Source
          </a>
        </div>
      </div>
    </div>
  )
}

export default Footer