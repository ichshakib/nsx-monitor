import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },

  // Specialized handlers
  onNetworkStats(callback: (stats: NetworkStats) => void) {
    const listener = (_: unknown, stats: NetworkStats) => callback(stats)
    ipcRenderer.on('network-stats', listener)
    return () => ipcRenderer.off('network-stats', listener)
  },
  onAppSettingsUpdate(callback: (settings: Record<string, string | boolean>) => void) {
    const listener = (_: unknown, settings: Record<string, string | boolean>) => callback(settings)
    ipcRenderer.on('app-settings-updated', listener)
    return () => ipcRenderer.off('app-settings-updated', listener)
  },
  onDashboardShown(callback: () => void) {
    const listener = () => callback()
    ipcRenderer.on('dashboard-shown', listener)
    return () => ipcRenderer.off('dashboard-shown', listener)
  }
})
