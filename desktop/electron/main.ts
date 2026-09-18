import { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain, screen, shell, nativeTheme, Notification } from 'electron'
import { autoUpdater } from 'electron-updater'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import si from 'systeminformation'
import { saveNetworkData, getNetworkData, clearDB, getDbPath, getUsageLimits, saveUsageLimits, UsageLimit, getAppSettings, saveAppSettings, AppSettings, DailyData, DB as DatabaseSchema, InterfaceDataMap } from './database'

/**
 * Configure and initialize the auto-updater.
 */
function setupAutoUpdater() {
  // Basic configuration
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-available', (info) => {
    console.log('Update available:', info.version);
    new Notification({
      title: 'NSX Monitor: Update Available',
      body: `Version ${info.version} is being downloaded automatically.`,
      icon: getIconPath()
    }).show();
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded:', info.version);
    new Notification({
      title: 'NSX Monitor: Update Ready',
      body: `Version ${info.version} has been downloaded and will install on restart.`,
      icon: getIconPath()
    }).show();
  });

  autoUpdater.on('error', (err) => {
    console.error('Auto-updater error:', err);
  });

  // Check for updates
  autoUpdater.checkForUpdatesAndNotify();

  // Polling: Check for updates every 24 hours for users who never close the app
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 1000 * 60 * 60 * 24);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))

app.name = 'NSX Monitor'
app.setAppUserModelId('com.nsx.monitor')

// The built directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

// Platform-specific icon paths
/**
 * Utility function to get the correct icon path based on the current operating system.
 */
const getIconPath = (): string => {
  const platform = process.platform;
  // In dev, assets are in 'public'. In prod, Vite copies them to 'dist'.
  const resourceDir = VITE_DEV_SERVER_URL 
    ? path.join(process.env.APP_ROOT, 'public') 
    : RENDERER_DIST;

  switch (platform) {
    case 'win32':
      return path.join(resourceDir, 'icons', 'win', 'icon.ico');
    case 'darwin':
      return path.join(resourceDir, 'icons', 'mac', 'icon.icns');
    case 'linux':
    default:
      return path.join(resourceDir, 'icons', 'png', '256x256.png');
  }
};

const iconPath = getIconPath();

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
let widgetWin: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
// Calculation state
const prevRxMap: Record<string, number> = {}
const prevTxMap: Record<string, number> = {}
const downQueue = [0, 0, 0] // Stores calculated speed (bytes/sec)
const upQueue = [0, 0, 0]   // Stores calculated speed (bytes/sec)
let lastUpdateTime = Date.now()
let cachedIfaces: string[] = []
let lastIfaceRefresh = 0

function format(bytes: number) {
  const kb = bytes / 1024
  const mb = kb / 1024
  if (mb >= 1) return `${mb.toFixed(2)}M`
  if (kb >= 1) return `${kb.toFixed(2)}K`
  return `${bytes.toFixed(0)}B`
}

/**
 * Checks if a network interface is a virtual or internal one that should be ignored.
 */
function isVirtualInterface(iface: string): boolean {
  const name = iface.toLowerCase();
  const virtualKeywords = [
    'loopback', 'lo', 'virtualbox', 'vmware', 'vEthernet', 
    'hyper-v', 'wsl', 'tunnel', 'tap', 'vpn', 'zerotier', 
    'tailscale', 'pseudo', 'filter', 'teredo', 'nordvpn',
    'expressvpn', 'cisco', 'fortinet', 'npcap', 'wan miniport'
  ];
  return virtualKeywords.some(keyword => name.includes(keyword.toLowerCase()));
}

interface PaginatedResponse {
  items: Record<string, InterfaceDataMap | Record<string, { down: number, up: number, days: number }>>;
  total: number;
  hasMore: boolean;
}

/**
 * Groups and paginates data based on the requested range (day, week, month, year).
 */
