'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, User, BookOpen, Activity, BarChart2, ChefHat } from 'lucide-react'

export default function Navbar() {
  const pathname = usePathname()

  const navItems = [
    { name: '菜谱', href: '/recipes', icon: BookOpen, isActive: pathname.startsWith('/recipes') },
    { name: '日记', href: '/diary', icon: Activity, isActive: pathname.startsWith('/diary') },
    { name: '统计', href: '/statistics', icon: BarChart2, isActive: pathname.startsWith('/statistics') },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/90 backdrop-blur-md border-b border-gray-200 z-50">
      {/* 核心修改：max-w-5xl (之前可能是 7xl)，px-4 sm:px-6 (与 PageContainer 保持一致) */}
      <div className="max-w-5xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* 左侧：Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <ChefHat size={18} />
          </div>
          <span className="font-bold text-gray-900 text-sm sm:text-lg tracking-tight">
            Kyle's Cookbook
          </span>
        </Link>

        {/* 右侧：导航 + 功能图标 */}
        <div className="flex items-center gap-1 sm:gap-4">
          
          {/* 1. 核心导航 */}
          <div className="flex items-center bg-gray-100/50 p-0.5 sm:p-1 rounded-full border border-gray-100">
            {navItems.map((item) => (
              <Link 
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-1.5 rounded-full font-bold transition-all
                  px-2.5 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm
                  ${item.isActive 
                    ? 'bg-white text-black shadow-sm ring-1 ring-black/5' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                  }
                `}
              >
                <item.icon size={16} strokeWidth={2.5}/>
                <span className={`hidden sm:inline ${item.isActive ? 'inline' : ''}`}>{item.name}</span>
              </Link>
            ))}
          </div>

          <div className="w-px h-4 bg-gray-200 mx-0.5 sm:mx-0"></div>

          {/* 2. 设置 & 用户 */}
          <div className="flex items-center gap-0 sm:gap-1">
            <Link href="/settings" className="p-1.5 sm:p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-all" title="数据库管理">
              <Settings className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={2} />
            </Link>
            
            <Link href="/profile" className="p-1.5 sm:p-2 text-gray-400 hover:text-slate-900 hover:bg-gray-100 rounded-full transition-all" title="用户管理">
              <User className="w-[18px] h-[18px] sm:w-5 sm:h-5" strokeWidth={2} />
            </Link>
          </div>

        </div>
      </div>
    </nav>
  )
}