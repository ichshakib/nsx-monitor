import React, { useEffect, useState } from 'react'



export const NetworkWidget: React.FC = () => {
  const [down, setDown] = useState(0)
  const [up, setUp] = useState(0)
  const [unit, setUnit] = useState('MB')

  useEffect(() => {
    // Enable transparent body and html
    document.documentElement.classList.add('widget-mode')
    document.body.classList.add('widget-mode')
    
    // Fetch initial unit
    window.ipcRenderer.invoke('get-app-settings').then(s => {
      if (s && s.speedUnit) setUnit(s.speedUnit)
    })

    // Listen for setting changes
    const unlistenSettings = window.ipcRenderer.onAppSettingsUpdate((s: { speedUnit?: string }) => {
      if (s && s.speedUnit) setUnit(s.speedUnit)
    })

    // Disable Native Context Menu on Right Click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    window.addEventListener('contextmenu', handleContextMenu)

    const cleanup = window.ipcRenderer.onNetworkStats((stats: NetworkStats) => {
      setDown(stats.down)
      setUp(stats.up)
    })

    return () => {
      document.documentElement.classList.remove('widget-mode')
      document.body.classList.remove('widget-mode')
      window.removeEventListener('contextmenu', handleContextMenu)
      cleanup()
      unlistenSettings()
    }
  }, [])

  const formatByUnit = (bytes: number, targetUnit: string) => {
    const multipliers: Record<string, number> = {
      'B': 1,
      'KB': 1024,
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024,
      'b': 1/8,
      'Kb': 1024/8,
      'Mb': (1024 * 1024)/8,
      'Gb': (1024 * 1024 * 1024)/8,
      'Tb': (1024 * 1024 * 1024 * 1024)/8
    }
    const val = bytes / (multipliers[targetUnit] || 1)
    
    if (val < 0.01) return `0 ${targetUnit}/s`
    
    if (val >= 1000000) {
      return `${val.toExponential(2).replace('e+', 'e')} ${targetUnit}/s`
    }
    
    return `${val.toFixed(2)} ${targetUnit}/s`
  }

  return (
    <div className="widget-container">
      <div className="widget-row">
        <span>D:</span>
        <span className="widget-value">{formatByUnit(down, unit)}</span>
      </div>
      <div className="widget-row" style={{ marginTop: '2px' }}>
        <span>U:</span>
        <span className="widget-value">{formatByUnit(up, unit)}</span>
      </div>
    </div>
  )
}
