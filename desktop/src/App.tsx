import { useEffect, useState } from 'react'
import { NetworkDashboard } from './components/NetworkDashboard'
import { NetworkWidget } from './components/NetworkWidget'


function App() {
  const [isWidget, setIsWidget] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('type') === 'widget') {
      setIsWidget(true)
    }
  }, [])

  return (
    <main className={isWidget ? "" : "min-h-screen"}>
      {isWidget ? <NetworkWidget /> : <NetworkDashboard />}
    </main>
  )
}

export default App
