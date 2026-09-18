import React, { useState, useEffect } from 'react'
import { FolderOpen, Trash2, ChevronLeft, Bell, Settings } from 'lucide-react'

interface NetworkSettingsProps {
  onBack: () => void;
}

interface AppSettings {
  notificationsEnabled: boolean;
  speedUnit: string;
}

export const NetworkSettings: React.FC<NetworkSettingsProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<AppSettings>({ notificationsEnabled: true, speedUnit: 'MB' })

  useEffect(() => {
    window.ipcRenderer.invoke('get-app-settings').then(setSettings)
  }, [])

  const updateSetting = (key: keyof AppSettings, value: string | boolean) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings as AppSettings)
    window.ipcRenderer.send('save-app-settings', newSettings)
  }

  const toggleNotifications = () => {
    updateSetting('notificationsEnabled', !settings.notificationsEnabled)
  }

  const handleOpenFolder = () => {
    window.ipcRenderer.send('open-database-folder')
  }

  const handleClearData = () => {
    if (confirm('Are you sure you want to clear all network history? This cannot be undone.')) {
      window.ipcRenderer.send('clear-database')
      alert('Database cleared.')
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background font-sans p-5 box-border overflow-y-auto">
      <div className="flex items-center mb-6">
        <button 
          onClick={onBack}
          className="mr-3 p-1 rounded-full hover:bg-accent transition-colors text-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-lg font-bold m-0 text-foreground">Settings</h2>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">Configuration</h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                  <Bell size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">Usage Alerts</div>
                  <div className="text-[11px] text-muted-foreground">Notify when data limits are reached</div>
                </div>
              </div>
              <button 
                onClick={toggleNotifications}
                className={`w-10 h-6 rounded-full transition-all duration-300 relative border-2 ${
                  settings.notificationsEnabled 
                    ? 'bg-primary border-primary' 
                    : 'bg-muted border-muted'
                }`}
              >
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all duration-300 shadow-sm ${
                  settings.notificationsEnabled 
                    ? 'translate-x-4 bg-primary-foreground' 
                    : 'translate-x-0 bg-muted-foreground'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                  <Settings size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">Speed Unit</div>
                  <div className="text-[11px] text-muted-foreground">Unit used for the widget display</div>
                </div>
              </div>
              <select 
                value={settings.speedUnit}
                onChange={(e) => updateSetting('speedUnit', e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="B">B/s</option>
                <option value="KB">KB/s</option>
                <option value="MB">MB/s</option>
                <option value="GB">GB/s</option>
                <option value="TB">TB/s</option>
                <option value="b">b/s</option>
                <option value="Kb">Kb/s</option>
                <option value="Mb">Mb/s</option>
                <option value="Gb">Gb/s</option>
                <option value="Tb">Tb/s</option>
              </select>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">Database Management</h3>
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={handleOpenFolder}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-accent/50 transition-all text-left"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mr-3 text-primary">
                  <FolderOpen size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-foreground">Open Data Folder</div>
                  <div className="text-[11px] text-muted-foreground">View where your history is stored</div>
                </div>
              </div>
            </button>

            <button
              onClick={handleClearData}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-destructive/10 transition-all text-left group"
            >
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center mr-3 text-destructive">
                  <Trash2 size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-medium text-destructive">Clear All History</div>
                  <div className="text-[11px] text-muted-foreground">Delete all recorded network telemetry</div>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section>
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 tracking-wider">About</h3>
          <div className="p-3 rounded-lg bg-accent/30 text-[11px] text-muted-foreground leading-relaxed">
            NSX Monitor provides professional-grade network telemetry for high-precision bandwidth monitoring. 
            It offers deep historical analysis and real-time insights to help you understand your system's data usage across all network interfaces.
          </div>
        </section>
      </div>
    </div>
  )
}
