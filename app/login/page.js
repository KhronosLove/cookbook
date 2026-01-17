'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false) // 切换注册/登录模式

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isSignUp) {
        // 注册
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error
        alert('注册成功！已自动登录')
      } else {
        // 登录
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
      
      // 成功后跳转回首页
      router.push('/')
      router.refresh() // 刷新页面状态
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm border border-gray-100">
        <div className="flex justify-center mb-6 text-black">
          <ChefHat size={48} />
        </div>
        <h2 className="text-2xl font-bold text-center mb-6">
          {isSignUp ? '注册账号' : '登录 Kitchen Lab'}
        </h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-black"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              required
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少6位字符"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 rounded-lg font-bold hover:bg-gray-800 transition-colors"
          >
            {loading ? '处理中...' : (isSignUp ? '注册并登录' : '登 录')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="underline hover:text-black"
          >
            {isSignUp ? '已有账号？去登录' : '没有账号？去注册'}
          </button>
        </div>
      </div>
    </div>
  )
}