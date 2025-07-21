import ErrorBoundary from './components/ErrorBoundary'
import Leaderboard from './components/Leaderboard'

function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white">
        <Leaderboard />
      </div>
    </ErrorBoundary>
  )
}

export default App