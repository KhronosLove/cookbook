'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Edit2, Trash2, AlertCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

export default function RecipeDetail() {
  const { id } = useParams()
  const router = useRouter()
  
  const [recipe, setRecipe] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [nutrition, setNutrition] = useState({ cal: 0, p: 0, f: 0, c: 0 })

  const fmt = (n) => Number(n || 0).toFixed(1)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: r, error: rError } = await supabase.from('recipes').select('*').eq('id', id).single()
        if (rError) throw rError
        if (!r) throw new Error('未找到该菜谱')
        setRecipe(r)

        const { data: i, error: iError } = await supabase.from('recipe_items').select(`*, ingredients_library (name, calories, protein, fat, carbs)`).eq('recipe_id', id)
        if (iError) throw iError
        setItems(i || [])

        if (i) {
          let n = { cal: 0, p: 0, f: 0, c: 0 }
          i.forEach(item => {
            if (item.is_main && item.ingredients_library) {
              const ratio = (item.amount_g || 0) / 100
              n.cal += (item.ingredients_library.calories || 0) * ratio
              n.p += (item.ingredients_library.protein || 0) * ratio
              n.f += (item.ingredients_library.fat || 0) * ratio
              n.c += (item.ingredients_library.carbs || 0) * ratio
            }
          })
          setNutrition(n)
        }
      } catch (err) { setErrorMsg(err.message || '加载失败') } finally { setLoading(false) }
    }
    if (id) fetchData()
  }, [id])

  const handleDelete = async () => { 
    if (!confirm('确定要删除这道菜吗？')) return
    const { error } = await supabase.from('recipes').delete().eq('id', id)
    if (!error) router.replace('/recipes') 
  }

  const handleBack = () => {
    router.push('/recipes')
  }

  if (loading) return <div className="min-h-screen bg-gray-50 pt-20 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div></div>
  
  if (errorMsg || !recipe) return (
    <>
      <Navbar />
      <PageContainer>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle size={48} className="text-gray-300 mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">无法打开菜谱</h2>
          <p className="text-gray-500">{errorMsg}</p>
          <button onClick={handleBack} className="mt-4 text-blue-600 underline">返回列表</button>
        </div>
      </PageContainer>
    </>
  )

  return (
    <>
      <Navbar />
      <PageContainer>
        {/* 顶部大图 */}
        <div className="relative h-64 sm:h-80 w-full bg-gray-100 group">
          {recipe.cover_image ? (
            <img src={recipe.cover_image} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">暂无封面</div>
          )}
          
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => router.push(`/recipes/${id}/edit`)} className="bg-white/90 text-black px-3 py-1.5 rounded-full shadow-lg hover:bg-white text-xs font-bold flex items-center gap-1 backdrop-blur-md transition-all"><Edit2 size={14} /> 编辑</button>
            <button onClick={handleDelete} className="bg-white/90 text-red-500 p-1.5 rounded-full shadow-lg hover:bg-red-50 hover:text-red-600 backdrop-blur-md transition-all"><Trash2 size={16} /></button>
          </div>
          
          <button onClick={handleBack} className="absolute top-4 left-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-all">
            <ArrowLeft size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4 sm:p-8"> {/* 手机上 padding 稍微改小一点 */}
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">{recipe.title}</h1>
            <div className="flex flex-wrap gap-2">{recipe.tags?.map(t => (<span key={t} className="text-xs font-bold bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md">{t}</span>))}</div>
          </div>
          {recipe.description && (<div className="bg-gray-50 p-4 sm:p-5 rounded-2xl text-sm text-gray-600 leading-relaxed mb-8 border border-gray-100">{recipe.description}</div>)}

          {/* --- 营养素仪表盘 (响应式字体优化) --- */}
          {/* gap-2 在手机上更紧凑，sm:gap-3 在电脑上更宽敞 */}
          <div className="grid grid-cols-4 gap-2 sm:gap-3 mb-10">
            {/* 总热量卡片 */}
            <div className="bg-black text-white p-2 sm:p-4 rounded-2xl text-center shadow-xl shadow-black/10 flex flex-col justify-center">
              <div className="text-[10px] sm:text-xs opacity-60 uppercase tracking-widest mb-0.5 sm:mb-1">总热量</div>
              <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-center gap-0 sm:gap-1">
                {/* 手机用 text-lg, 电脑用 text-2xl */}
                <span className="font-bold text-lg sm:text-2xl leading-tight">{fmt(nutrition.cal)}</span>
                <span className="text-[10px] sm:text-xs opacity-60">kcal</span>
              </div>
            </div>
            
            {/* 宏量卡片 (C-P-F) */}
            {[ 
              {k:'c', label:'碳水', color:'blue'}, 
              {k:'p', label:'蛋白质', color:'orange'}, 
              {k:'f', label:'脂肪', color:'red',text: 'text-red-900'} 
            ].map(item => (
              <div key={item.k} className={`p-2 sm:p-4 rounded-2xl text-center border bg-${item.color}-50 border-${item.color}-100 text-${item.color}-900 flex flex-col justify-center`}>
                <div className="text-[14px] sm:text-xs opacity-90 uppercase tracking-widest mb-0.5 sm:mb-1">{item.label}</div>
                <div className="flex flex-col sm:flex-row items-center sm:items-baseline justify-center gap-0 sm:gap-0.5">
                    {/* 手机用 text-base, 电脑用 text-xl */}
                    <span className="font-bold text-base sm:text-xl leading-tight">{fmt(nutrition[item.k])}</span>
                    <span className="text-[12px] sm:text-xs opacity-90">g</span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-6">
              <h2 className="font-bold text-lg flex items-center gap-2"><span className="w-1.5 h-6 bg-black rounded-full"></span> 食材清单</h2>
              <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-orange-50/50 p-4 border-b border-orange-100/50">
                   <h3 className="text-xs font-bold text-orange-900/50 mb-3 uppercase tracking-wider">主要食材</h3>
                   {items.filter(i => i.is_main).length > 0 ? (items.filter(i => i.is_main).map(item => (<div key={item.id} className="flex justify-between text-sm py-2 border-b border-dashed border-orange-200/50 last:border-0"><span className="font-bold text-gray-800">{item.ingredients_library?.name}</span><span className="font-mono font-medium text-orange-600">{item.amount_g}g</span></div>))) : <div className="text-xs text-gray-400">无</div>}
                </div>
                <div className="p-4 bg-gray-50/50">
                  <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">配料 / 调味</h3>
                  {items.filter(i => !i.is_main).length > 0 ? (items.filter(i => !i.is_main).map(item => (<div key={item.id} className="flex justify-between text-sm py-1.5 text-gray-600"><span>{item.ingredients_library?.name}</span><span>{item.amount_g}</span></div>))) : <div className="text-xs text-gray-400">无</div>}
                </div>
              </div>
            </div>
            <div className="md:col-span-7">
              <h2 className="font-bold text-lg mb-6 flex items-center gap-2"><span className="w-1.5 h-6 bg-black rounded-full"></span> 烹饪步骤</h2>
              <div className="prose prose-sm sm:prose-base max-w-none text-gray-700 [&>p]:mb-4 [&>h2]:text-gray-900 [&>h2]:font-bold [&>h2]:mt-8 [&>h2]:mb-4 [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>img]:rounded-xl [&>img]:shadow-md [&>img]:border [&>img]:border-gray-100 [&>img]:mx-auto" dangerouslySetInnerHTML={{ __html: recipe.steps }} />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  )
}