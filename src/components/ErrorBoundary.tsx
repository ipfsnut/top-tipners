// src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error
    }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo)
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <div className="max-w-lg w-full text-center">
            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-8">
              <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-6" />
              
              <h1 className="text-2xl font-bold text-red-400 mb-4">
                Something went wrong
              </h1>
              
              <p className="text-gray-300 mb-6">
                The application encountered an error. This might be due to blockchain connectivity issues.
              </p>

              <div className="bg-gray-800 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm text-gray-300 font-mono">
                  {this.state.error?.message || 'Unknown error'}
                </p>
              </div>

              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-tipn-primary hover:bg-tipn-secondary text-white font-semibold rounded-lg transition-colors mx-auto"
              >
                <RefreshCw className="w-5 h-5" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary