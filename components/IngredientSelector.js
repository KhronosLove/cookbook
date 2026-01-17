'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase'
import { Search, Plus } from 'lucide-react'

export default function IngredientSelector({ value, onChange, placeholder = "搜索食材..." }) {
  const [query, setQuery] = useState(value?.name || '')
  const [results, setResults] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef(null)

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 搜索逻辑
  const handleSearch = async (text) => {
    setQuery(text)
    // 如果还没选定对象，且正在输入，就更新父组件的 name 字段
    if (!value.id) onChange({ ...value, name: text })
    
    if (text.length < 1) {
      setResults([])
      return
    }

    const { data } = await supabase
      .from('ingredients_library')
      .select('*')
      .ilike('name', `%${text}%`)
      .limit(5)
    
    setResults(data || [])
    setShowDropdown(true)
  }

  const handleSelect = (item) => {
    setQuery(item.name)
    onChange(item) // 将整个食材对象（含热量信息）传给父组件
    setShowDropdown(false)
  }

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        type="text"
        className="w-full border-b p-1 text-sm outline-none focus:border-black transition-colors"
        placeholder={placeholder}
        value={query}
        onFocus={() => query && setShowDropdown(true)}
        onChange={(e) => handleSearch(e.target.value)}
      />
      
      {/* 下拉联想框 */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 max-h-60 overflow-y-auto">
          {results.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center"
            >
              <span>{item.name}</span>
              <span className="text-xs text-gray-400">{item.calories} kcal/100g</span>
            </button>
          ))}
        </div>
      )}
      
      {/* 没搜到的提示 */}
      {showDropdown && query && results.length === 0 && (
        <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl z-50 mt-1 p-2">
          <p className="text-xs text-gray-500 mb-1">库里没有这个食材</p>
          <p className="text-xs text-gray-400">将作为新食材直接保存</p>
        </div>
      )}
    </div>
  )
}