function getPaginatedData(data: DatabaseSchema, range: string, offset: number, limit: number): PaginatedResponse {
  const allDateKeys = Object.keys(data)
    .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
    .sort((a, b) => b.localeCompare(a)); // Newest first (e.g., 2024-03-15 before 2024-03-14)

  if (range === 'day') {
    const keys = allDateKeys.slice(offset, offset + limit);
    const items: Record<string, InterfaceDataMap> = {};
    keys.forEach(k => { items[k] = data[k] as unknown as InterfaceDataMap; });
    return { 
      items, 
      total: allDateKeys.length,
      hasMore: offset + limit < allDateKeys.length 
    };
  }

  if (range === 'week') {
    // Week is static (last 7 days), but we return it in the same format for consistency
    const keys = allDateKeys.slice(0, 7);
    const items: Record<string, InterfaceDataMap> = {};
    keys.forEach(k => { items[k] = data[k] as unknown as InterfaceDataMap; });
    return { items, total: 7, hasMore: false };
  }

  if (range === 'month' || range === 'year') {
    const format = range === 'month' ? 7 : 4; // YYYY-MM (7 chars) or YYYY (4 chars)
    const groups: Record<string, Record<string, { down: number, up: number, days: number }>> = {};
    
    allDateKeys.forEach(key => {
      const groupKey = key.substring(0, format);
      if (!groups[groupKey]) {
        groups[groupKey] = {};
      }
      
      const dayData = data[key] as unknown as InterfaceDataMap;
      if (dayData && typeof dayData === 'object' && !Array.isArray(dayData)) {
        Object.keys(dayData).forEach((ifaceName) => {
          const ifaceStats = dayData[ifaceName];
          if (typeof ifaceStats === 'object' && ifaceStats !== null && 'down' in ifaceStats && 'up' in ifaceStats) {
            const stats = ifaceStats as { down: number, up: number };
            if (!groups[groupKey][ifaceName]) {
                groups[groupKey][ifaceName] = { down: 0, up: 0, days: 0 };
            }
            groups[groupKey][ifaceName].down += stats.down;
            groups[groupKey][ifaceName].up += stats.up;
            groups[groupKey][ifaceName].days += 1;
          }
        });
      }
    });

    const allGroupKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const pagedKeys = allGroupKeys.slice(offset, offset + limit);
    const items: Record<string, Record<string, { down: number, up: number, days: number }>> = {};
    pagedKeys.forEach(k => { items[k] = groups[k]; });

    return { 
      items, 
      total: allGroupKeys.length,
      hasMore: offset + limit < allGroupKeys.length 
    };
  }

  return { items: {}, total: 0, hasMore: false };
}

function checkLimits() {
  const settings = getAppSettings();
  if (!settings.notificationsEnabled) return;

  const limits = getUsageLimits();
  const enabledLimits = limits.filter(l => l.enabled);
  if (enabledLimits.length === 0) return;

  const data = getNetworkData();
  if (!data) return;
  const now = new Date();
  
  enabledLimits.forEach(limit => {
    let currentTotal = 0;
    let periodKey = '';

    if (limit.type === 'Daily') {
      periodKey = now.toISOString().split('T')[0];
      const dayData = data[periodKey];
      if (dayData && typeof dayData === 'object' && !Array.isArray(dayData)) {
                Object.values(dayData).forEach((iface: DailyData) => {
                  currentTotal += (iface.down + iface.up);
                });
      }
    } else if (limit.type === 'Weekly') {
       const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
       d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
       const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
       const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
       periodKey = `${d.getUTCFullYear()}-W${weekNo}`;

       Object.keys(data).forEach(dateStr => {
          if (dateStr === 'limits') return;
          const date = new Date(dateStr);
          if (isNaN(date.getTime())) return;
          const wd = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
          wd.setUTCDate(wd.getUTCDate() + 4 - (wd.getUTCDay() || 7));
          const wYearStart = new Date(Date.UTC(wd.getUTCFullYear(), 0, 1));
          const wNo = Math.ceil((((wd.getTime() - wYearStart.getTime()) / 86400000) + 1) / 7);
          if (`${wd.getUTCFullYear()}-W${wNo}` === periodKey) {
             const dayData = data[dateStr];
             if (dayData && typeof dayData === 'object' && !Array.isArray(dayData)) {
               Object.values(dayData).forEach((iface: DailyData) => {
                  currentTotal += (iface.down + iface.up);
               });
             }
          }
       });
    } else if (limit.type === 'Monthly') {
       periodKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
       Object.keys(data).forEach(dateStr => {
          if (dateStr === 'limits') return;
          if (dateStr.startsWith(periodKey)) {
             const dayData = data[dateStr];
             if (dayData && typeof dayData === 'object' && !Array.isArray(dayData)) {
               Object.values(dayData).forEach((iface: DailyData) => {
                  currentTotal += (iface.down + iface.up);
               });
             }
          }
       });
    } else if (limit.type === 'Yearly') {
       periodKey = `${now.getFullYear()}`;
       Object.keys(data).forEach(dateStr => {
          if (dateStr === 'limits') return;
          if (dateStr.startsWith(periodKey)) {
             const dayData = data[dateStr];
             if (dayData && typeof dayData === 'object' && !Array.isArray(dayData)) {
               Object.values(dayData).forEach((iface: DailyData) => {
                  currentTotal += (iface.down + iface.up);
               });
             }
          }
       });
    }

    if (currentTotal >= limit.value && limit.lastNotified !== periodKey) {
      new Notification({
        title: `NSX Monitor: ${limit.type} Limit Reached`,
        body: `Usage: ${format(currentTotal)} (Limit: ${format(limit.value)})`,
        icon: getIconPath()
      }).show();
      limit.lastNotified = periodKey;
      saveUsageLimits(limits);
    }
  });
}

