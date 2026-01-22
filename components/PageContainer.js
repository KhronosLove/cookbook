export default function PageContainer({ children, className = "" }) {
  return (
    // 👇 修改重点：将 pt-20 改为 pt-16 sm:pt-24
    // 解释：
    // pt-16 (64px): 移动端。因为导航栏是56px，这样只留8px缝隙，紧凑美观。
    // sm:pt-24 (96px): 电脑端。保持宽敞的呼吸感。
    <div className={`min-h-screen bg-gray-50 pt-12 sm:pt-24 pb-10 px-4 ${className}`}>
      
      <div className="max-w-5xl mx-auto bg-white min-h-[85vh] rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {children}
      </div>
    </div>
  )
}