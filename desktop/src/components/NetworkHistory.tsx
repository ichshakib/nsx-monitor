import React, { useEffect, useState, useCallback } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts'
import { Bell, Settings } from 'lucide-react'

interface HourlyData {
  down: number;
  up: number;
}

interface DailyData {
  down: number;
  up: number;
  hours?: HourlyData[];
}

interface InterfaceDataMap {
  [ifaceName: string]: DailyData;
}

interface DB {
  [date: string]: InterfaceDataMap;
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

// Compute ISO week of the year
function getWeekNumber(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay()||7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(),0,1));
  const weekNo = Math.ceil(( ( (date.getTime() - yearStart.getTime()) / 86400000) + 1)/7);
  return { year: date.getUTCFullYear(), week: weekNo };
}

type NetworkUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB';

interface NetworkHistoryProps {
  onNavigate: (view: 'History' | 'Settings' | 'Warning') => void;
}

export const NetworkHistory: React.FC<NetworkHistoryProps> = ({ onNavigate }) => {
  const [data, setData] = useState<DB>({})
  const [group, setGroup] = useState<'Day' | 'Week' | 'Month' | 'Year'>('Day')
  const [viewMode, setViewMode] = useState<'Data' | 'Graph'>('Data')
  const [unit, setUnit] = useState<NetworkUnit>('MB')
  const [interfaces, setInterfaces] = useState<string[]>([])
  const [selectedInterface, setSelectedInterface] = useState<string>('')
  const [dbStatus, setDbStatus] = useState<'fetching' | 'Ok' | 'Error'>('fetching')

  // Function to fetch the historical data on demand
  const fetchDB = useCallback(() => {
    setDbStatus('fetching')
    const rangeParam = group.toLowerCase()
    window.ipcRenderer.invoke('get-historical-data', { range: rangeParam, offset: 0, limit: 100 }).then((res: { items: DB }) => {
      if (res && res.items) {
        setData(res.items)
        setDbStatus('Ok')
      } else {
        setData({})
        setDbStatus('Ok') // If it's empty but exists, it's Ok
      }
    }).catch((err: unknown) => {
      console.error("Could not fetch DB", err)
      setDbStatus('Error')
    })
  }, [group])

  // Initial mount: fetch interfaces
  useEffect(() => {
    window.ipcRenderer.invoke('get-network-interfaces').then((res: string[]) => {
      if (res && res.length > 0) {
        setInterfaces(res)
        setSelectedInterface(prev => prev ? prev : res[0])
      }
    }).catch(() => {})
  }, [])

  // Fetch data only when group or interface changes
  useEffect(() => {
    fetchDB()
  }, [fetchDB, selectedInterface])

  // Auto-refresh when window is shown (via tray icon or menu)
  useEffect(() => {
    const renderer = window.ipcRenderer as unknown as { onDashboardShown: (cb: () => void) => () => void };
    const removeListener = renderer.onDashboardShown(() => {
      fetchDB();
    });
    return () => {
      if (removeListener) removeListener();
    };
  }, [fetchDB]);

  // Resolve the DB mapping to plain date -> DailyData based on active interface targeted
  const getFilteredData = (): Record<string, DailyData> => {
    const flat: Record<string, DailyData> = {}
    if (!selectedInterface || !data) return flat;
    Object.keys(data).forEach(date => {
      if (data[date] && data[date][selectedInterface]) {
        flat[date] = data[date][selectedInterface]
      }
    })
    return flat
  }

  const getMultiplier = () => {
    if (unit === 'KB') return 1024;
    if (unit === 'MB') return 1024 ** 2;
    if (unit === 'GB') return 1024 ** 3;
    if (unit === 'TB') return 1024 ** 4;
    return 1; // 'B'
  }

  const formatRaw = (bytes: number) => {
    return Number((bytes / getMultiplier()).toFixed(2));
  }

  const formatStr = (bytes: number) => {
    const val = bytes / getMultiplier();
    if (val >= 1000000) {
      return val.toExponential(2).replace('e+', 'e');
    }
    return val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // --- TABLE RENDERER ---
  const getTableData = () => {
    const activeData = getFilteredData()
    if (group === 'Day') {
      const groupedByMonth: Record<string, { day: string, up: number, down: number }[]> = {}
      Object.keys(activeData).sort((a, b) => b.localeCompare(a)).forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const monthYear = `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`
        if (!groupedByMonth[monthYear]) groupedByMonth[monthYear] = []
        groupedByMonth[monthYear].push({
          day: String(dateObj.getDate()), up: activeData[dateStr].up, down: activeData[dateStr].down
        })
      })

      return Object.entries(groupedByMonth).map(([month, days]) => (
        <div key={month} className="mb-[15px]">
          <div className="py-1 px-2 text-foreground text-[13px] font-medium flex items-center">
            <span className="mr-[10px]">{month}</span>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          {days.map((d, i) => (
            <div key={i} className="flex text-xs py-1 px-2 text-muted-foreground">
              <div className="w-[80px]">{d.day}</div>
              <div className="flex-1 text-right">{formatStr(d.up)}</div>
              <div className="flex-1 text-right">{formatStr(d.down)}</div>
              <div className="flex-1 text-right">{formatStr(d.up + d.down)}</div>
            </div>
          ))}
        </div>
      ))
    } else if (group === 'Week') {
      const activeData = getFilteredData()
      const latestDay = Object.keys(activeData).sort().pop()
      if (!latestDay) return <div className="p-5 text-center text-xs text-muted-foreground">No data collected yet.</div>

      const [y, m, d] = latestDay.split('-').map(Number);
      const baseDate = new Date(y, m - 1, d);
      const weekInfo = getWeekNumber(baseDate)
      const weekLabel = `Week ${weekInfo.week}`
      
      const currentDay = baseDate.getDay()
      const distToMon = currentDay === 0 ? 6 : currentDay - 1
      const monday = new Date(baseDate)
      monday.setDate(monday.getDate() - distToMon)
      monday.setHours(0,0,0,0)

      const daysStr = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
      const weekRows = []

      for (let i = 0; i < 7; i++) {
        const iterDate = new Date(monday)
        iterDate.setDate(monday.getDate() + i)
        const dateStr = `${iterDate.getFullYear()}-${String(iterDate.getMonth() + 1).padStart(2, '0')}-${String(iterDate.getDate()).padStart(2, '0')}`
        const stats = activeData[dateStr] || { up: 0, down: 0 }
        weekRows.push({ name: daysStr[i], ...stats })
      }

      return (
        <div className="mb-[15px]">
          <div className="py-1 px-2 text-foreground text-[13px] font-medium flex items-center">
            <span className="mr-[10px]">{weekLabel}</span>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          {weekRows.map((d, i) => (
            <div key={i} className="flex text-xs py-1 px-2 text-muted-foreground">
              <div className="w-[80px]">{d.name}</div>
              <div className="flex-1 text-right">{formatStr(d.up)}</div>
              <div className="flex-1 text-right">{formatStr(d.down)}</div>
              <div className="flex-1 text-right">{formatStr(d.up + d.down)}</div>
            </div>
          ))}
        </div>
      )
    } else if (group === 'Month') {
      const groupedByYear: Record<string, Record<string, { up: number, down: number }>> = {}
      Object.keys(activeData).forEach(dateStr => {
        const [y, m] = dateStr.split('-');
        const year = String(y)
        const monthName = MONTH_NAMES[Number(m) - 1]
        
        if (!groupedByYear[year]) groupedByYear[year] = {}
        if (!groupedByYear[year][monthName]) groupedByYear[year][monthName] = { up: 0, down: 0 }
        
        groupedByYear[year][monthName].up += activeData[dateStr].up
        groupedByYear[year][monthName].down += activeData[dateStr].down
      })

      return Object.entries(groupedByYear).sort((a,b) => b[0].localeCompare(a[0])).map(([year, months]) => (
        <div key={year} className="mb-[15px]">
          <div className="py-1 px-2 text-foreground text-[13px] font-medium flex items-center">
            <span className="mr-[10px]">{year}</span>
            <div className="flex-1 h-[1px] bg-border" />
          </div>
          {Object.entries(months).map(([monthName, obj]) => (
            <div key={monthName} className="flex text-xs py-1 px-2 text-muted-foreground">
              <div className="w-[80px]">{monthName}</div>
              <div className="flex-1 text-right">{formatStr(obj.up)}</div>
              <div className="flex-1 text-right">{formatStr(obj.down)}</div>
              <div className="flex-1 text-right">{formatStr(obj.up + obj.down)}</div>
            </div>
          ))}
        </div>
      ))
    } else {
      // Group by Year explicitly (No sub-headers)
      const yearlyTotals: Record<string, { up: number, down: number }> = {}
      Object.keys(activeData).forEach(dateStr => {
        const [y] = dateStr.split('-');
        const year = String(y)
        if (!yearlyTotals[year]) yearlyTotals[year] = { up: 0, down: 0 }
        yearlyTotals[year].up += activeData[dateStr].up
        yearlyTotals[year].down += activeData[dateStr].down
      })

      return (
        <div className="mb-[15px] pt-[10px]">
          {Object.entries(yearlyTotals).sort((a,b) => b[0].localeCompare(a[0])).map(([year, obj]) => (
            <div key={year} className="flex text-xs py-1 px-2 text-muted-foreground">
              <div className="w-[80px] font-semibold">{year}</div>
              <div className="flex-1 text-right">{formatStr(obj.up)}</div>
              <div className="flex-1 text-right">{formatStr(obj.down)}</div>
              <div className="flex-1 text-right">{formatStr(obj.up + obj.down)}</div>
            </div>
          ))}
        </div>
      )
    }
  }

  // --- CHART RENDERER ---
  const getChartData = () => {
    const activeData = getFilteredData()
    
    if (group === 'Year') {
      // Show a 5-year window with the current year at the center for better context
      const currentYear = new Date().getFullYear()
      const years = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString())
      
      const yearlyTotals: Record<string, { Upload: number, Download: number }> = {}
      Object.keys(activeData).forEach(dateStr => {
        const year = dateStr.split('-')[0]
        if (!yearlyTotals[year]) yearlyTotals[year] = { Upload: 0, Download: 0 }
        yearlyTotals[year].Upload += activeData[dateStr].up
        yearlyTotals[year].Download += activeData[dateStr].down
      })

      return years.map(year => ({
        name: year,
        Upload: yearlyTotals[year] ? formatRaw(yearlyTotals[year].Upload) : 0,
        Download: yearlyTotals[year] ? formatRaw(yearlyTotals[year].Download) : 0
      }))
    } 
    else if (group === 'Month') {
      // Monthly breakdown for the current/latest year
      const latestDay = Object.keys(activeData).sort().pop()
      const latestYear = latestDay ? Number(latestDay.split('-')[0]) : new Date().getFullYear()
      const yearData = MONTH_NAMES.map(m => ({ name: m.substring(0, 3), Upload: 0, Download: 0 }))
      
      Object.keys(activeData).forEach(dateStr => {
        const [y, m] = dateStr.split('-');
        if (Number(y) === latestYear) {
          yearData[Number(m) - 1].Upload += activeData[dateStr].up
          yearData[Number(m) - 1].Download += activeData[dateStr].down
        }
      })
      return yearData.map(d => ({ ...d, Upload: formatRaw(d.Upload), Download: formatRaw(d.Download) }))
    }
    else if (group === 'Week') {
      // Daily breakdown for the current/latest week
      const daysStr = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      const weekData = daysStr.map(m => ({ name: m, Upload: 0, Download: 0 }))
      
      const latestDay = Object.keys(activeData).sort().pop()
      let baseDate = new Date();
      if (latestDay) {
          const [y, m, d] = latestDay.split('-').map(Number);
          baseDate = new Date(y, m - 1, d);
      }
      
      const currentDay = baseDate.getDay()
      const distToMon = currentDay === 0 ? 6 : currentDay - 1
      const monday = new Date(baseDate)
      monday.setDate(monday.getDate() - distToMon)
      monday.setHours(0,0,0,0)
      
      Object.keys(activeData).forEach(dateStr => {
        const [y, m, day] = dateStr.split('-').map(Number);
        const iterDate = new Date(y, m - 1, day);
        iterDate.setHours(0,0,0,0)
        const diffDays = Math.round((iterDate.getTime() - monday.getTime()) / 86400000)
        if (diffDays >= 0 && diffDays <= 6) {
          weekData[diffDays].Upload += activeData[dateStr].up
          weekData[diffDays].Download += activeData[dateStr].down
        }
      })
      return weekData.map(d => ({ ...d, Upload: formatRaw(d.Upload), Download: formatRaw(d.Download) }))
    }
    else {
      // Day = daily breakdown for the current/latest month
      const latestDay = Object.keys(activeData).sort().pop()
      let latestDate = new Date();
      if (latestDay) {
          const [y, m, d] = latestDay.split('-').map(Number);
          latestDate = new Date(y, m - 1, d);
      }
      const numDays = new Date(latestDate.getFullYear(), latestDate.getMonth() + 1, 0).getDate()
      
      const monthData = Array.from({length: numDays}, (_, i) => ({ name: `${i+1}`, Upload: 0, Download: 0 }))
      Object.keys(activeData).forEach(dateStr => {
        const [y, m, d] = dateStr.split('-').map(Number);
        if (y === latestDate.getFullYear() && (m - 1) === latestDate.getMonth()) {
          monthData[d - 1].Upload += activeData[dateStr].up
          monthData[d - 1].Download += activeData[dateStr].down
        }
      })
      return monthData.map(d => ({ ...d, Upload: formatRaw(d.Upload), Download: formatRaw(d.Download) }))
    }
  }

  return (
    <div className="p-5 font-sans text-foreground flex-1 flex flex-col h-full box-border">
      {/* Top Header Mock */}
      <div className="mb-5">
        <h3 className="text-sm m-0 mb-1 font-semibold">Network Interface</h3>
        <select 
          value={selectedInterface} 
          onChange={e => setSelectedInterface(e.target.value)} 
          className="w-full p-1 text-[13px] border border-border rounded-sm bg-card text-foreground"
        >
          {interfaces.length > 0 ? interfaces.map(ifc => (
            <option key={ifc} value={ifc}>{ifc}</option>
          )) : (
            <option>Fetching interfaces...</option>
          )}
        </select>
        <div className="mt-2 text-xs flex justify-between">
          <span>Database Status: <strong className={dbStatus === 'Error' ? 'ml-2 text-destructive' : 'ml-2 text-emerald-500'}>{dbStatus}</strong></span>
        </div>
      </div>

      <div className="flex gap-5 h-[400px]">
        {/* Main Content Area */}
        <div className="flex-1 border border-border bg-card flex flex-col rounded-md overflow-hidden">
          
          {viewMode === 'Data' ? (
            <>
              <div className="flex text-xs p-2 border-b border-border bg-muted/50 font-medium text-foreground">
                 <div className="w-[80px]"></div>
                 <div className="flex-1 text-right">Upload</div>
                 <div className="flex-1 text-right">Download</div>
                 <div className="flex-1 text-right">Total</div>
              </div>
              <div className="flex-1 overflow-y-auto bg-card p-2">
                 {Object.keys(getFilteredData()).length > 0 ? getTableData() : <div className="p-5 text-center text-xs text-muted-foreground">No data collected yet.</div>}
              </div>
            </>
          ) : (
            <div className="flex-1 p-5 flex justify-center items-center">
              {(() => {
                /* eslint-disable @typescript-eslint/no-explicit-any */
                const RespContainer = ResponsiveContainer as any;
                const LChart = LineChart as any;
                const XA = XAxis as any;
                const YA = YAxis as any;
                const Lgd = Legend as any;
                const Ln = Line as any;
                const RTip = RechartsTooltip as any;
                const CGrid = CartesianGrid as any;
                /* eslint-enable @typescript-eslint/no-explicit-any */

                return (
                  <RespContainer width="100%" height="100%">
                    <LChart
                      data={getChartData()}
                      margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                    >
                      <CGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                        vertical={false}
                      />
                      <XA
                        dataKey="name"
                        className="stroke-muted-foreground"
                        fontSize={11}
                        tickMargin={8}
                      />
                      <YA
                        className="stroke-muted-foreground"
                        fontSize={11}
                        width={60}
                        tickFormatter={(value: number) => {
                          if (value >= 1000000) return value.toExponential(1).replace('e+', 'e');
                          return value.toLocaleString();
                        }}
                      />
                       <RTip
                        formatter={(value: number) => {
                          if (value >= 1000000) return value.toExponential(2).replace('e+', 'e');
                          return value.toLocaleString();
                        }}
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderRadius: "0.5rem",
                          border: "1px solid var(--border)",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                          fontSize: "12px",
                          color: "var(--card-foreground)",
                        }}
                        itemStyle={{ padding: 0 }}
                      />
                      <Lgd
                        wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                      />
                      <Ln
                        type="monotone"
                        dataKey="Download"
                        stroke="var(--chart-2)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                      <Ln
                        type="monotone"
                        dataKey="Upload"
                        stroke="var(--chart-5)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 6 }}
                      />
                    </LChart>
                  </RespContainer>
                );
              })()}
            </div>
          )}
        </div>

        {/* Right Sidebar Controls */}
        <div className="w-[150px] flex flex-col text-xs">
          
          <div className="mb-4">
            <div className="mb-1 text-muted-foreground font-medium">View:</div>
            <div>
              <label className="flex items-center mb-1 cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="view" checked={viewMode === 'Data'} onChange={() => setViewMode('Data')} className="mr-2 accent-primary" />
                Data
              </label>
              <label className="flex items-center cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="view" checked={viewMode === 'Graph'} onChange={() => setViewMode('Graph')} className="mr-2 accent-primary" />
                Graph
              </label>
            </div>
          </div>

          <div className="mb-4">
            <div className="mb-1 text-muted-foreground font-medium">Group:</div>
            <div>
              <label className="flex items-center mb-1 cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="group" checked={group === 'Day'} onChange={() => setGroup('Day')} className="mr-2 accent-primary" />
                Day
              </label>
              <label className="flex items-center mb-1 cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="group" checked={group === 'Week'} onChange={() => setGroup('Week')} className="mr-2 accent-primary" />
                Week
              </label>
              <label className="flex items-center mb-1 cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="group" checked={group === 'Month'} onChange={() => setGroup('Month')} className="mr-2 accent-primary" />
                Month
              </label>
              <label className="flex items-center cursor-pointer hover:text-primary transition-colors">
                <input type="radio" name="group" checked={group === 'Year'} onChange={() => setGroup('Year')} className="mr-2 accent-primary" />
                Year
              </label>
            </div>
          </div>

          <div className="mb-5">
             <div className="mb-1 text-muted-foreground font-medium">Unit:</div>
             <select 
               value={unit} 
               onChange={(e) => setUnit(e.target.value as NetworkUnit)} 
               className="w-full p-1 border border-border rounded-sm bg-card text-foreground"
             >
               <option value="B">B</option>
               <option value="KB">KB</option>
               <option value="MB">MB</option>
               <option value="GB">GB</option>
               <option value="TB">TB</option>
             </select>
          </div>

          <div className="flex flex-col gap-2 mt-auto">
             <button 
               onClick={() => onNavigate('Warning')}
               className="flex items-center justify-center gap-2 px-2 py-2 bg-primary/10 text-primary border border-primary/20 rounded-md cursor-pointer shadow-sm text-xs font-bold hover:bg-primary hover:text-primary-foreground transition-all"
             >
               <Bell size={14} /> Warnings
             </button>
             <button 
               onClick={() => onNavigate('Settings')}
               className="flex items-center justify-center gap-2 px-2 py-2 bg-card text-card-foreground border border-border rounded-md cursor-pointer shadow-sm text-xs font-medium hover:bg-accent transition-all"
             >
               <Settings size={14} /> Settings
             </button>
             <button 
               onClick={() => window.ipcRenderer.send('win:hide')}
               className="flex items-center justify-center gap-2 px-2 py-2 bg-card text-card-foreground border border-border rounded-md cursor-pointer shadow-sm text-xs font-medium hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-all"
             >
               Close
             </button>
          </div>
        </div>
      </div>
    </div>
  )
}
