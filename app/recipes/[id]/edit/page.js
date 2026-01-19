'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter, useParams } from 'next/navigation'
import { Plus, Trash2, Image as ImageIcon, Save, X } from 'lucide-react'
import TiptapEditor from '@/components/TiptapEditor'
import IngredientSelector from '@/components/IngredientSelector'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

export default function EditRecipe() {
  const { id } = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [coverUrl, setCoverUrl] = useState('')
  const [steps, setSteps] = useState('')
  
  const [availableTags, setAvailableTags] = useState({}) 
  const [selectedTags, setSelectedTags] = useState([]) 
  
  const [mainIngredients, setMainIngredients] = useState([])
  const [subIngredients, setSubIngredients] = useState([])

  useEffect(() => {
    const initData = async () => {
      const { data } = await supabase
        .from('defined_tags')
        .select('*')
        // 加上这两行核心排序逻辑
        .order('category_rank', { ascending: true }) // 先排大类
        .order('tag_rank', { ascending: true })      // 再排小标签
        .order('id', { ascending: true });           // 最后用ID兜底
      if (tagsData) {
        const grouped = tagsData.reduce((acc, curr) => {
          if (!acc[curr.category]) acc[curr.category] = []
          acc[curr.category].push(curr.name)
          return acc
        }, {})
        setAvailableTags(grouped)
      }

      const { data: recipe } = await supabase.from('recipes').select('*').eq('id', id).single()
      if (recipe) {
        setTitle(recipe.title)
        setDesc(recipe.description)
        setCoverUrl(recipe.cover_image)
        setSelectedTags(recipe.tags || [])
        
        let formattedSteps = ''
        if (recipe.steps && recipe.steps.startsWith('[')) {
           try { 
             const arr = JSON.parse(recipe.steps)
             if (Array.isArray(arr)) formattedSteps = arr.map(step => `<p>${step}</p>`).join('')
           } catch(e) { formattedSteps = recipe.steps || '' }
        } else {
           formattedSteps = recipe.steps || ''
        }
        setSteps(formattedSteps)
      }

      const { data: items } = await supabase
        .from('recipe_items')
        .select('*, ingredients_library(*)')
        .eq('recipe_id', id)
      
      if (items) {
        const mains = []
        const subs = []
        items.forEach(item => {
          const ingLib = item.ingredients_library || {}
          const formatted = { 
            name: ingLib.name || '', 
            amount: item.amount_g?.toString(), 
            is_main: item.is_main,
            id: item.ingredient_id,
            calories: ingLib.calories,
            protein: ingLib.protein,
            fat: ingLib.fat,
            carbs: ingLib.carbs
          }
          if (item.is_main) mains.push(formatted)
          else subs.push(formatted)
        })
        setMainIngredients(mains.length ? mains : [{ name: '', amount: '', is_main: true }])
        setSubIngredients(subs.length ? subs : [{ name: '', amount: '', is_main: false }])
      }
      setInitLoading(false)
    }
    initData()
  }, [id])

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return
    const filePath = `${Math.random()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('recipe-images').upload(filePath, file)
    if (!error) {
      const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath)
      setCoverUrl(data.publicUrl)
    }
  }

  const modifyList = (list, setList, index, field, value) => {
    const newList = [...list]; 
    if (field === 'delete') newList.splice(index, 1); else newList[index][field] = value; 
    setList(newList)
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('未登录')

      const { error: updateError } = await supabase.from('recipes').update({
        title,
        description: desc,
        cover_image: coverUrl,
        tags: selectedTags,
        steps: steps, 
      }).eq('id', id)
      if (updateError) throw updateError

      await supabase.from('recipe_items').delete().eq('recipe_id', id)

      for (const item of mainIngredients) {
        if (!item.name) continue
        let ingId = item.id
        if (!ingId) {
            const { data: exist } = await supabase.from('ingredients_library').select('id').eq('name', item.name).eq('user_id', user.id).single()
            if (exist) ingId = exist.id
            else {
                const { data: newIng } = await supabase.from('ingredients_library').insert([{ name: item.name, user_id: user.id }]).select().single()
                ingId = newIng.id
            }
        }
        await supabase.from('recipe_items').insert({
          recipe_id: id,
          ingredient_id: ingId,
          amount_g: parseFloat(item.amount) || 0,
          is_main: true
        })
      }

      for (const item of subIngredients) {
        if (!item.name) continue
        let ingId = null
        const { data: exist } = await supabase.from('ingredients_library').select('id').eq('name', item.name).eq('user_id', user.id).single()
        if (exist) ingId = exist.id
        else {
          const { data: newIng } = await supabase.from('ingredients_library').insert([{ name: item.name, user_id: user.id }]).select().single()
          ingId = newIng.id
        }
        await supabase.from('recipe_items').insert({
          recipe_id: id,
          ingredient_id: ingId,
          amount_g: parseFloat(item.amount) || 0,
          is_main: false
        })
      }

      router.replace(`/recipes/${id}`)
    } catch (error) {
      alert('更新失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (initLoading) return (
    <>
      <Navbar />
      <PageContainer>
          <div className="flex h-64 items-center justify-center">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
      </PageContainer>
    </>
  )

  return (
    <>
      <Navbar />
      <PageContainer>
         <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
              <X size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-900">编辑菜谱</h1>
          </div>
          <button 
            onClick={handleUpdate} 
            disabled={loading} 
            className="bg-black text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? '保存中...' : <><Save size={16}/> 保存修改</>}
          </button>
        </div>

        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                <div className="relative aspect-square bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center group border border-dashed border-gray-300 hover:border-black transition-all cursor-pointer">
                    {coverUrl ? <img src={coverUrl} className="w-full h-full object-cover" /> : <ImageIcon size={32} className="text-gray-400"/>}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
                </div>
                <div className="md:col-span-2 flex flex-col gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">菜谱名称</label>
                    {/* 修复：text-gray-900 */}
                    <input className="w-full text-2xl font-bold border-b border-gray-200 py-2 outline-none bg-transparent text-gray-900 placeholder:text-gray-300" value={title} onChange={e => setTitle(e.target.value)} />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">简介</label>
                    {/* 修复：text-gray-900 */}
                    <textarea className="w-full h-full min-h-[120px] bg-gray-50 rounded-xl p-4 text-sm outline-none resize-none text-gray-900 placeholder:text-gray-400" value={desc} onChange={e => setDesc(e.target.value)} />
                </div>
                </div>
            </div>

            <hr className="border-gray-100"/>

            <div>
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-black rounded-full"></span> 分类标签</h3>
                <div className="flex flex-wrap gap-6">
                {Object.entries(availableTags).map(([cat, tags]) => (
                    <div key={cat}>
                    <span className="text-xs text-gray-400 block mb-2">{cat}</span>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(t => (
                        <button key={t} type="button" onClick={() => setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x!==t) : [...prev, t])}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${selectedTags.includes(t) ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-600'}`}>
                            {t}
                        </button>
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            </div>

            <hr className="border-gray-100"/>

            <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50">
                <h3 className="font-bold text-sm mb-4 text-orange-900">主要食材</h3>
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
                        />
                        <div className="w-20 relative">
                             {/* 修复：text-orange-900, onFocus select */}
                             <input type="number" onFocus={(e) => e.target.select()} value={item.amount} onChange={e => modifyList(mainIngredients, setMainIngredients, i, 'amount', e.target.value)} className="w-full border-b border-orange-200 bg-transparent p-1 text-sm outline-none text-center font-bold text-orange-900 placeholder:text-orange-300" />
                             <span className="absolute right-0 top-1 text-[10px] text-orange-400">g</span>
                        </div>
                        <button onClick={() => modifyList(mainIngredients, setMainIngredients, i, 'delete')} className="pt-1.5 text-orange-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                    ))}
                </div>
                <button onClick={() => setMainIngredients([...mainIngredients, {name:'', amount:'', is_main:true, id: null}])} className="mt-4 text-xs font-bold text-orange-600 flex items-center gap-1"><Plus size={14}/> 添加主料</button>
                </div>
                
                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-sm mb-4 text-gray-500">配料 / 调味</h3>
                <div className="space-y-3">
                    {subIngredients.map((item, i) => (
                    <div key={i} className="flex gap-2">
                        {/* 修复：text-gray-900 */}
                        <input value={item.name} onChange={e => modifyList(subIngredients, setSubIngredients, i, 'name', e.target.value)} className="flex-1 border-b bg-transparent p-1 text-sm outline-none text-gray-900" />
                        <input value={item.amount} onChange={e => modifyList(subIngredients, setSubIngredients, i, 'amount', e.target.value)} className="w-20 border-b bg-transparent p-1 text-sm outline-none text-center text-gray-900" />
                        <button onClick={() => modifyList(subIngredients, setSubIngredients, i, 'delete')} className="text-gray-300 hover:text-red-500"><Trash2 size={16} /></button>
                    </div>
                    ))}
                </div>
                <button onClick={() => setSubIngredients([...subIngredients, {name:'', amount:'', is_main:false}])} className="mt-4 text-xs font-bold text-gray-500 flex items-center gap-1"><Plus size={14}/> 添加配料</button>
                </div>
            </div>

            <hr className="border-gray-100"/>

            <div>
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2"><span className="w-1 h-5 bg-black rounded-full"></span> 做法步骤</h3>
                {!initLoading && (
                    <TiptapEditor content={steps} onChange={(html) => setSteps(html)} />
                )}
            </div>
        </div>
      </PageContainer>
    </>
  )
}