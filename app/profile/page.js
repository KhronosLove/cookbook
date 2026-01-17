'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'
import { LogOut, User, Mail, Fingerprint, Loader2, ArrowRight } from 'lucide-react'

export default function ProfilePage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        alert('注册成功！请检查邮箱确认邮件，或直接尝试登录。')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        // 登录成功，跳转主页
        router.refresh()
        router.replace('/') 
      }
    } catch (error) {
      alert(error.message)
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.refresh()
  }

  if (loading) return (
    <>
      <Navbar /><PageContainer><div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-gray-400" /></div></PageContainer>
    </>
  )

  return (
    <>
      <Navbar />
      <PageContainer>
        <div className="max-w-md mx-auto p-6 pt-10">
          <h1 className="text-2xl font-bold mb-8 text-center text-gray-900">用户管理</h1>
          
          {user ? (
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
               <div className="flex flex-col items-center gap-4">
                 <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 border-4 border-white shadow-lg"><User size={48} /></div>
                 <div className="text-center">
                   <div className="font-bold text-xl text-gray-900">{user.email}</div>
                   <div className="flex items-center justify-center gap-1 text-xs text-gray-400 font-mono mt-1 bg-gray-50 px-2 py-1 rounded-full"><Fingerprint size={12}/>{user.id.slice(0, 8)}...{user.id.slice(-4)}</div>
                 </div>
               </div>
               <div className="bg-blue-50 p-4 rounded-2xl text-xs text-blue-700 leading-relaxed"><p className="font-bold mb-1">💡 多端同步指南</p><p>请确保在手机和电脑上登录的是同一个账号（检查上方 ID 前几位是否一致）。数据将自动通过云端实时同步。</p></div>
               <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 text-red-600 bg-red-50 py-4 rounded-2xl font-bold hover:bg-red-100 transition-colors"><LogOut size={18} /> 退出登录</button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl animate-in fade-in slide-in-from-bottom-4">
              <h2 className="text-xl font-bold mb-6 text-center text-gray-900">{isSignUp ? '注册新账号' : '欢迎回来'}</h2>
              <form onSubmit={handleAuth} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">邮箱</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 text-gray-400" size={18}/>
                    <input type="email" required placeholder="name@example.com" className="w-full bg-gray-50 border border-gray-200 p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all text-gray-900" value={email} onChange={e => setEmail(e.target.value)}/>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">密码</label>
                  <input type="password" required placeholder="••••••••" className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-black transition-all text-gray-900" value={password} onChange={e => setPassword(e.target.value)}/>
                </div>
                <button type="submit" disabled={authLoading} className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-black/20">{authLoading ? <Loader2 className="animate-spin"/> : <>{isSignUp ? '注册' : '登录'} <ArrowRight size={18}/></>}</button>
              </form>
              <div className="mt-6 text-center text-sm text-gray-500">{isSignUp ? '已有账号？' : '还没有账号？'} <button onClick={() => setIsSignUp(!isSignUp)} className="text-black font-bold ml-1 underline hover:text-blue-600 transition-colors">{isSignUp ? '去登录' : '去注册'}</button></div>
            </div>
          )}
        </div>
      </PageContainer>
    </>
  )
}