async function updateStats() {
  const startTime = Date.now()
  try {
    const dt = (startTime - lastUpdateTime) / 1000 // delta time in seconds
    lastUpdateTime = startTime
    const safeDt = dt > 0 ? dt : 1

    // Refresh interface list every 30 seconds to handle network changes
    if (Date.now() - lastIfaceRefresh > 30000 || cachedIfaces.length === 0) {
      const allIfaces = await si.networkInterfaces()
      if (Array.isArray(allIfaces)) {
        cachedIfaces = allIfaces
          .filter(i => !isVirtualInterface(i.iface))
          .map(i => i.iface)
      }
      lastIfaceRefresh = Date.now()
    }

    // Polling specific interfaces is significantly faster on Windows
    const stats = await si.networkStats(cachedIfaces.join(','))
    if (!stats || stats.length === 0) {
      return
    }

    let currentRx = 0
    let currentTx = 0
    let rawTotalDown = 0
    let rawTotalUp = 0
    
    for (const stat of stats) {
       // Filter out virtual/loopback interfaces to prevent traffic doubling
       if (!isVirtualInterface(stat.iface)) {
           currentRx += stat.rx_bytes
           currentTx += stat.tx_bytes
           
           if (prevRxMap[stat.iface] !== undefined) {
               const downDelta = Math.max(0, stat.rx_bytes - prevRxMap[stat.iface])
               const upDelta = Math.max(0, stat.tx_bytes - prevTxMap[stat.iface])
               saveNetworkData(stat.iface, downDelta, upDelta)
               rawTotalDown += downDelta
               rawTotalUp += upDelta
           }
           
           prevRxMap[stat.iface] = stat.rx_bytes
           prevTxMap[stat.iface] = stat.tx_bytes
       }
    }

    // Convert total bytes delta during this period to bytes per second
    const normalizedDown = rawTotalDown / safeDt
    const normalizedUp = rawTotalUp / safeDt

    // 3-sample moving window for visual smoothness
    downQueue.shift()
    downQueue.push(normalizedDown)
    upQueue.shift()
    upQueue.push(normalizedUp)

    const down = (downQueue[0] + downQueue[1] + downQueue[2]) / 3
    const up = (upQueue[0] + upQueue[1] + upQueue[2]) / 3

    // Check usage limits and notify if needed
    checkLimits();

    if (tray) {
      tray.setToolTip(`NSX Monitor\nDownload: ${format(down)}/s\nUpload: ${format(up)}/s`)
    }

    const payload = {
      down,
      up,
      totalDown: currentRx,
      totalUp: currentTx,
      iface: stats[0].iface,
      operstate: stats[0].operstate
    }

    if (win && !win.isDestroyed()) {
      win.webContents.send('network-stats', payload)
      // Also notify that history has been updated (for the dashboard totals)
      win.webContents.send('database-synced', {
        today: new Date().toISOString().split('T')[0],
        stats: payload
      })
    }

    if (widgetWin && !widgetWin.isDestroyed()) {
      widgetWin.webContents.send('network-stats', payload)
    }
  } catch (error) {
    console.error('Failed to update stats:', error)
  } finally {
    // Self-adjusting timer to maintain precise 1-second intervals
    const executionTime = Date.now() - startTime
    const nextDelay = Math.max(0, 1000 - executionTime)
    setTimeout(updateStats, nextDelay)
  }
}

