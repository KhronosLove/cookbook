'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { User, LogIn, Settings } from 'lucide-react' // 引入 Settings 图标
import { useEffect, useState } from 'react'
import { supabase } from '@/utils/supabase'

export default function Navbar() {
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  // 登录状态检测
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user || null)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 1. 移动端底部菜单
  const mobileNavItems = [
    { name: '首页', href: '/', emoji: '🏠' },
    { name: '菜谱', href: '/recipes', emoji: '🍳' },
    { name: '日记', href: '/diary', emoji: '🥗' },
    { name: '统计', href: '/statistics', emoji: '📊' },
  ]

  // 2. 电脑端左侧主要菜单
  const desktopNavItems = [
    { name: '首页', href: '/' },
    { name: '菜谱', href: '/recipes' },
    { name: '日记', href: '/diary' },
    { name: '统计', href: '/statistics' },
  ]

  return (
    <>
      {/* ==============================
          1. 移动端：顶部导航栏
          ============================== */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-100 z-50 flex items-center justify-between px-4 sm:hidden">
        {/* 左侧：标题 */}
        <Link href="/" className="font-black text-lg tracking-tight active:opacity-70 transition-opacity">
          🥕 Kyle's Cookbook
        </Link>

        {/* 右侧：功能区 (设置 + 个人中心) */}
        <div className="flex items-center gap-2">
          {/* 仅在已登录时显示设置按钮 */}
          {user && (
            <Link 
              href="/settings"
              className={`p-2 rounded-full transition-colors ${
                pathname === '/settings' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Settings size={20} />
            </Link>
          )}

          {/* 登录/个人中心 */}
          <Link 
            href={user ? '/profile' : '/login'}
            className={`p-2 rounded-full transition-colors ${
              pathname === '/profile' ? 'bg-black text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {user ? <User size={20} /> : <LogIn size={20} />}
          </Link>
        </div>
      </div>

      {/* 顶部占位 */}
      <div className="h-14 sm:hidden"></div>


      {/* ==============================
          2. 移动端：底部导航栏
          ============================== */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-safe sm:hidden z-50 safe-area-bottom">
        <div className="flex justify-around items-center h-16">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link 
                key={item.href} 
                href={item.href} 
                className="flex-1 h-full flex flex-col items-center justify-center gap-1 active:scale-95 transition-transform"
              >
                <span className="text-2xl leading-none filter drop-shadow-sm">
                  {item.emoji}
                </span>
                <span className={`text-[10px] font-bold transition-colors ${
                  isActive ? 'text-black' : 'text-gray-400'
                }`}>
                  {item.name}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>


      {/* ==============================
          3. 电脑端：顶部导航栏
          ============================== */}
      <nav className="hidden sm:block sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tighter">
            K<span className="text-orange-500">.</span>Cookbook
          </Link>

          <div className="flex items-center gap-8">
            {desktopNavItems.map((item) => (
               <Link 
                  key={item.href} 
                  href={item.href} 
                  className={`text-sm font-bold transition-colors ${
                    pathname === item.href ? 'text-black' : 'text-gray-400 hover:text-black'
                  }`}
                >
                  {item.name}
               </Link>
            ))}
            
            {/* 倒数第二个位置：仅在登录后显示的“设置”按钮 */}
            {user && (
              <Link 
                href="/settings" 
                className={`text-sm font-bold transition-colors ${
                  pathname === '/settings' ? 'text-black' : 'text-gray-400 hover:text-black'
                }`}
              >
                设置
              </Link>
            )}

            {/* 最后一个位置：登录/我的 */}
            <Link 
              href={user ? '/profile' : '/login'} 
              className="bg-black text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition-all flex items-center gap-2"
            >
               {user ? <User size={16}/> : <LogIn size={16}/>}
               <span>{user ? '我的' : '登录'}</span>
            </Link>
          </div>
        </div>
      </nav>
    </>
  )
}