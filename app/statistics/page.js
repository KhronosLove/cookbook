'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  startOfYear, 
  endOfYear, 
  eachDayOfInterval, 
  isAfter, 
  startOfDay,
  getDate 
} from 'date-fns'
import { zhCN } from 'date-fns/locale'

export default function Statistics() {
  const [rangeType, setRangeType] = useState('week')
  
  // --- 关键修复 1: 初始状态设为 null，避免服务端与手机端时间不一致导致的渲染崩溃 ---
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  
  const [chartData, setChartData] = useState([])
  const [avgCalories, setAvgCalories] = useState(0)
  const [isClient, setIsClient] = useState(false)

  // 初始化：仅在客户端启动时计算日期
  useEffect(() => {
    setIsClient(true)
    handleRangeChange('week')
  }, [])

  // 监听日期变化去请求数据
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchData()
    }
  }, [dateRange])

  const handleRangeChange = (type) => {
    setRangeType(type)
    const now = new Date()
    
    if (type === 'week') {
      setDateRange({ 
        start: startOfWeek(now, { weekStartsOn: 1 }), // 周一为起始
        end: endOfWeek(now, { weekStartsOn: 1 }) 
      })
    } else if (type === 'month') {
      setDateRange({ start: startOfMonth(now), end: endOfMonth(now) })
    } else if (type === 'year') {
      setDateRange({ start: startOfYear(now), end: endOfYear(now) })
    }
  }

  const fetchData = async () => {
    if (!dateRange.start) return

    const startStr = format(dateRange.start, 'yyyy-MM-dd')
    const endStr = format(dateRange.end, 'yyyy-MM-dd')

    const { data: logs } = await supabase
      .from('daily_logs')
      .select('log_date, intake_calories, intake_protein, intake_fat, intake_carbs')
      .gte('log_date', startStr)
      .lte('log_date', endStr)

    if (!logs) return

    // 1. 数据聚合
    const dataMap = {}
    logs.forEach(log => {
      const key = log.log_date
      if (!dataMap[key]) dataMap[key] = { cal: 0, p: 0, f: 0, c: 0 }
      dataMap[key].cal += log.intake_calories
      dataMap[key].p += log.intake_protein
      dataMap[key].f += log.intake_fat
      dataMap[key].c += log.intake_carbs
    })

    // 2. 生成图表轴
    const today = startOfDay(new Date())
    let displayEnd = dateRange.end
    
    // 隐藏未来日期
    if (isAfter(displayEnd, today)) {
      displayEnd = today
    }

    const days = eachDayOfInterval({ start: dateRange.start, end: displayEnd })
    
    const filledData = days.map(day => {
      const k = format(day, 'yyyy-MM-dd')
      const val = dataMap[k] || { cal: 0, p: 0, f: 0, c: 0 }
      
      let label = ''
      if (rangeType === 'week') {
        label = format(day, 'EEE', { locale: zhCN })
      } else if (rangeType === 'year') {
        label = getDate(day) === 1 ? format(day, 'M月') : '' 
      } else {
        label = format(day, 'd日')
      }

      return {
        name: label, 
        fullDate: k,     
        cal: val.cal,
        p: val.p,
        f: val.f,
        c: val.c
      }
    })

    setChartData(filledData)

    // 3. 计算日均
    const totalCal = logs.reduce((sum, l) => sum + l.intake_calories, 0)
    const uniqueDays = new Set(logs.map(l => l.log_date)).size
    setAvgCalories(uniqueDays > 0 ? Math.round(totalCal / uniqueDays) : 0)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload 
      
      return (
        <div className="bg-white p-3 border border-gray-100 rounded-xl shadow-xl text-xs z-50">
          <p className="font-bold text-gray-900 mb-2">{dataItem.fullDate}</p>
          {payload.map((entry, index) => {
            let nameCN = entry.name
            let unit = 'g'
            if (entry.dataKey === 'cal') { nameCN = '热量'; unit = 'kcal' }
            if (entry.dataKey === 'c') nameCN = '碳水'
            if (entry.dataKey === 'p') nameCN = '蛋白质'
            if (entry.dataKey === 'f') nameCN = '脂肪'

            return (
              <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.fill }}></div>
                <span className="text-gray-500 w-12">{nameCN}</span>
                <span className="font-mono font-bold text-gray-800">
                  {Number(entry.value).toFixed(1)} {unit}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  const ChartBlock = ({ title, dataKey, color }) => (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm mb-4">
      <h3 className="font-bold text-sm text-gray-500 uppercase mb-4">{title}</h3>
      <div className="h-48 w-full">
        {/* 关键修复 3: width="99%" 避免手机端 Flex 容器撑开导致的宽度 bug */}
        <ResponsiveContainer width="99%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6"/>
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{fontSize: 10, fill: '#9ca3af'}} 
              interval={rangeType === 'year' ? 0 : rangeType === 'month' ? 2 : 0} 
            />
            <Tooltip content={<CustomTooltip />} cursor={{fill: '#f9fafb'}} />
            <Bar 
              dataKey={dataKey} 
              fill={color} 
              radius={[2, 2, 0, 0]} 
              barSize={rangeType === 'week' ? 24 : rangeType === 'month' ? 8 : 2}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )

  // 防止 SSR 渲染不一致
  if (!isClient || !dateRange.start) {
    return (
      <>
        <Navbar />
        <PageContainer>
          <div className="p-6 flex justify-center pt-20">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
          </div>
        </PageContainer>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <PageContainer>
        <div className="p-6">
          
          {/* --- 修复 1: 布局改为 items-start 以适配手机左对齐 --- */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">饮食统计</h1>
              <p className="text-gray-500 text-xs mt-1 font-mono">
                {format(dateRange.start, 'yyyy/MM/dd')} - {format(dateRange.end, 'yyyy/MM/dd')}
              </p>
            </div>
            
            <div className="flex bg-gray-100 p-1 rounded-xl shrink-0 w-full md:w-auto">
              {['week', 'month', 'year'].map(t => (
                <button 
                  key={t}
                  onClick={() => handleRangeChange(t)}
                  // 增加 flex-1 让按钮在手机上平分宽度
                  className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${rangeType === t ? 'bg-white shadow-sm text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {t === 'week' ? '本周' : t === 'month' ? '本月' : '本年'}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-8">
             <div className="inline-block bg-black text-white px-5 py-3 rounded-xl shadow-lg shadow-black/10">
               <div className="text-xs opacity-60 mb-1 uppercase tracking-wider">日均热量 (有记录日)</div>
               <div className="text-2xl font-bold">{avgCalories} <span className="text-sm font-normal opacity-60">kcal</span></div>
             </div>
          </div>

          <div className="space-y-6">
            <ChartBlock title="总热量 (kcal)" dataKey="cal" color="#111" />
            <ChartBlock title="碳水化合物 (g)" dataKey="c" color="#3b82f6" />
            <ChartBlock title="蛋白质 (g)" dataKey="p" color="#f97316" />
            <ChartBlock title="脂肪 (g)" dataKey="f" color="#eab308" />
          </div>
        </div>
      </PageContainer>
    </>
  )
}