function createWindow() {
  const isDark = nativeTheme.shouldUseDarkColors;
  const bgColor = isDark ? '#0f172a' : '#f1f5f9';

  win = new BrowserWindow({
    icon: iconPath,
    backgroundColor: bgColor,
    width: 700,
    height: 600,
    resizable: false,
    maximizable: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    title: `NSX Monitor v${app.getVersion()}`,
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: isDark ? '#ffffff' : '#000000',
      height: 30
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
    show: false, // Don't show immediately
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  // Hook system theme updates dynamically
  nativeTheme.on('updated', () => {
    if (win && !win.isDestroyed()) {
      const darkState = nativeTheme.shouldUseDarkColors;
      const newBg = darkState ? '#0f172a' : '#f1f5f9';
      win.setBackgroundColor(newBg);
      win.setTitleBarOverlay({
        color: '#00000000',
        symbolColor: darkState ? '#ffffff' : '#000000'
      });
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('close', (event) => {
    if (isQuitting) {
      win = null
    } else {
      event.preventDefault()
      win?.hide()
    }
  })

  win.on('show', () => {
    win?.webContents.send('dashboard-shown');
  });
}

function createWidget() {
  const display = screen.getPrimaryDisplay()
  const width = 160
  const height = 60

  widgetWin = new BrowserWindow({
    icon: iconPath,
    width,
    height,
    title: 'NSX Speed Monitor',
    x: display.workArea.width - width - 20,
    y: display.workArea.height - height - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  if (VITE_DEV_SERVER_URL) {
    widgetWin.loadURL(`${VITE_DEV_SERVER_URL}?type=widget`)
  } else {
    widgetWin.loadFile(path.join(RENDERER_DIST, 'index.html'), { query: { type: 'widget' } })
  }

  widgetWin.on('close', (event) => {
    if (isQuitting) {
      widgetWin = null
    } else {
      event.preventDefault()
      widgetWin?.hide()
    }
  })
}

function initTray() {
  tray = new Tray(nativeImage.createFromPath(iconPath))
  const contextMenu = Menu.buildFromTemplate([
    { label: 'NSX Monitor', enabled: false },
    { type: 'separator' },
    { label: 'Show Dashboard', click: () => {
      if (win) {
        win.show()
        win.focus()
      }
    }},
    { label: 'Show/Hide Widget', click: () => {
      if (widgetWin) {
        widgetWin.isVisible() ? widgetWin.hide() : widgetWin.show()
      }
    }},
    { type: 'separator' },
    { label: 'Quit', click: () => {
      isQuitting = true
      app.quit()
    }}
  ])
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (win) {
      win.isVisible() ? win.hide() : win.show()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
    createWidget()
  }
})

ipcMain.handle('get-historical-data', (_event, options: { range?: string, offset?: number, limit?: number } = {}) => {
  const { range = 'day', offset = 0, limit = 20 } = options;
  const fullData = getNetworkData()
  return getPaginatedData(fullData, range, offset, limit)
})

ipcMain.on('win:hide', () => {
  win?.hide()
})

ipcMain.handle('get-network-interfaces', async () => {
  try {
    const interfaces = await si.networkInterfaces()
    // networkInterfaces can return an array or object
    return Array.isArray(interfaces) ? interfaces.map(i => i.iface) : []
  } catch (e) {
    return []
  }
})

ipcMain.on('clear-database', () => {
  clearDB()
})

ipcMain.on('open-database-folder', () => {
  const dbPath = getDbPath()
  if (dbPath) {
    shell.showItemInFolder(dbPath)
  }
})

ipcMain.handle('get-usage-limits', () => {
  return getUsageLimits();
})

ipcMain.on('save-usage-limits', (_event, limits: UsageLimit[]) => {
  saveUsageLimits(limits);
})

ipcMain.handle('get-app-settings', () => {
  return getAppSettings();
})

ipcMain.on('save-app-settings', (_event, settings: AppSettings) => {
  saveAppSettings(settings);
  if (win && !win.isDestroyed()) win.webContents.send('app-settings-updated', settings);
  if (widgetWin && !widgetWin.isDestroyed()) widgetWin.webContents.send('app-settings-updated', settings);
})

app.whenReady().then(() => {
  // Add to Windows startup organically only in production
  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: true,
      path: app.getPath('exe'),
    })
  }

  Menu.setApplicationMenu(null)
  createWindow()
  setupAutoUpdater()
  createWidget()
  initTray()
  
  // Initial stats to avoid first jump
  si.networkInterfaces().then(allIfaces => {
    if (Array.isArray(allIfaces)) {
      cachedIfaces = allIfaces
        .filter(i => !isVirtualInterface(i.iface))
        .map(i => i.iface)
      lastIfaceRefresh = Date.now()
    }
    return si.networkStats(cachedIfaces.join(','))
  }).then(stats => {
    if (stats && stats.length > 0) {
      for (const stat of stats) {
        if (!isVirtualInterface(stat.iface)) {
          prevRxMap[stat.iface] = stat.rx_bytes
          prevTxMap[stat.iface] = stat.tx_bytes
        }
      }
    }
    lastUpdateTime = Date.now()
    updateStats() // Start the loop immediately
  })
})
