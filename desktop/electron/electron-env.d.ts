/// <reference types="vite-plugin-electron/electron-env" />

interface NetworkStats {
  down: number;
  up: number;
  totalDown: number;
  totalUp: number;
  iface: string;
  operstate: string;
}

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * The built directory structure
     *
     * ```tree
     * ├─┬─┬ dist
     * │ │ └── index.html
     * │ │
     * │ ├─┬ dist-electron
     * │ │ ├── main.js
     * │ │ └── preload.js
     * │
     * ```
     */
    APP_ROOT: string
    /** /dist/ or /public/ */
    VITE_PUBLIC: string
  }
}

// Used in Renderer process, expose in `preload.ts`
interface Window {
  ipcRenderer: import('electron').IpcRenderer & {
    onNetworkStats(callback: (stats: NetworkStats) => void): () => void;
    onAppSettingsUpdate(callback: (settings: Record<string, string | boolean>) => void): () => void;
  }
}
