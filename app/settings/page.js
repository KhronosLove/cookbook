'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation' 
import { Trash2, Plus, Tag, Edit3, Search, Save, X, Calculator, Camera, Package, Carrot, Book, ArrowUp, ArrowDown, Pencil, ChevronDown, ArrowUpDown } from 'lucide-react'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'

// ⚖️ 单位配置
const UNIT_OPTIONS = [
  { value: 'g', label: '克 (g)' },
  { value: 'ml', label: '毫升 (ml)' },
  { value: 'pkg', label: '包/袋' },
  { value: 'box', label: '盒' },
  { value: 'bowl', label: '碗' },
  { value: 'cup', label: '杯' },
  { value: 'serving', label: '份' },
  { value: 'piece', label: '个/只' },
  { value: 'slice', label: '片' },
  { value: 'scoop', label: '勺' },
]

export default function SettingsPage() {
  const router = useRouter()
  
  // --- 状态管理 ---
  const [activeTab, setActiveTab] = useState('ingredients')
  const [tags, setTags] = useState([])
  const [recipes, setRecipes] = useState([])
  const [ingredients, setIngredients] = useState([])
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  
  // [新增] 排序状态
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' })

  const [newTagCat, setNewTagCat] = useState('菜系')
  const [newTagName, setNewTagName] = useState('')
  
  // 编辑/新增 Modal 状态
  const [editingItem, setEditingItem] = useState(null)
  const [modalType, setModalType] = useState('ingredient')
  
  const [formData, setFormData] = useState({ 
    name: '', unit: 'g', calories: 0, protein: 0, fat: 0, carbs: 0, image_url: '' 
  })
  const [uploading, setUploading] = useState(false)

  const fmt = (n) => Number(n || 0).toFixed(1)

  useEffect(() => { 
    fetchTags(); fetchRecipes(); fetchIngredients(); fetchProducts(); 
  }, [])

  // --- Fetch Data ---
  const fetchTags = async () => { 
    const { data } = await supabase.from('defined_tags').select('*').order('category_rank', { ascending: true }).order('tag_rank', { ascending: true }).order('id', { ascending: true }); 
    setTags(data || []) 
  }
  const fetchRecipes = async () => { const { data } = await supabase.from('recipes').select('id, title, created_at, cover_image'); setRecipes(data || []) }
  const fetchIngredients = async () => { const { data } = await supabase.from('ingredients_library').select('*'); setIngredients(data || []) }
  const fetchProducts = async () => { const { data } = await supabase.from('products_library').select('*'); setProducts(data || []) }

  // --- [新增] 排序处理函数 ---
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  }

  // --- Tags Logic ---
  const handleAddTag = async () => { 
    if (!newTagName) return; 
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { alert('请先登录！'); return }
    const currentCatTags = tags.filter(t => t.category === newTagCat);
    const maxRank = currentCatTags.length > 0 ? Math.max(...currentCatTags.map(t => t.tag_rank || 0)) : 0;
    const existingCat = tags.find(t => t.category === newTagCat);
    const catRank = existingCat ? existingCat.category_rank : (tags.length > 0 ? Math.max(...tags.map(t => t.category_rank || 0)) + 1 : 0);
    const { error } = await supabase.from('defined_tags').insert([{ user_id: user.id, category: newTagCat || '未分类', name: newTagName, tag_rank: maxRank + 1, category_rank: catRank }]); 
    if (!error) { setNewTagName(''); fetchTags() } else { alert(`添加失败: ${error.message}`) }
  }
  const handleDeleteTag = async (id) => { if(!confirm('删除标签?')) return; await supabase.from('defined_tags').delete().eq('id', id); fetchTags() }
  const handleDeleteRecipe = async (id) => { if(!confirm('删除菜谱?')) return; await supabase.from('recipes').delete().eq('id', id); fetchRecipes() }
  const handleDeleteItem = async (id, type) => { if(!confirm('删除?')) return; await supabase.from(type === 'ingredient' ? 'ingredients_library' : 'products_library').delete().eq('id', id); type === 'ingredient' ? fetchIngredients() : fetchProducts() }

  // --- Rank Logic (Tags) ---
  const moveTag = async (tag, direction) => {
    const siblings = tags.filter(t => t.category === tag.category);
    const currentIndex = siblings.findIndex(t => t.id === tag.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= siblings.length) return;
    const itemA = siblings[currentIndex]; const itemB = siblings[targetIndex];
    let rankA = itemA.tag_rank || 0; let rankB = itemB.tag_rank || 0;
    if (rankA === rankB) rankA = rankB + 1;
    const minRank = Math.min(rankA, rankB); const maxRank = Math.max(rankA, rankB);
    let newRankA, newRankB;
    if (direction === 'up') { newRankA = minRank; newRankB = maxRank; if (newRankA === newRankB) newRankB = newRankA + 1; } 
    else { newRankA = maxRank; newRankB = minRank; if (newRankA === newRankB) newRankA = newRankB + 1; }
    const newTags = [...tags]; const idxA = newTags.findIndex(t => t.id === itemA.id); const idxB = newTags.findIndex(t => t.id === itemB.id);
    newTags[idxA].tag_rank = newRankA; newTags[idxB].tag_rank = newRankB;
    setTags(newTags.sort((a,b) => a.category_rank - b.category_rank || a.tag_rank - b.tag_rank));
    await supabase.from('defined_tags').update({ tag_rank: newRankA }).eq('id', itemA.id);
    await supabase.from('defined_tags').update({ tag_rank: newRankB }).eq('id', itemB.id);
  }
  const moveCategory = async (categoryName, direction) => {
    const uniqueCats = [...new Set(tags.map(t => t.category))];
    const currentIdx = uniqueCats.indexOf(categoryName);
    if (currentIdx === -1) return;
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
    if (targetIdx < 0 || targetIdx >= uniqueCats.length) return;
    const targetCatName = uniqueCats[targetIdx];
    let rank1 = tags.find(t => t.category === categoryName)?.category_rank || 0;
    let rank2 = tags.find(t => t.category === targetCatName)?.category_rank || 0;
    if (rank1 === rank2) rank1 = rank2 + 1;
    const minRank = Math.min(rank1, rank2); const maxRank = Math.max(rank1, rank2);
    let newRank1, newRank2;
    if (direction === 'up') { newRank1 = minRank; newRank2 = maxRank; if (newRank1 === newRank2) newRank2 = newRank1 + 1; }
    else { newRank1 = maxRank; newRank2 = minRank; if (newRank1 === newRank2) newRank1 = newRank2 + 1; }
    const newTags = tags.map(t => {
      if (t.category === categoryName) return { ...t, category_rank: newRank1 };
      if (t.category === targetCatName) return { ...t, category_rank: newRank2 };
      return t;
    });
    setTags(newTags.sort((a,b) => a.category_rank - b.category_rank || a.tag_rank - b.tag_rank));
    await supabase.from('defined_tags').update({ category_rank: newRank1 }).eq('category', categoryName);
    await supabase.from('defined_tags').update({ category_rank: newTargetRank }).eq('category', targetCatName);
  }
  const handleRename = async (type, originalName, id = null) => {
    const newName = prompt(`新名称:`, originalName);
    if (!newName || newName === originalName) return;
    if (type === 'category') { await supabase.from('defined_tags').update({ category: newName }).eq('category', originalName); } 
    else { await supabase.from('defined_tags').update({ name: newName }).eq('id', id); }
    fetchTags();
  }

  // --- Item Form Logic ---
  const handleAddClick = () => { if (activeTab === 'recipes') { router.push('/recipes/new') } else { openEditModal(null, activeTab === 'ingredients' ? 'ingredient' : 'product') } }
  
  const openEditModal = (item, type) => { 
    setEditingItem(item || {}); setModalType(type); 
    if (item) { setFormData({ name: item.name, unit: item.unit || 'g', calories: item.calories || 0, protein: item.protein || 0, fat: item.fat || 0, carbs: item.carbs || 0, image_url: item.image_url || '' }) } 
    else { setFormData({ name: '', unit: 'g', calories: 0, protein: 0, fat: 0, carbs: 0, image_url: '' }) } 
  }
  const handleFormChange = (field, value) => { 
    const newData = { ...formData, [field]: value }; 
    if (['protein', 'fat', 'carbs'].includes(field)) { newData.calories = (parseFloat(newData.protein || 0) * 4) + (parseFloat(newData.carbs || 0) * 4) + (parseFloat(newData.fat || 0) * 9) }; 
    setFormData(newData) 
  }
  const handleImageUpload = async (e) => { const file = e.target.files[0]; if (!file) return; setUploading(true); try { const fileExt = file.name.split('.').pop(); const filePath = `thumbs/${Math.random()}.${fileExt}`; const { error } = await supabase.storage.from('recipe-images').upload(filePath, file); if (error) throw error; const { data } = supabase.storage.from('recipe-images').getPublicUrl(filePath); setFormData(prev => ({ ...prev, image_url: data.publicUrl })) } catch (err) { alert('上传失败') } finally { setUploading(false) } }
  
  const handleSaveItem = async () => { 
    const { data: { user } } = await supabase.auth.getUser(); 
    if (!user) return alert('请先登录');
    const table = modalType === 'ingredient' ? 'ingredients_library' : 'products_library'; 
    const payload = { user_id: user.id, name: formData.name, unit: formData.unit, image_url: formData.image_url, calories: parseFloat(formData.calories), protein: parseFloat(formData.protein), fat: parseFloat(formData.fat), carbs: parseFloat(formData.carbs) }; 
    let error;
    if (editingItem.id) { const res = await supabase.from(table).update(payload).eq('id', editingItem.id); error = res.error; } 
    else { const res = await supabase.from(table).insert([payload]); error = res.error; }
    if (error) { console.error(error); alert(`保存失败: ${error.message}`); } 
    else { setEditingItem(null); modalType === 'ingredient' ? fetchIngredients() : fetchProducts() }
  }

  // --- [修改] Render List with Sorting ---
  const renderList = (data, type) => {
    // 1. 过滤
    let filtered = data.filter(i => (i.name || i.title).toLowerCase().includes(search.toLowerCase()))
    
    // 2. [新增] 排序逻辑
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      if (sortConfig.key === 'name') {
        aVal = (type === 'recipe' ? a.title : a.name) || '';
        bVal = (type === 'recipe' ? b.title : b.name) || '';
        // 中文/英文混合排序
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal, 'zh-Hans-CN') 
          : bVal.localeCompare(aVal, 'zh-Hans-CN');
      } 
      
      if (sortConfig.key === 'calories') {
        // 菜谱按创建时间排，食材按热量排
        if (type === 'recipe') {
           aVal = new Date(a.created_at).getTime();
           bVal = new Date(b.created_at).getTime();
        } else {
           aVal = Number(a.calories || 0);
           bVal = Number(b.calories || 0);
        }
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    // 辅助组件：排序表头
    const SortHeader = ({ label, sortKey, align = 'left' }) => (
      <div 
        onClick={() => handleSort(sortKey)} 
        className={`flex items-center gap-1 cursor-pointer hover:bg-gray-100 p-1 rounded transition-colors select-none ${align === 'center' ? 'justify-center' : ''}`}
      >
        <span>{label}</span>
        <div className="flex flex-col text-gray-400">
           {sortConfig.key === sortKey ? (
             sortConfig.direction === 'asc' ? <ArrowUp size={12} className="text-black"/> : <ArrowDown size={12} className="text-black"/>
           ) : (
             <ArrowUpDown size={12} className="opacity-50"/>
           )}
        </div>
      </div>
    )
    
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Desktop Header */}
        <div className="hidden sm:grid grid-cols-12 bg-gray-50 p-3 text-xs text-gray-500 font-medium border-b border-gray-100">
          <div className="col-span-5 pl-2">
             <SortHeader label="名称" sortKey="name" />
          </div>
          {type !== 'recipe' ? (
            <>
              <div className="col-span-2 text-center">
                 <SortHeader label="热量/单位" sortKey="calories" align="center" />
              </div>
              <div className="col-span-3 text-center pt-1">碳 / 蛋 / 脂</div>
            </>
          ) : (
            <div className="col-span-5 text-center">
               <SortHeader label="创建时间" sortKey="calories" align="center" />
            </div>
          )}
          <div className="col-span-2 text-center pt-1">操作</div>
        </div>

        {/* Mobile Header (简化，不放复杂排序按钮以免误触，或仅保留名称排序) */}
        <div className="sm:hidden flex items-center bg-gray-50 p-3 text-xs text-gray-500 font-medium border-b border-gray-100">
          <div className="flex-1 pl-1 flex items-center gap-2" onClick={() => handleSort('name')}>
             {type !== 'recipe' ? '名称 | 热量 | 碳蛋脂' : '名称 | 创建日期'}
             <ArrowUpDown size={10} className="text-gray-400"/>
          </div>
          <div className="w-16 flex-shrink-0"></div> 
        </div>
        
        <div className="divide-y">
          {filtered.map(item => (
            <div key={item.id}>
              {/* Desktop View */}
              <div className="hidden sm:grid grid-cols-12 p-3 items-center text-sm hover:bg-gray-50 transition-colors">
                <div className="col-span-5 flex items-center gap-3 overflow-hidden pr-2">
                  <div className="w-8 h-8 rounded bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                    {(item.image_url || item.cover_image) ? <img src={item.image_url || item.cover_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">{(item.name||item.title)[0]}</div>}
                  </div>
                  <div className="font-bold text-gray-900 truncate">{item.name || item.title}</div>
                </div>

                {type !== 'recipe' ? (
                  <>
                    <div className="col-span-2 text-center text-gray-900">
                      <span className="font-mono font-bold">{Math.round(item.calories)}</span>
                      <span className="text-[10px] text-gray-400 ml-1">
                        kcal/{item.unit === 'g' || item.unit === 'ml' ? '100' : '1'}{item.unit}
                      </span>
                    </div>
                    <div className="col-span-3 text-center text-xs text-gray-500 font-mono">{fmt(item.carbs)}/{fmt(item.protein)}/{fmt(item.fat)}</div>
                  </>
                ) : (
                  <div className="col-span-5 text-center text-xs text-gray-500">{new Date(item.created_at).toLocaleDateString()}</div>
                )}

                <div className="col-span-2 flex justify-center gap-3 text-gray-400">
                  <button onClick={() => { if (type === 'recipe') router.push(`/recipes/${item.id}/edit`); else openEditModal(item, type) }} className="hover:text-blue-600"><Edit3 size={14}/></button>
                  <button onClick={() => { if (type === 'recipe') handleDeleteRecipe(item.id); else handleDeleteItem(item.id, type) }} className="hover:text-red-600"><Trash2 size={14}/></button>
                </div>
              </div>

              {/* Mobile View */}
              <div className="sm:hidden p-3 flex items-center justify-between gap-0 hover:bg-gray-50 transition-colors">
                <div className="flex-1 flex items-center gap-3 overflow-hidden pr-2">
                  <div className="w-10 h-10 rounded bg-gray-100 shrink-0 overflow-hidden border border-gray-200">
                    {(item.image_url || item.cover_image) ? <img src={item.image_url || item.cover_image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300 text-[10px]">{(item.name||item.title)[0]}</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                      <div className="font-bold text-gray-900 truncate">{item.name || item.title}</div>
                      <div className="mt-0.5 text-xs">
                        {type === 'recipe' ? (
                          <span className="text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                        ) : (
                          <div className="flex items-center gap-2">
                             <span className="font-mono text-black font-bold">{Math.round(item.calories)}<span className="text-[10px] font-normal text-gray-400 ml-0.5">kcal/{item.unit === 'g' || item.unit === 'ml' ? '100' : '1'}{item.unit}</span></span>
                             <span className="text-gray-300">|</span>
                             <span className="font-mono text-gray-600">{fmt(item.carbs)}/{fmt(item.protein)}/{fmt(item.fat)}</span>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
                <div className="w-16 flex justify-end gap-3 text-gray-400 shrink-0">
                  <button onClick={() => { if (type === 'recipe') router.push(`/recipes/${item.id}/edit`); else openEditModal(item, type) }} className="hover:text-blue-600 p-1"><Edit3 size={16}/></button>
                  <button onClick={() => { if (type === 'recipe') handleDeleteRecipe(item.id); else handleDeleteItem(item.id, type) }} className="hover:text-red-600 p-1"><Trash2 size={16}/></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="p-8 text-center text-gray-400 text-sm">暂无数据</div>}
        </div>
      </div>
    )
  }

  // --- UI Structure ---
  const groupedTags = tags.reduce((acc, t) => { if (!acc[t.category]) acc[t.category] = []; acc[t.category].push(t); return acc; }, {});
  const categoryKeys = Object.keys(groupedTags);

  return (
    <>
      <Navbar />
      <PageContainer>
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-6 text-gray-900">数据库管理</h1>

          {/* Tabs */}
          <div className="flex gap-6 mb-6 border-b border-gray-100 overflow-x-auto no-scrollbar">
            {[ 
              { id: 'ingredients', label: '基础食材', icon: Carrot }, 
              { id: 'pantry', label: '食品库', icon: Package }, 
              { id: 'recipes', label: '菜谱列表', icon: Book }, 
              { id: 'tags', label: '标签管理', icon: Tag } 
            ].map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearch('') }} className={`pb-3 px-1 text-sm font-bold flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab === tab.id ? 'border-b-2 border-black text-black' : 'text-gray-400 hover:text-gray-600'}`}>
                <tab.icon size={16} />{tab.label}
              </button>
            ))}
          </div>

          {/* List Content */}
          {(activeTab === 'ingredients' || activeTab === 'pantry' || activeTab === 'recipes') && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1 bg-white border rounded-xl flex items-center px-3 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-black/5 transition-all">
                  <Search size={18} className="text-gray-400 mr-2"/>
                  <input className="w-full text-sm outline-none text-gray-900 placeholder:text-gray-400" placeholder="搜索名称..." value={search} onChange={e => setSearch(e.target.value)}/>
                </div>
                <button onClick={handleAddClick} className="bg-black text-white px-5 rounded-xl text-sm font-bold flex items-center gap-1 shadow-md hover:bg-gray-800 transition-colors"><Plus size={18}/> 新增</button>
              </div>
              {renderList(activeTab === 'ingredients' ? ingredients : activeTab === 'pantry' ? products : recipes, activeTab === 'ingredients' ? 'ingredient' : activeTab === 'pantry' ? 'product' : 'recipe')}
            </div>
          )}

          {/* Tags Management (保持不变) */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full"><label className="text-xs text-gray-500 block mb-1">分类名称</label><input value={newTagCat} onChange={e => setNewTagCat(e.target.value)} className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-900" placeholder="如：场景"/></div>
                <div className="flex-1 w-full"><label className="text-xs text-gray-500 block mb-1">标签名</label><input value={newTagName} onChange={e => setNewTagName(e.target.value)} className="w-full border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black/10 text-gray-900" placeholder="如：一人食"/></div>
                <button onClick={handleAddTag} className="bg-black text-white p-2.5 rounded-lg hover:bg-gray-800 w-full md:w-auto flex justify-center"><Plus size={20}/></button>
              </div>
              <div className="space-y-4">
                {categoryKeys.map((cat, catIdx) => (
                  <div key={cat} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3 border-b border-gray-50 pb-2">
                       <h3 className="font-bold text-sm flex items-center gap-2 text-gray-700"><Tag size={14}/> {cat}</h3>
                       <div className="flex items-center gap-1">
                          <button onClick={() => handleRename('category', cat)} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-blue-600"><Pencil size={12}/></button>
                          <div className="w-[1px] h-3 bg-gray-200 mx-1"></div>
                          <button onClick={() => moveCategory(cat, 'up')} disabled={catIdx === 0} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-black disabled:opacity-30"><ArrowUp size={12}/></button>
                          <button onClick={() => moveCategory(cat, 'down')} disabled={catIdx === categoryKeys.length - 1} className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-black disabled:opacity-30"><ArrowDown size={12}/></button>
                       </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {groupedTags[cat].map((t, tagIdx) => (
                        <div key={t.id} className="bg-gray-50 text-sm px-3 py-2 rounded-lg flex items-center justify-between border border-gray-100">
                          <span className="text-gray-700 font-medium">{t.name}</span>
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleRename('tag', t.name, t.id)} className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-blue-600"><Pencil size={12}/></button>
                            <button onClick={() => moveTag(t, 'up')} disabled={tagIdx === 0} className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-black disabled:opacity-30"><ArrowUp size={12}/></button>
                            <button onClick={() => moveTag(t, 'down')} disabled={tagIdx === groupedTags[cat].length - 1} className="p-1.5 hover:bg-gray-200 rounded text-gray-400 hover:text-black disabled:opacity-30"><ArrowDown size={12}/></button>
                            <div className="w-[1px] h-3 bg-gray-300 mx-1"></div>
                            <button onClick={() => handleDeleteTag(t.id)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"><Trash2 size={12}/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PageContainer>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-lg text-gray-900">{editingItem.id ? '编辑' : '添加'} {modalType === 'ingredient' ? '基础食材' : '加工食品'}</h3><button onClick={() => setEditingItem(null)}><X className="text-gray-400 hover:text-black"/></button></div>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden relative group border border-dashed border-gray-300 hover:border-black transition-colors">
                  {formData.image_url ? <img src={formData.image_url} className="w-full h-full object-cover"/> : <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400"><Camera size={20} /></div>}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer"/>
                </div>
                <div className="text-xs text-gray-500">
                  <p className="font-bold text-gray-700 mb-1">{uploading ? '上传中...' : '上传封面'}</p>
                </div>
              </div>

              {/* Name & Unit */}
              <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 mb-1 block">名称</label>
                    <input className="w-full bg-gray-50 border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black text-gray-900" value={formData.name} onChange={e => handleFormChange('name', e.target.value)}/>
                  </div>
                  <div className="w-1/3">
                    <label className="text-xs text-gray-500 mb-1 block">计量单位</label>
                    <div className="relative">
                        <select value={formData.unit} onChange={(e) => handleFormChange('unit', e.target.value)} className="w-full bg-gray-50 border p-2 rounded-lg text-sm outline-none focus:ring-2 focus:ring-black appearance-none pr-8 text-gray-900">
                            {UNIT_OPTIONS.map(u => (<option key={u.value} value={u.value}>{u.label}</option>))}
                        </select>
                        <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    </div>
                  </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Calculator size={14} className="text-blue-600"/>
                  {/* Dynamic Label */}
                  <span className="text-xs font-bold text-blue-800">
                      {formData.unit === 'g' || formData.unit === 'ml' ? '每 100g/ml 含量' : `每 1 ${UNIT_OPTIONS.find(u=>u.value===formData.unit)?.label} 含量`}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['carbs', 'protein', 'fat'].map(k => (
                    <div key={k}>
                      <label className="text-[10px] text-gray-500 block uppercase mb-1">
                        {k === 'carbs' ? '碳水' : k === 'protein' ? '蛋白质' : '脂肪'}
                      </label>
                      <input type="number" onFocus={(e)=>e.target.select()} className="w-full border-b border-blue-200 bg-transparent py-1 font-mono text-sm outline-none text-gray-900" value={formData[k]} onChange={e => handleFormChange(k, e.target.value)}/>
                    </div>
                  ))}
                </div>
                <div className="pt-2 mt-2 border-t border-blue-100">
                  <label className="text-xs text-blue-800 block mb-1 font-bold">总热量 (kcal)</label>
                  <input type="number" onFocus={(e)=>e.target.select()} className="w-full bg-white border border-blue-200 rounded p-2 text-lg font-bold text-blue-900 outline-none" value={fmt(formData.calories)} onChange={e => handleFormChange('calories', e.target.value)}/>
                </div>
              </div>

              <button onClick={handleSaveItem} className="w-full bg-black text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2">
                <Save size={18}/> 保存更改
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}