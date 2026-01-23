'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Search, X, Camera, Trash2, Settings2, ChevronDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

// ... (COLORS, MEAL_CONFIG, UNIT_OPTIONS 保持不变) ...
const COLORS = {
  carbs: { label: '碳水', bg: 'bg-indigo-50', text: 'text-indigo-600', bar: 'bg-indigo-500', border: 'focus:border-indigo-500' },
  protein: { label: '蛋白质', bg: 'bg-amber-50', text: 'text-amber-600', bar: 'bg-amber-500', border: 'focus:border-amber-500' },
  fat: { label: '脂肪', bg: 'bg-rose-50', text: 'text-rose-600', bar: 'bg-rose-500', border: 'focus:border-rose-500' },
}

const MEAL_CONFIG = {
  Breakfast: { label: '早餐', emoji: '🌅', sub: '开启美好的一天' },
  Lunch: { label: '午餐', emoji: '☀️', sub: '补充能量' },
  Dinner: { label: '晚餐', emoji: '🌙', sub: '享受夜晚' },
  Snack: { label: '加餐', emoji: '🍪', sub: '小零食' }
}

const UNIT_OPTIONS = [
  { value: 'g', label: '克 (g)', defaultWeight: 1 },
  { value: 'ml', label: '毫升 (ml)', defaultWeight: 1 },
  { value: 'pkg', label: '包/袋', defaultWeight: 100 },
  //{ value: 'box', label: '盒', defaultWeight: 250 },
  //{ value: 'bowl', label: '碗', defaultWeight: 300 },
  //{ value: 'cup', label: '杯', defaultWeight: 250 },
  { value: 'serving', label: '份', defaultWeight: 100 },
  { value: 'piece', label: '个/只', defaultWeight: 50 },
  //{ value: 'slice', label: '片', defaultWeight: 30 },
  //{ value: 'scoop', label: '勺', defaultWeight: 15 },
]

