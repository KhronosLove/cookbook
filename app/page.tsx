import Link from 'next/link'
import Navbar from '@/components/Navbar'
import PageContainer from '@/components/PageContainer'
import { BookOpen, Activity, BarChart2, ArrowRight, ChefHat, Sparkles } from 'lucide-react'

export default function Home() {
  const cards = [
    {
      href: '/recipes',
      title: '菜谱库',
      en: 'Recipes',
      desc: '管理你的私人厨房秘籍，记录每一次烹饪灵感。',
      icon: BookOpen,
      color: 'bg-orange-50 text-orange-600',
      border: 'hover:border-orange-200',
      arrow: 'text-orange-400'
    },
    {
      href: '/diary',
      title: '饮食日记',
      en: 'Diet Diary',
      desc: '追踪每日热量与宏量营养素，养成健康的饮食习惯，还能早日大肌霸。',
      icon: Activity,
      color: 'bg-indigo-50 text-indigo-600',
      border: 'hover:border-indigo-200',
      arrow: 'text-indigo-400'
    },
    {
      href: '/statistics',
      title: '数据统计',
      en: 'Statistics',
      desc: '可视化的数据分析，回顾周、月、年度的摄入趋势。',
      icon: BarChart2,
      color: 'bg-purple-50 text-purple-600',
      border: 'hover:border-purple-200',
      arrow: 'text-purple-400'
    }
  ]

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      
      <PageContainer>
        <div className="py-10 sm:py-20">
          
          {/* Header Section */}
          <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-100 px-4 py-2 rounded-full shadow-sm mb-6">
              <Sparkles size={16} className="text-yellow-500" />
              <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Personal Kitchen Lab</span>
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 mb-6 tracking-tight">
              🧑🏻‍🍳 Kyle's <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-600">Cookbook</span>
            </h1>

           
          </div>

          {/* Cards Grid */}
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto px-6 sm:px-0">
            {cards.map((card, idx) => (
              <Link 
                key={card.href} 
                href={card.href}
                className={`
                  group relative bg-white rounded-3xl p-8 
                  border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)]
                  transition-all duration-300 hover:-translate-y-1 hover:shadow-xl
                  ${card.border}
                  animate-in fade-in slide-in-from-bottom-8
                `}
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className={`w-14 h-14 ${card.color} rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 duration-300`}>
                  <card.icon size={28} strokeWidth={2} />
                </div>
                
                <h2 className="text-2xl font-bold text-slate-900 mb-2 group-hover:text-black transition-colors">
                  {card.title}
                </h2>
                <div className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-4">{card.en}</div>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  {card.desc}
                </p>

                <div className={`absolute bottom-8 right-8 ${card.arrow} opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all`}>
                  <ArrowRight size={24} />
                </div>
              </Link>
            ))}
          </div>

          {/* Footer Decoration */}
          <div className="mt-20 text-center">
             <p className="text-xs text-slate-300 font-mono">Designed for Healthy Living</p>
          </div>

        </div>
      </PageContainer>
    </div>
  )
}