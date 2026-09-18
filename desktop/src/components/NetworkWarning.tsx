import React, { useState, useEffect } from 'react'
import { Bell, ChevronLeft, Plus, X, AlertTriangle } from 'lucide-react'

interface UsageLimit {
  id: string;
  type: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  value: number;
  enabled: boolean;
}

interface NetworkWarningProps {
  onBack: () => void;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export const NetworkWarning: React.FC<NetworkWarningProps> = ({ onBack }) => {
  const [limits, setLimits] = useState<UsageLimit[]>([])
  const [isAdding, setIsAdding] = useState(false)
  const [newType, setNewType] = useState<UsageLimit['type']>('Daily')
  const [newValue, setNewValue] = useState('')
  const [newUnit, setNewUnit] = useState('GB')

  useEffect(() => {
    window.ipcRenderer.invoke('get-usage-limits').then((saved: UsageLimit[]) => {
      setLimits(saved || [])
    })
  }, [])

  const handleSave = (updated: UsageLimit[]) => {
    setLimits(updated)
    window.ipcRenderer.send('save-usage-limits', updated)
  }

  const addLimit = () => {
    const numericValue = parseFloat(newValue)
    if (isNaN(numericValue) || numericValue <= 0) return

    const multipliers: Record<string, number> = {
      'MB': 1024 * 1024,
      'GB': 1024 * 1024 * 1024,
      'TB': 1024 * 1024 * 1024 * 1024
    }

    const bytes = numericValue * multipliers[newUnit]
    const newLimit: UsageLimit = {
      id: Date.now().toString(),
      type: newType,
      value: bytes,
      enabled: true
    }

    const updated = [...limits, newLimit]
    handleSave(updated)
    setIsAdding(false)
    setNewValue('')
  }

  const deleteLimit = (id: string) => {
    const updated = limits.filter(l => l.id !== id)
    handleSave(updated)
  }

  const toggleLimit = (id: string) => {
    const updated = limits.map(l => l.id === id ? { ...l, enabled: !l.enabled } : l)
    handleSave(updated)
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
        <h2 className="text-lg font-bold m-0 text-foreground">Usage Warnings</h2>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-lg bg-primary/5 border border-primary/20 flex items-start">
          <AlertTriangle className="text-primary mr-3 mt-1 shrink-0" size={16} />
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            Configure data usage thresholds. NSX Monitor will send a system notification when your total upload and download traffic exceeds these limits for the specified period.
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {limits.map(limit => (
            <div key={limit.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card shadow-sm">
              <div className="flex items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center mr-3 ${limit.enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  <Bell size={16} />
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-foreground">{limit.type} Limit</div>
                  <div className="text-[11px] text-muted-foreground">Threshold: {formatBytes(limit.value)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => toggleLimit(limit.id)}
                  className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${limit.enabled ? 'border-primary text-primary hover:bg-primary/5' : 'border-border text-muted-foreground hover:bg-accent'}`}
                >
                  {limit.enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button 
                  onClick={() => deleteLimit(limit.id)}
                  className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          ))}

          {isAdding ? (
            <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground">Period</label>
                  <select 
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as UsageLimit['type'])}
                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Yearly</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground">Limit</label>
                  <div className="flex gap-1">
                    <input 
                      type="number"
                      placeholder="Value"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      className="flex-1 bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    />
                    <select 
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-[60px] bg-background border border-border rounded px-1 py-1.5 text-xs text-foreground outline-none focus:border-primary"
                    >
                      <option>MB</option>
                      <option>GB</option>
                      <option>TB</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={addLimit}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-md hover:opacity-90 transition-opacity"
                >
                  Create Warning
                </button>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAdding(true)}
              className="flex items-center justify-center p-3 rounded-lg border border-dashed border-border bg-transparent hover:bg-accent/50 hover:border-primary/50 transition-all text-muted-foreground hover:text-primary group"
            >
              <Plus size={16} className="mr-2" />
              <span className="text-xs font-medium">Add New Warning</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
