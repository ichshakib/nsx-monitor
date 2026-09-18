import React, { useState } from 'react'
import { NetworkHistory } from './NetworkHistory'
import { NetworkSettings } from './NetworkSettings'
import { NetworkWarning } from './NetworkWarning'

import pkg from '../../package.json'

export const NetworkDashboard: React.FC = () => {
  const [activeView, setActiveView] = useState<'History' | 'Settings' | 'Warning'>('History')

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-background text-foreground">
      {/* Custom Title Bar */}
      <div className="h-[30px] flex items-center pl-[10px] select-none [-webkit-app-region:drag]">
        <img src="./logo.svg" alt="logo" className="w-4 h-4 mr-2" />
        <span className="text-xs font-sans text-foreground">NSX Monitor v{pkg.version}</span>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeView === 'History' && <NetworkHistory onNavigate={setActiveView} />}
        {activeView === 'Settings' && <NetworkSettings onBack={() => setActiveView('History')} />}
        {activeView === 'Warning' && <NetworkWarning onBack={() => setActiveView('History')} />}
      </div>
    </div>
  )
}
