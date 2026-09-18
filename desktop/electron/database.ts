import { app } from 'electron'
import { join } from 'node:path'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const DB_FILENAME = 'network_data.json'
let dbPath = ''

interface HourlyData {
  down: number;
  up: number;
}

export interface DailyData {
  down: number;
  up: number;
  hours?: HourlyData[];
}

export interface InterfaceDataMap {
  [ifaceName: string]: DailyData;
}

export interface UsageLimit {
  id: string;
  type: 'Daily' | 'Weekly' | 'Monthly' | 'Yearly';
  value: number; // bytes
  enabled: boolean;
  lastNotified?: string;
}

export interface AppSettings {
  notificationsEnabled: boolean;
  speedUnit: 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'b' | 'Kb' | 'Mb' | 'Gb' | 'Tb';
}

export interface DB {
  [key: string]: InterfaceDataMap | UsageLimit[] | AppSettings | undefined;
}

let cache: DB | null = null;
let lastFlush = Date.now();
let pendingChanges = false;

interface LegacyDailyData {
  down: number;
  up: number;
  hours?: HourlyData[];
}

/**
 * Initializes the JSON database in the user's AppData directory
 */
export function initDB() {
  if (dbPath) return;
  dbPath = join(app.getPath('userData'), DB_FILENAME);
  try {
    if (existsSync(dbPath)) {
      const data = readFileSync(dbPath, 'utf-8');
      cache = JSON.parse(data);
      
      let migrated = false;
      Object.keys(cache!).forEach(date => {
        const potentialLegacy = cache![date] as unknown as LegacyDailyData;
        // Legacy check: if the date holds raw 'down'/'up' integers directly instead of an iface map
        if (typeof potentialLegacy.down === 'number') {
           cache![date] = {
             "Legacy Interface": {
               down: potentialLegacy.down,
               up: potentialLegacy.up,
               hours: potentialLegacy.hours
             }
           };
           migrated = true;
        }
      });
      if (migrated) flushDB();
    } else {
      cache = {};
      writeFileSync(dbPath, JSON.stringify(cache), 'utf-8');
    }
  } catch (error) {
    console.error('Failed to initialize local JSON database:', error);
    cache = {};
  }
}

/**
 * Record additional bytes downloaded and uploaded for a given date and interface
 * @param ifaceName The name of the network interface hardware
 * @param downDelta Bytes downloaded since last check
 * @param upDelta Bytes uploaded since last check
 */
export function saveNetworkData(ifaceName: string, downDelta: number, upDelta: number) {
  if (!cache) initDB();
  if (downDelta === 0 && upDelta === 0) return;

  // Format date as YYYY-MM-DD local time
  const today = new Date();
  const dateStr = today.getFullYear() + '-' + 
                  String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(today.getDate()).padStart(2, '0');

  if (!cache![dateStr]) cache![dateStr] = {};
  
  const dayData = cache![dateStr] as InterfaceDataMap;

  if (!dayData[ifaceName]) {
    dayData[ifaceName] = { 
      down: 0, 
      up: 0, 
      hours: Array(24).fill(null).map(() => ({down: 0, up: 0}))
    };
  }
  
  if (!dayData[ifaceName].hours) {
    dayData[ifaceName].hours = Array(24).fill(null).map(() => ({down: 0, up: 0}));
  }

  const currentHour = today.getHours();

  dayData[ifaceName].down += downDelta;
  dayData[ifaceName].up += upDelta;
  if(dayData[ifaceName].hours && dayData[ifaceName].hours[currentHour]) {
     dayData[ifaceName].hours[currentHour].down += downDelta;
     dayData[ifaceName].hours[currentHour].up += upDelta;
  }
  
  pendingChanges = true;

  // Flush to disk every 60 seconds to avoid wearing out the SSD
  if (Date.now() - lastFlush > 60000) {
    flushDB();
  }
}

/**
 * Force saves any pending changes to disk immediately
 */
export function flushDB() {
  if (!pendingChanges || !cache || !dbPath) return;
  try {
    writeFileSync(dbPath, JSON.stringify(cache, null, 2), 'utf-8');
    pendingChanges = false;
    lastFlush = Date.now();
    // console.log(`[DB] Flushed network data to ${dbPath}`);
  } catch (error) {
    console.error('Failed to flush DB to disk:', error);
  }
}

// Attempt to gracefully save before app exits
app.on('will-quit', () => {
    flushDB();
});

/**
 * Returns the entire database cache for UI consumption
 */
export function getNetworkData(): DB {
  if (!cache) initDB();
  return cache!;
}

/**
 * Resets the database back to an empty tracking state.
 */
export function clearDB() {
  cache = {};
  pendingChanges = true;
  flushDB();
}

/**
 * Returns the absolute path where the JSON database lives.
 */
export function getDbPath() {
  if (!dbPath) initDB();
  return dbPath;
}

export function getUsageLimits(): UsageLimit[] {
  if (!cache) initDB();
  return (cache!.limits as UsageLimit[]) || [];
}

export function saveUsageLimits(limits: UsageLimit[]) {
  if (!cache) initDB();
  cache!.limits = limits;
  pendingChanges = true;
  flushDB();
}

export function getAppSettings(): AppSettings {
  if (!cache) initDB();
  return (cache!.settings as AppSettings) || { notificationsEnabled: true, speedUnit: 'MB' };
}

export function saveAppSettings(settings: AppSettings) {
  if (!cache) initDB();
  cache!.settings = settings;
  pendingChanges = true;
  flushDB();
}
