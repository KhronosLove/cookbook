'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import Link from 'next/link'
import { Search, Plus, ArrowDownUp, Check } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

export default function RecipeList() {
  const [recipes, setRecipes] = useState([])
  const [tagGroups, setTagGroups] = useState([])
  const [filters, setFilters] = useState({}) 
  const [search, setSearch] = useState('')
  
  // 排序状态: 'date' (最新) | 'name' (名称)
  const [sortBy, setSortBy] = useState('name')
  const [showSortMenu, setShowSortMenu] = useState(false)

  useEffect(() => {
    // 1. 获取标签 (Fetch Tags)
    const fetchTags = async () => {
      const { data } = await supabase
        .from('defined_tags')
        .select('*')
        .order('category_rank', { ascending: true }) 
        .order('tag_rank', { ascending: true })
        .order('id', { ascending: true });

      if (data) {
        const orderedGroups = [];
        const map = new Map();
        const initialFilters = {};

        data.forEach(t => {
          if (!map.has(t.category)) {
            const newGroup = { category: t.category, tags: [] };
            map.set(t.category, newGroup);
            orderedGroups.push(newGroup);
            
            if (filters[t.category] === undefined) {
               initialFilters[t.category] = '全部';
            }
          }
          map.get(t.category).tags.push(t.name);
        });

        setTagGroups(orderedGroups);
        
        if (Object.keys(filters).length === 0) {
           setFilters(prev => ({ ...prev, ...initialFilters }));
        }
      }
    }

    // 2. [补回缺失的] 获取菜谱 (Fetch Recipes)
    const fetchRecipes = async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (data) {
        setRecipes(data);
      }
    }

    // 执行
    fetchTags();
    fetchRecipes();
  }, [])

  // 1. 筛选逻辑
  const filteredList = recipes.filter(r => {
    const matchSearch = !search || r.title.toLowerCase().includes(search.toLowerCase())
    const matchTags = Object.entries(filters).every(([cat, selectedValue]) => {
      if (selectedValue === '全部') return true
      // 兼容 null 或 undefined 的 tags
      return r.tags && r.tags.includes(selectedValue)
    })
    return matchSearch && matchTags
  })

  // 2. 排序逻辑 (支持中文拼音)
  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.created_at) - new Date(a.created_at)
    }
    if (sortBy === 'name') {
      return (a.title || '').localeCompare((b.title || ''), 'zh-CN')
    }
    return 0
  })

  // 重置逻辑
  const resetFilters = () => {
    const newFilters = {}
    tagGroups.forEach(group => newFilters[group.category] = '全部')
    setFilters(newFilters)
  }

  return (
    <>
      <Navbar />
      <PageContainer>
        {/* --- 顶部工具栏 --- */}
        <div className="p-6 pb-2 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900 hidden sm:block">菜谱库</h1>
            
            <div className="flex w-full sm:w-auto gap-3">
              {/* 搜索框 */}
              <div className="flex-1 sm:w-64 bg-gray-100 rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:ring-2 focus-within:ring-black/5">
                <Search size={18} className="text-gray-400 shrink-0" />
                <input 
                  className="bg-transparent p-1 outline-none text-sm w-full ml-2 text-gray-900"
                  placeholder="搜索菜名..."
                  value={search} onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* 排序按钮 */}
              <div className="relative">
                <button 
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="h-full bg-gray-100 hover:bg-gray-200 px-3 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors text-gray-600"
                >
                  <ArrowDownUp size={16}/>
                  <span className="hidden sm:inline">{sortBy === 'date' ? '最新' : '名称'}</span>
                </button>
                
                {/* 排序下拉菜单 */}
                {showSortMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowSortMenu(false)}></div>
                    <div className="absolute right-0 top-full mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden py-1">
                      <button onClick={() => { setSortBy('date'); setShowSortMenu(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center text-gray-700">
                        <span>最新添加</span>
                        {sortBy === 'date' && <Check size={14}/>}
                      </button>
                      <button onClick={() => { setSortBy('name'); setShowSortMenu(false) }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex justify-between items-center text-gray-700">
                        <span>名称 (A-Z)</span>
                        {sortBy === 'name' && <Check size={14}/>}
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 记一道菜 */}
              <Link href="/recipes/new" className="bg-black text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-black/10 hover:bg-gray-800 transition-all shrink-0">
                <Plus size={18} /> <span className="hidden sm:inline">记一道菜</span>
              </Link>
            </div>
          </div>

          {/* --- 筛选 Tag --- */}
          <div className="space-y-3 pb-2">
            <div className="flex gap-4 overflow-x-auto no-scrollbar items-center">
              <span className="text-xs font-bold text-gray-400 w-10 shrink-0">综合</span>
              <button onClick={resetFilters} className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${Object.values(filters).every(v => v === '全部') ? 'bg-black text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>全部</button>
            </div>
            {tagGroups.map((group) => (
              <div key={group.category} className="flex gap-4 overflow-x-auto no-scrollbar items-center">
                <span className="text-xs font-bold text-gray-400 w-10 shrink-0">{group.category}</span>
                <div className="flex gap-2">
                  <button onClick={() => setFilters({ ...filters, [group.category]: '全部' })} className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${filters[group.category] === '全部' ? 'bg-black/5 text-black font-bold' : 'text-gray-500 hover:bg-gray-100'}`}>全部</button>
                  {[...new Set(group.tags)].map(tag => (
                    <button key={tag} onClick={() => setFilters({ ...filters, [group.category]: tag })} className={`text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${filters[group.category] === tag ? 'bg-orange-100 text-orange-700 font-bold' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>{tag}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* --- 列表内容 --- */}
        <div className="p-6 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {sortedList.map(recipe => (
            <Link href={`/recipes/${recipe.id}`} key={recipe.id} className="block group">
              <div className="bg-white rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                
                {/* 图片容器 */}
                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {recipe.cover_image ? (
                    <img 
                      src={recipe.cover_image} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
                      alt={recipe.title}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">暂无图片</div>
                  )}
                  
                  {/* 浮动标签 */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                      {recipe.tags?.slice(0,1).map(t => (
                        <span key={t} className="text-[10px] font-bold bg-white/90 text-black px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm">{t}</span>
                      ))}
                  </div>
                </div>
                
                {/* 内容区域 */}
                <div className="p-3">
                  <h3 className="font-bold text-gray-900 text-sm truncate mb-1">{recipe.title}</h3>
                  <p className="text-[10px] text-gray-500 line-clamp-1 mb-2">{recipe.description || '暂无简介'}</p>
                  
                  {/* 底部 GO 栏 */}
                  <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-[10px] font-bold text-gray-300">
                      <span>{new Date(recipe.created_at).toLocaleDateString()}</span>
                      <span className="text-orange-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">GO →</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          
          {sortedList.length === 0 && (
             <div className="col-span-full py-20 text-center text-gray-400">
               <div className="text-4xl mb-2">🥕</div>
               <p>没有找到相关菜谱</p>
             </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}