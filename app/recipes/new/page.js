'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Image as ImageIcon, Save, X } from 'lucide-react'
import TiptapEditor from '@/components/TiptapEditor'
import IngredientSelector from '@/components/IngredientSelector'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

export default function NewRecipe() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  // 基础信息
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  
  // 标签
  const [availableTags, setAvailableTags] = useState({})
  const [selectedTags, setSelectedTags] = useState([])
  
  // 食材分栏
  const [mainIngredients, setMainIngredients] = useState([
    { name: '', amount: '', is_main: true, id: null, calories: 0 }
  ])
  const [subIngredients, setSubIngredients] = useState([
    { name: '', amount: '', is_main: false }
  ])
  
  // 步骤 (HTML 格式)
  const [steps, setSteps] = useState('')

  useEffect(() => {
    const fetchTags = async () => {
      const { tagsData } = await supabase
        .from('defined_tags')
        .select('*')
        // 加上这两行核心排序逻辑
        .order('category_rank', { ascending: true }) // 先排大类
        .order('tag_rank', { ascending: true })      // 再排小标签
        .order('id', { ascending: true });           // 最后用ID兜底
      if (data) {
        const grouped = data.reduce((acc, curr) => {
          if (!acc[curr.category]) acc[curr.category] = []
          acc[curr.category].push(curr.name)
          return acc
        }, {})
        setAvailableTags(grouped)
      }
    }
    fetchTags()
  }, [])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const filePath = `${Math.random()}.${file.name.split('.').pop()}`
      const { error } = await supabase.storage.from('recipe-images').upload(filePath, file)
      if (error) throw error
      const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
      setCoverUrl(data.publicUrl)
    } catch (error) {
      alert('封面上传失败: ' + error.message)
    }
  }

  const modifyList = (list, setList, index, field, value) => {
    const newList = [...list]
    if (field === 'delete') newList.splice(index, 1)
    else newList[index][field] = value
    setList(newList)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return alert('请输入菜谱标题')
    
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('请先登录')

      // 1. 插入菜谱
      const { data: recipe, error } = await supabase.from('recipes').insert([{
        user_id: user.id,
        title,
        description: desc,
        cover_image: coverUrl,
        tags: selectedTags,
        steps: steps,
      }]).select().single()

      if (error) throw error

      // 2. 处理食材
      // A. 主料
      for (const item of mainIngredients) {
        if (!item.name) continue
        let ingId = item.id

        if (!ingId) {
          const { data: exist } = await supabase.from('ingredients_library')
            .select('id').eq('name', item.name).eq('user_id', user.id).single()
          if (exist) ingId = exist.id
          else {
            const { data: newIng } = await supabase.from('ingredients_library')
              .insert([{ name: item.name, user_id: user.id }]).select().single()
            ingId = newIng.id
          }
        }
        await supabase.from('recipe_items').insert({
          recipe_id: recipe.id,
          ingredient_id: ingId,
          amount_g: parseFloat(item.amount) || 0,
          is_main: true
        })
      }

      // B. 辅料
      for (const item of subIngredients) {
        if (!item.name) continue
        let ingId = null
        const { data: exist } = await supabase.from('ingredients_library')
            .select('id').eq('name', item.name).eq('user_id', user.id).single()
        if (exist) ingId = exist.id
        else {
           const { data: newIng } = await supabase.from('ingredients_library')
              .insert([{ name: item.name, user_id: user.id }]).select().single()
           ingId = newIng.id
        }
        await supabase.from('recipe_items').insert({
          recipe_id: recipe.id,
          ingredient_id: ingId,
          amount_g: parseFloat(item.amount) || 0,
          is_main: false
        })
      }

      router.push(`/recipes/${recipe.id}`)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <PageContainer>
        {/* --- 头部操作栏 --- */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
              <X size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">新建菜谱</h1>
          </div>
          <button 
            onClick={handleSubmit} 
            disabled={loading} 
            className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? '保存中...' : <><Save size={16}/> 保存</>}
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-8">
          
          {/* 1. 封面与标题区 */}
          <div className="grid md:grid-cols-3 gap-6">
            {/* 封面图 */}
            <div className="md:col-span-1">
              <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center group border border-dashed border-gray-300 hover:border-black transition-all cursor-pointer">
                {coverUrl ? (
                  <img src={coverUrl} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center">
                    <ImageIcon size={32} />
                    <span className="text-xs mt-2 font-medium">上传封面</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                <input type="file" accept="image/*" onChange={handleImageUpload} 
                  className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
            </div>

            {/* 标题简介 */}
            <div className="md:col-span-2 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">菜谱名称</label>
                {/* 修复：强制 text-gray-900 */}
                <input 
                  placeholder="例如: 青椒肉丝" 
                  className="w-full text-2xl font-bold border-b border-gray-200 py-2 outline-none focus:border-black transition-colors bg-transparent text-gray-900 placeholder:text-gray-300"
                  value={title} onChange={e => setTitle(e.target.value)} 
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">简介 / 心得</label>
                {/* 修复：强制 text-gray-900 */}
                <textarea 
                  placeholder="写一段简单的介绍..." 
                  className="w-full h-full min-h-[120px] bg-gray-50 rounded-xl p-4 text-sm outline-none resize-none focus:ring-2 focus:ring-black/5 text-gray-900 placeholder:text-gray-400"
                  value={desc} onChange={e => setDesc(e.target.value)} 
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-100"/>

          {/* 2. 标签选择 */}
          <div>
             <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-black rounded-full"></span> 分类标签
             </h3>
             <div className="flex flex-wrap gap-6">
               {Object.entries(availableTags).map(([cat, tags]) => (
                 <div key={cat}>
                   <span className="text-xs text-gray-400 block mb-2">{cat}</span>
                   <div className="flex flex-wrap gap-2">
                     {tags.map(t => (
                       <button key={t} type="button"
                         onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x!==t) : [...prev, t])}
                         className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedTags.includes(t) ? 'bg-black text-white border-black shadow-md' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                       >
                         {t}
                       </button>
                     ))}
                   </div>
                 </div>
               ))}
             </div>
          </div>

          <hr className="border-gray-100"/>

          {/* 3. 食材录入 */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* 主料 */}
            <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50">
              <h3 className="font-bold text-sm mb-4 text-orange-900 flex justify-between items-center">
                <span>主要食材</span>
                <span className="text-[10px] text-orange-600/60 font-normal bg-orange-100 px-2 py-0.5 rounded-full">自动匹配热量</span>
              </h3>
              
              <div className="space-y-3">
                {mainIngredients.map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <IngredientSelector 
                      value={item} 
                      onChange={(newItem) => {
                        const list = [...mainIngredients]
                        list[i] = { ...list[i], ...newItem, name: newItem.name }
                        setMainIngredients(list)
                      }}
                      placeholder="搜食材..."
                    />
                    <div className="w-20 relative">
                       {/* 修复：onFocus select 和 text-orange-900 */}
                       <input 
                        type="number" 
                        placeholder="0"
                        onFocus={(e) => e.target.select()}
                        className="w-full border-b border-orange-200 bg-transparent p-1 text-sm outline-none text-center font-bold text-orange-900 placeholder:text-orange-300"
                        value={item.amount} 
                        onChange={e => modifyList(mainIngredients, setMainIngredients, i, 'amount', e.target.value)} 
                      />
                      <span className="absolute right-0 top-1 text-[10px] text-orange-400">g</span>
                    </div>
                    <button onClick={() => modifyList(mainIngredients, setMainIngredients, i, 'delete')} className="pt-1.5 text-orange-300 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={() => setMainIngredients([...mainIngredients, {name:'', amount:'', is_main:true, id: null}])} className="mt-4 text-xs font-bold text-orange-600 flex items-center gap-1 hover:opacity-70"><Plus size={14}/> 添加主料</button>
            </div>

            {/* 辅料 */}
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
              <h3 className="font-bold text-sm mb-4 text-gray-500">配料 / 调味</h3>
              <div className="space-y-3">
                {subIngredients.map((item, i) => (
                  <div key={i} className="flex gap-2">
                    {/* 修复：text-gray-900 */}
                    <input 
                      placeholder="配料名" 
                      className="flex-1 border-b bg-transparent p-1 text-sm outline-none text-gray-900 placeholder:text-gray-400" 
                      value={item.name} 
                      onChange={e => modifyList(subIngredients, setSubIngredients, i, 'name', e.target.value)} 
                    />
                    {/* 修复：text-gray-900 */}
                    <input 
                      placeholder="适量" 
                      className="w-20 border-b bg-transparent p-1 text-sm outline-none text-center text-gray-900 placeholder:text-gray-400" 
                      value={item.amount} 
                      onChange={e => modifyList(subIngredients, setSubIngredients, i, 'amount', e.target.value)} 
                    />
                    <button onClick={() => modifyList(subIngredients, setSubIngredients, i, 'delete')} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setSubIngredients([...subIngredients, {name:'', amount:'', is_main:false}])} className="mt-4 text-xs font-bold text-gray-500 flex items-center gap-1 hover:text-black"><Plus size={14}/> 添加配料</button>
            </div>
          </div>

          <hr className="border-gray-100"/>

          {/* 4. 步骤编辑器 */}
          <div>
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <span className="w-1 h-5 bg-black rounded-full"></span> 做法步骤
            </h3>
            <TiptapEditor content="" onChange={(html) => setSteps(html)} />
          </div>

        </div>
      </PageContainer>
    </>
  )
}