export default function Diary() {
  const router = useRouter()
  
  // --- State (保持不变) ---
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [logs, setLogs] = useState([])
  const [summary, setSummary] = useState({ cal: 0, p: 0, f: 0, c: 0 })
  
  const [mealType, setMealType] = useState('Breakfast')
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goals, setGoals] = useState({ p: 60, f: 60, c: 200 }) 
  const [tempGoals, setTempGoals] = useState({ p: 0, f: 0, c: 0 })
  
  const [showModal, setShowModal] = useState(false)
  const [mode, setMode] = useState('search') 
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState({ recipes: [], ingredients: [], products: [] })
  
  const [formItem, setFormItem] = useState({
    id: null, name: '', image_url: '', 
    amount: 100,
    unit: 'g', unitWeight: 1, 
    calories: 0, protein: 0, fat: 0, carbs: 0,
    density: { cal: 0, p: 0, f: 0, c: 0 }, type: 'ingredient'
  })

  const [history, setHistory] = useState([])
  const [pressTimer, setPressTimer] = useState(null) 

  const fmt = (n) => Number(n || 0).toFixed(1)
  const isCompactMode = mode === 'detail' || mode === 'edit'

  // --- Effects (保持不变) ---
  useEffect(() => { fetchLogs(); fetchGoals(); }, [date])
  useEffect(() => {
    const saved = localStorage.getItem('diary_food_history')
    if (saved) try { setHistory(JSON.parse(saved)) } catch (e) {}
  }, [])
  
  // Custom模式下自动计算热量 (依然适用：1g碳水=4kcal，不管这1g是在100g里还是1份里)
  useEffect(() => {
    if (mode === 'custom') {
      const p = parseFloat(formItem.protein) || 0
      const f = parseFloat(formItem.fat) || 0
      const c = parseFloat(formItem.carbs) || 0
      setFormItem(prev => ({ ...prev, calories: (p * 4) + (c * 4) + (f * 9) }))
    }
  }, [formItem.protein, formItem.fat, formItem.carbs, mode])

  // --- Logic Functions (Fetch, History, Search... 保持不变) ---
  const fetchLogs = async () => {
    const { data } = await supabase.from('daily_logs').select('*').eq('log_date', date).order('created_at')
    if (data) {
      setLogs(data)
      const sum = data.reduce((acc, curr) => ({
        cal: acc.cal + (curr.intake_calories || 0),
        p: acc.p + (curr.intake_protein || 0),
        f: acc.f + (curr.intake_fat || 0),
        c: acc.c + (curr.intake_carbs || 0),
      }), { cal:0, p:0, f:0, c:0 })
      setSummary(sum)
    }
  }

  const fetchGoals = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('daily_goals').select('*').eq('user_id', user.id).lte('apply_date', date).order('apply_date', { ascending: false }).limit(1).single()
    if (data) setGoals({ p: data.target_protein, f: data.target_fat, c: data.target_carbs })
    else setGoals({ p: 60, f: 60, c: 200 })
  }

  const saveToHistory = (item, type) => {
    const historyItem = { id: item.id, name: item.title || item.name, image_url: item.cover_image || item.image_url || '', calories: item.calories, type: type, timestamp: Date.now() }
    setHistory(prev => {
      const filtered = prev.filter(h => h.name !== historyItem.name)
      const newHistory = [historyItem, ...filtered].slice(0, 20)
      localStorage.setItem('diary_food_history', JSON.stringify(newHistory))
      return newHistory
    })
  }
  const clearHistory = () => { if (!confirm('确定清空?')) return; setHistory([]); localStorage.removeItem('diary_food_history') }
  const handleTouchStart = (name) => { const timer = setTimeout(() => { if(confirm(`删除 "${name}" ?`)) { setHistory(prev => { const nw = prev.filter(h => h.name !== name); localStorage.setItem('diary_food_history', JSON.stringify(nw)); return nw }) } setPressTimer(null) }, 600); setPressTimer(timer) }
  const handleTouchEnd = () => { if (pressTimer) { clearTimeout(pressTimer); setPressTimer(null) } }

  const handleSearch = async (text) => {
    setSearch(text)
    if (!text) { setSearchResults({ recipes:[], ingredients:[], products:[] }); return }
    const [resRecipes, resIng, resProd] = await Promise.all([
      supabase.from('recipes').select('id, title, cover_image').ilike('title', `%${text}%`).limit(10),
      supabase.from('ingredients_library').select('*').ilike('name', `%${text}%`).limit(20),
      supabase.from('products_library').select('*').ilike('name', `%${text}%`).limit(20)
    ])
    setSearchResults({ recipes: resRecipes.data || [], ingredients: resIng.data || [], products: resProd.data || [] })
  }

  const handleSelectSearchResult = async (item, type) => {
    saveToHistory(item, type)
    let density = { cal: item.calories || 0, p: item.protein || 0, f: item.fat || 0, c: item.carbs || 0 }
    
    // 如果是菜谱，需要根据配料表反推总热量密度
    if (type === 'recipe') {
      const { data: items } = await supabase.from('recipe_items').select('amount_g, ingredients_library(calories, protein, fat, carbs)').eq('recipe_id', item.id)
      if (items && items.length > 0) {
        let totalWeight = 0; let totalNutri = { cal: 0, p: 0, f: 0, c: 0 }
        items.forEach(i => {
          const w = i.amount_g || 0; totalWeight += w
          if (i.ingredients_library) {
            const ratio = w / 100; 
            totalNutri.cal += (i.ingredients_library.calories||0)*ratio; 
            totalNutri.p += (i.ingredients_library.protein||0)*ratio; 
            totalNutri.f += (i.ingredients_library.fat||0)*ratio; 
            totalNutri.c += (i.ingredients_library.carbs||0)*ratio
          }
        })
        if (totalWeight > 0) { 
            const factor = 100 / totalWeight; 
            density = { cal: totalNutri.cal * factor, p: totalNutri.p * factor, f: totalNutri.f * factor, c: totalNutri.c * factor } 
        }
      }
    }

    setFormItem({ 
        id: null, name: item.title || item.name, image_url: item.cover_image || item.image_url || '', 
        amount: 100, 
        unit: 'g', unitWeight: 1, 
        calories: density.cal, protein: density.p, fat: density.f, carbs: density.c, 
        density: density, // 搜索结果通常是标准化的，保留密度方便 g 单位计算
        type: type 
    })
    setSearch(''); setMode('detail')
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    try {
      const fileExt = file.name.split('.').pop(); const filePath = `diary/${Math.random()}.${fileExt}`
      const { error } = await supabase.storage.from('recipe-images').upload(filePath, file)
      if (error) throw error; const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
      setFormItem(prev => ({ ...prev, image_url: data.publicUrl }))
    } catch (err) { alert('上传失败') }
  }

  const handleSaveGoal = async () => {
    const { data: { user } } = await supabase.auth.getUser()

    
    const { error } = await supabase.from('daily_goals').upsert({ user_id: user.id, apply_date: date, target_protein: tempGoals.p, target_fat: tempGoals.f, target_carbs: tempGoals.c }, { onConflict: 'user_id, apply_date' })
    if (!error) { setGoals(tempGoals); setShowGoalModal(false) }
  }

  // --- [核心修改] Save Logic ---
  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // 计算总克数 (用于 amount_g 字段，方便数据库统一存储重量)
    const quantity = parseFloat(formItem.amount) || 0
    const totalGrams = quantity * parseFloat(formItem.unitWeight)

    let payload = { 
        user_id: user.id, log_date: date, meal_type: mealType, 
        food_name: formItem.name, image_url: formItem.image_url, 
        amount_g: totalGrams 
    }

    // 保存到自定义库
    if (mode === 'custom') {
      await supabase.from('products_library').insert([{
        user_id: user.id, name: formItem.name, image_url: formItem.image_url,
        calories: formItem.calories, protein: formItem.protein, fat: formItem.fat, carbs: formItem.carbs,
        unit: formItem.unit // 保存单位
      }])
    }

    // [逻辑修正] 计算摄入量
    let finalRatio = 0
    
    // 基础数值 (来自 density 或者 直接输入)
    const baseCal = formItem.density?.cal || formItem.calories
    const baseP = formItem.density?.p || formItem.protein
    const baseF = formItem.density?.f || formItem.fat
    const baseC = formItem.density?.c || formItem.carbs

    if (formItem.unit === 'g' || formItem.unit === 'ml') {
        // 如果单位是克/毫升，输入的是密度 (每100g)，所以需要除以100
        finalRatio = quantity / 100
    } else {
        // [关键] 如果单位是份/包/个，输入的就是“单份”数值，直接乘以数量即可
        // 比如：1份含200卡，吃了2份 -> 200 * 2
        finalRatio = quantity
    }

    payload.intake_calories = baseCal * finalRatio
    payload.intake_protein = baseP * finalRatio
    payload.intake_fat = baseF * finalRatio
    payload.intake_carbs = baseC * finalRatio

    if (mode === 'edit') await supabase.from('daily_logs').update(payload).eq('id', formItem.id)
    else await supabase.from('daily_logs').insert([payload])

    closeModal(); fetchLogs()
  }

  const handleDelete = async () => { if(!confirm('删除?')) return; await supabase.from('daily_logs').delete().eq('id', formItem.id); closeModal(); fetchLogs() }
  const handleQuickDelete = async (e, id) => { e.stopPropagation(); if(!confirm('删除?')) return; await supabase.from('daily_logs').delete().eq('id', id); fetchLogs() }

  const openEditModal = (log) => {
    setMealType(log.meal_type); setMode('edit')
    const amount = log.amount_g || 100
    
    // 反推逻辑稍微复杂一点，因为存的是总数
    // 这里简单反推回 100g 密度用于显示，或者你可以根据 saved unit 优化
    // 为了简单，编辑时我们通常回到 'g' 模式
    const density = { cal: (log.intake_calories/amount)*100, p: (log.intake_protein/amount)*100, f: (log.intake_fat/amount)*100, c: (log.intake_carbs/amount)*100 }
    
    setFormItem({ 
        id: log.id, name: log.food_name, image_url: log.image_url, 
        amount: amount, 
        unit: 'g', unitWeight: 1, // 编辑模式暂时重置为克，这是最稳妥的
        calories: density.cal, protein: density.p, fat: density.f, carbs: density.c, 
        density: density, type: 'unknown' 
    })
    setShowModal(true)
  }

  const closeModal = () => { setShowModal(false); setMode('search'); setSearch(''); setFormItem({ id:null, name:'', image_url:'', amount:100, unit:'g', unitWeight:1, calories:0, protein:0, fat:0, carbs:0, density:{}, type:'ingredient' }) }

  // [修改] 预览逻辑：同步 handleSave 的逻辑
  const preview = (() => {
    const quantity = parseFloat(formItem.amount) || 0
    const baseCal = formItem.density?.cal || formItem.calories
    
    if (formItem.unit === 'g' || formItem.unit === 'ml') {
        return { cal: baseCal * (quantity / 100) }
    } else {
        // 如果是份，直接乘数量
        return { cal: baseCal * quantity }
    }
  })()

  // 单位切换
  const handleUnitChange = (e) => {
    const selectedUnit = e.target.value
    const config = UNIT_OPTIONS.find(u => u.value === selectedUnit)
    // 切换单位时，重置数量为1，克重为默认值
    setFormItem(prev => ({ ...prev, unit: selectedUnit, unitWeight: config ? config.defaultWeight : 1, amount: 1 }))
  }

  const targetCalories = (goals.c * 4) + (goals.p * 4) + (goals.f * 9)
  const ProgressBar = ({ current, target, colorClass }) => {
    const percent = Math.min(100, (current / target) * 100)
    return (<div className="h-2 w-full bg-white/60 rounded-full overflow-hidden mt-2 ring-1 ring-black/5"><div className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`} style={{ width: `${percent}%` }}></div></div>)
  }

  return (
    <>
      <Navbar />
      <PageContainer>
        {/* --- 日期导航 --- */}
        <div className="flex items-center justify-between py-4 sticky top-0 z-20 bg-[#F9FAFB]/95 backdrop-blur-sm transition-all">
           <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().split('T')[0]) }} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-900"><ChevronLeft size={20}/></button>
           <div className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
             <span>{date}</span>
             {date === new Date().toISOString().split('T')[0] && <span className="text-[10px] bg-black text-white px-2 py-0.5 rounded-full font-bold">Today</span>}
           </div>
           <button onClick={() => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().split('T')[0]) }} className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-slate-400 hover:text-slate-900"><ChevronRight size={20}/></button>
        </div>

        <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* --- 目标仪表盘 (保持不变) --- */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-slate-50 rounded-full blur-3xl opacity-50 pointer-events-none"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div>
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">今日摄入</h2>
                <div className="flex items-baseline gap-1.5">
                   <span className="text-4xl font-black text-slate-900 tracking-tight">{Math.round(summary.cal)}</span>
                   <span className="text-sm font-bold text-slate-400">/ {Math.round(targetCalories)} kcal</span>
                </div>
              </div>
              <button onClick={() => { setTempGoals(goals); setShowGoalModal(true) }} className="group flex items-center gap-1.5 text-xs font-bold bg-slate-50 text-slate-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors">
                <Settings2 size={14} className="group-hover:rotate-90 transition-transform duration-300"/> 设置目标
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 relative z-10">
              {['carbs', 'protein', 'fat'].map(k => (
                <div key={k} className={`${COLORS[k].bg} p-4 rounded-2xl border ${COLORS[k].border.replace('focus:', '')} border-opacity-20 flex flex-col items-center justify-center text-center`}>
                  <span className={`text-xs font-bold ${COLORS[k].text} mb-1`}>{COLORS[k].label}</span>
                  <span className="text-[10px] text-slate-500 font-medium mb-1">{Math.round(summary[k[0]])}/{goals[k[0]]}g</span>
                  <div className="w-full"><ProgressBar current={summary[k[0]]} target={goals[k[0]]} colorClass={COLORS[k].bar} /></div>
                </div>
              ))}
            </div>
          </div>

          {/* --- 餐饮列表 --- */}
          <div className="space-y-6">
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map(type => {
              const typeLogs = logs.filter(l => l.meal_type === type)
              const subSum = typeLogs.reduce((acc, l) => ({ cal: acc.cal + l.intake_calories, p: acc.p + l.intake_protein, f: acc.f + l.intake_fat, c: acc.c + l.intake_carbs }), { cal:0, p:0, f:0, c:0 })
              const conf = MEAL_CONFIG[type]
              return (
                <div key={type} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="flex justify-between items-center mb-5 pb-4 border-b border-slate-50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-xl shadow-inner">{conf.emoji}</div>
                        <div><h3 className="font-bold text-lg text-slate-900 leading-none">{conf.label}</h3><p className="text-[10px] text-slate-400 mt-1 font-medium">{conf.sub}</p></div>
                      </div>
                      <div className="text-right">
                        <span className="block text-sm font-black text-slate-900">{Math.round(subSum.cal)} <span className="text-[10px] font-normal text-slate-400">kcal</span></span>
                        <div className="flex gap-2 text-[10px] font-bold mt-1 justify-end opacity-70">
                            <span className={COLORS.carbs.text}>碳水:{Math.round(subSum.c)}</span>
                            <span className={COLORS.protein.text}>蛋白质:{Math.round(subSum.p)}</span>
                            <span className={COLORS.fat.text}>脂肪:{Math.round(subSum.f)}</span>
                        </div>
                      </div>
                  </div>
                  <div className="space-y-3">
                    {typeLogs.map(log => (
                      <div key={log.id} onClick={() => openEditModal(log)} className="group flex justify-between items-center p-2 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer -mx-2">
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100 shadow-sm relative">
                             {log.image_url ? <img src={log.image_url} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">{log.food_name?.[0]}</div>}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate group-hover:text-black transition-colors">{log.food_name}</div>
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400 mt-0.5">
                               <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md">{fmt(log.amount_g)}g</span>
                               <span className="hidden sm:inline w-0.5 h-3 bg-slate-200"></span>
                               <div className="flex gap-1.5"><span className="text-indigo-400">碳水:{fmt(log.intake_carbs)}</span><span className="text-amber-400">蛋白质:{fmt(log.intake_protein)}</span><span className="text-rose-400">脂肪:{fmt(log.intake_fat)}</span></div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 pl-2">
                            <span className="font-bold text-slate-900 text-sm">{Math.round(log.intake_calories)}</span>
                            <button onClick={(e) => handleQuickDelete(e, log.id)} className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-2 rounded-full transition-all"><Trash2 size={16}/></button>
                        </div>
                      </div>
                    ))}
                    {typeLogs.length === 0 && <div className="py-6 text-center"><div className="text-2xl opacity-20 grayscale mb-2">{conf.emoji}</div><div className="text-xs text-slate-300 font-medium">还没有记录{conf.label}</div></div>}
                  </div>
                  <button onClick={() => { setMealType(type); setMode('search'); setShowModal(true) }} className="mt-4 w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-400 hover:text-white hover:bg-black rounded-xl transition-all border border-dashed border-slate-200 hover:border-transparent group">
                    <Plus size={14} className="group-hover:scale-110 transition-transform"/> 记录{conf.label}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </PageContainer>

      {/* --- 目标设置 Modal (保持不变) --- */}
      {showGoalModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl">
            <h3 className="font-bold text-xl mb-6 text-slate-900 text-center">🎯 设置今日目标</h3>
            <div className="space-y-5">
              {[{ k:'c', key: 'c', ...COLORS.carbs }, { k:'p', key: 'p', ...COLORS.protein }, { k:'f', key: 'f', ...COLORS.fat }].map(item => (
                <div key={item.key}><label className={`text-xs font-bold ${item.text} uppercase tracking-wider mb-1 block ml-1`}>{item.label} (g)</label><input type="number" onFocus={(e)=>e.target.select()} className={`w-full bg-slate-50 border-b-2 border-slate-100 p-3 rounded-t-xl text-xl font-bold outline-none ${item.border} transition-colors text-slate-900`} value={tempGoals[item.key]} onChange={e=>setTempGoals({...tempGoals, [item.key]:e.target.value})}/></div>
              ))}
              <div className="bg-slate-900 text-white p-4 rounded-2xl text-center mt-4 shadow-lg shadow-slate-900/20"><div className="text-xs opacity-60 mb-1 uppercase tracking-widest">预计总热量</div><div className="text-2xl font-black">{(tempGoals.c*4 + tempGoals.p*4 + tempGoals.f*9)} <span className="text-sm font-normal opacity-60">kcal</span></div></div>
              <div className="flex gap-3 mt-4"><button onClick={() => setShowGoalModal(false)} className="flex-1 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-xl transition-colors">取消</button><button onClick={handleSaveGoal} className="flex-1 bg-black text-white py-3.5 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">保存设置</button></div>
            </div>
          </div>
        </div>
      )}

      {/* --- 搜索/添加 Modal --- */}
      {showModal && (
        <div className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center sm:p-4 animate-in slide-in-from-bottom-10 duration-300`}>
          <div className={`bg-white w-full overflow-hidden shadow-2xl flex flex-col relative ${isCompactMode ? 'h-auto sm:max-w-sm sm:rounded-3xl' : 'h-full sm:h-[85vh] sm:max-w-2xl sm:rounded-3xl' }`}>
            <button onClick={closeModal} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full z-20 transition-colors text-slate-500"><X size={20}/></button>
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 scroll-smooth">
              
              {/* Search Mode */}
              {mode === 'search' && !formItem.name && (
                <div className="mt-8 text-center max-w-lg mx-auto">
                   <div className="w-16 h-16 bg-slate-50 rounded-2xl mx-auto flex items-center justify-center text-slate-300 mb-6"><Search size={32}/></div>
                   <h3 className="text-2xl font-bold text-slate-900 mb-6">今天吃了什么？</h3>
                   <div className="relative mb-8">
                     <input autoFocus className="w-full bg-slate-50 p-4 rounded-2xl text-lg font-bold text-center outline-none focus:ring-2 focus:ring-black/5 focus:bg-white transition-all text-slate-900 placeholder:text-slate-300" placeholder="搜索菜谱、食材、零食..." value={search} onChange={e => handleSearch(e.target.value)}/>
                   </div>
                   {!search && history.length > 0 && (
                     <div className="text-left animate-in fade-in slide-in-from-bottom-2 mb-8">
                       <div className="flex justify-between items-end mb-3 px-1"><h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">最近添加</h4><button onClick={clearHistory} className="text-xs text-slate-300 hover:text-rose-500 transition-colors">清空</button></div>
                       <div className="flex flex-wrap gap-2">{history.map(item => (<button key={item.name} onClick={() => !pressTimer && handleSelectSearchResult(item, item.type)} onTouchStart={() => handleTouchStart(item.name)} onTouchEnd={handleTouchEnd} className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm font-bold text-slate-700 shadow-sm hover:border-black hover:shadow-md active:scale-95 transition-all select-none">{item.name}</button>))}</div>
                     </div>
                   )}
                   {search && (
                     <div className="space-y-6 text-left animate-in fade-in slide-in-from-bottom-2">
                        {searchResults.recipes.length > 0 && (<div><h4 className="text-xs font-bold text-slate-400 uppercase mb-3 pl-1">我的菜谱</h4><div className="space-y-2">{searchResults.recipes.map(r=>(<button key={r.id} onClick={()=>handleSelectSearchResult(r,'recipe')} className="w-full p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-4 hover:border-black transition-all group"><div className="w-12 h-12 bg-slate-100 rounded-lg bg-cover bg-center shrink-0" style={{backgroundImage:`url(${r.cover_image})`}}></div><div className="text-left"><div className="font-bold text-slate-900 group-hover:text-black">{r.title}</div><div className="text-xs text-orange-500 font-medium">整道菜</div></div></button>))}</div></div>)}
                        {[...searchResults.ingredients, ...searchResults.products].map(i => (
  <button 
    key={i.id} 
    onClick={()=>handleSelectSearchResult(i, i.calories ? 'product' : 'ingredient')} 
    className="w-full p-3 bg-white border border-slate-100 rounded-xl flex justify-between items-center hover:border-black transition-all group"
  >
    {/* 左侧：图片 + 文字 */}
    <div className="flex items-center gap-3 overflow-hidden">
      {/* 缩略图容器 */}
      <div className="w-10 h-10 bg-slate-100 rounded-lg shrink-0 overflow-hidden border border-slate-100 relative">
        {i.image_url ? (
          <img src={i.image_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-slate-300">
            {i.name?.[0]}
          </div>
        )}
      </div>
      
      {/* 文字信息 */}
      <div className="text-left min-w-0">
        <div className="font-bold text-slate-900 group-hover:text-black truncate">{i.name}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {fmt(i.calories)} kcal/{i.unit === 'g' || i.unit === 'ml' ? '100' : '1'}{i.unit}
        </div>
      </div>
    </div>

    {/* 右侧：加号图标 */}
    <Plus size={18} className="text-slate-300 group-hover:text-black shrink-0 ml-2"/>
  </button>
))}
                        {searchResults.recipes.length===0 && searchResults.ingredients.length===0 && searchResults.products.length===0 && (<div className="text-center py-8"><p className="text-slate-400 mb-4">未找到 "{search}"</p><button onClick={()=>{setMode('custom');setFormItem(prev=>({...prev,name:search}))}} className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors">创建自定义食物</button></div>)}
                     </div>
                   )}
                </div>
              )}

              {/* Detail / Edit Mode */}
              {(mode === 'detail' || mode === 'edit') && (
                 <div className="mx-auto pt-2 text-center">
                    <div className="w-20 h-20 bg-slate-100 mx-auto rounded-xl mb-3 flex items-center justify-center text-3xl shadow-inner overflow-hidden border border-slate-100">{formItem.image_url ? <img src={formItem.image_url} className="w-full h-full object-cover"/> : <span className="opacity-50 grayscale">🥘</span>}</div>
                    <h2 className="text-lg font-black text-slate-900 mb-2 leading-tight">{formItem.name}</h2>
                    
                    <div className="flex justify-center gap-2 mb-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-xs font-bold">C: {fmt(formItem.density?.c || formItem.carbs)}</span>
                        <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg text-xs font-bold">P: {fmt(formItem.density?.p || formItem.protein)}</span>
                        <span className="bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg text-xs font-bold">F: {fmt(formItem.density?.f || formItem.fat)}</span>
                    </div>
                    
                    {/* 数量与单位 */}
                    <div className="bg-slate-50 p-3 rounded-2xl mb-4 relative border border-slate-100 flex items-center justify-between gap-3">
                       <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block text-left">数量</label><input type="number" autoFocus onFocus={(e)=>e.target.select()} className="w-full bg-transparent text-left text-3xl font-black text-slate-900 outline-none p-0 placeholder:text-slate-200" value={formItem.amount} onChange={e => setFormItem({...formItem, amount: e.target.value})}/></div>
                       <div className="relative shrink-0"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block text-right">单位</label><div className="relative"><select value={formItem.unit} onChange={handleUnitChange} className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 font-bold text-slate-700 outline-none focus:border-black text-sm">{UNIT_OPTIONS.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}</select><ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div></div>
                    </div>
                    
                    {/* 单位换算提示 */}
                    <div className="text-[10px] text-slate-400 mb-4 font-medium flex justify-between px-1">
                        {formItem.unit !== 'g' && (<div className="flex items-center gap-2"><span>1 {UNIT_OPTIONS.find(u=>u.value===formItem.unit)?.label} ≈ </span><input type="number" className="w-10 border-b border-slate-300 text-center font-bold text-slate-600 bg-transparent outline-none focus:border-black" value={formItem.unitWeight} onChange={(e) => setFormItem({...formItem, unitWeight: e.target.value})}/><span>g</span></div>)}
                        <span>每100g含 {fmt(formItem.density?.cal || formItem.calories)} kcal</span>
                    </div>

                    <div className="bg-black text-white p-3 rounded-2xl shadow-xl shadow-black/20 mb-4 flex flex-col items-center justify-center"><div className="text-[10px] opacity-60 mb-0.5 font-medium tracking-wide">本次热量</div><div className="text-2xl font-black flex items-baseline gap-1">{fmt(preview.cal)} <span className="text-xs font-medium opacity-50">kcal</span></div></div>
                    <div className="flex gap-3">{mode === 'edit' && (<button onClick={handleDelete} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 size={18}/></button>)}<button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-lg">{mode === 'edit' ? '更新记录' : '确认添加'}</button></div>
                 </div>
              )}

              {/* Custom Food Mode (已升级支持单位) */}
              {mode === 'custom' && (
                 <div className="max-w-md mx-auto pt-4 space-y-6">
                    <h2 className="text-2xl font-black text-slate-900 text-center mb-8">自定义食物</h2>
                    <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden relative group border-2 border-dashed border-slate-300 flex-shrink-0">
                        {formItem.image_url ? <img src={formItem.image_url} className="w-full h-full object-cover"/> : <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Camera size={20}/></div>}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">名称</label>
                        <input className="w-full text-2xl font-bold border-b-2 border-slate-200 py-2 outline-none bg-transparent text-slate-900 placeholder:text-slate-300 focus:border-black transition-colors" placeholder="例如: 康师傅" value={formItem.name} onChange={e => setFormItem({...formItem, name: e.target.value})}/>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                       {/* [关键修改] 显示动态单位：每100g 或 每1份 */}
                       {['carbs','protein','fat'].map(k=>(
                         <div key={k} className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                           <label className="text-[10px] text-slate-400 uppercase font-bold block mb-2">
                             {k === 'carbs' ? '碳水' : k === 'protein' ? '蛋白质' : '脂肪'} 
                             {/* 动态显示单位 */}
                             <span className="opacity-60 ml-1">
                               {formItem.unit === 'g' || formItem.unit === 'ml' ? '(g/100g)' : `(g/1${UNIT_OPTIONS.find(u=>u.value===formItem.unit)?.label})`}
                             </span>
                           </label>
                           <input type="number" onFocus={(e)=>e.target.select()} className="w-full bg-transparent border-b border-slate-300 focus:border-black outline-none font-bold text-xl pb-1 text-slate-900" value={formItem[k]} onChange={e=>setFormItem({...formItem,[k]:e.target.value})}/>
                         </div>
                       ))}
                    </div>
                    <div className="bg-slate-900 text-white p-5 rounded-2xl text-center">
                       <div className="text-xs opacity-60 uppercase mb-1">
                         {/* 动态显示热量单位 */}
                         估算热量 {formItem.unit === 'g' || formItem.unit === 'ml' ? '(100g)' : `(1${UNIT_OPTIONS.find(u=>u.value===formItem.unit)?.label})`}
                       </div>
                       <div className="text-2xl font-black">{fmt(formItem.calories)} <span className="text-sm font-normal opacity-50">kcal</span></div>
                    </div>
                    
                    {/* [核心修改] 自定义模式下的摄入量：升级为支持单位 */}
                    <div className="border-t border-slate-100 pt-6">
                        <div className="bg-slate-50 p-3 rounded-2xl mb-2 relative border border-slate-100 flex items-center justify-between gap-3">
                           <div className="flex-1"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block text-left">本次摄入数量</label><input type="number" autoFocus onFocus={(e)=>e.target.select()} className="w-full bg-transparent text-left text-3xl font-black text-slate-900 outline-none p-0 placeholder:text-slate-200" value={formItem.amount} onChange={e => setFormItem({...formItem, amount: e.target.value})}/></div>
                           <div className="relative shrink-0"><label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block text-right">单位</label><div className="relative"><select value={formItem.unit} onChange={handleUnitChange} className="appearance-none bg-white border border-slate-200 rounded-xl py-2 pl-3 pr-8 font-bold text-slate-700 outline-none focus:border-black text-sm">{UNIT_OPTIONS.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}</select><ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/></div></div>
                        </div>
                        {formItem.unit !== 'g' && (<div className="text-[10px] text-slate-400 font-medium flex justify-end items-center gap-2 mb-4"><span>1 {UNIT_OPTIONS.find(u=>u.value===formItem.unit)?.label} ≈ </span><input type="number" className="w-10 border-b border-slate-300 text-center font-bold text-slate-600 bg-transparent outline-none focus:border-black" value={formItem.unitWeight} onChange={(e) => setFormItem({...formItem, unitWeight: e.target.value})}/><span>g</span></div>)}
                        
                        {/* 实时预览总热量 */}
                        <div className="text-center"><span className="text-xs text-slate-400">本次总计: </span><span className="font-bold text-slate-900">{fmt(preview.cal)} kcal</span></div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={()=>setMode('search')} className="px-6 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">取消</button>
                      <button onClick={handleSave} className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-bold text-lg shadow-lg">保存</button>
                    </div>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}