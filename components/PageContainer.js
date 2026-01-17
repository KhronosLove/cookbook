export default function PageContainer({ children, className = "" }) {
  return (
    <div className={`min-h-screen bg-gray-50 pt-20 pb-10 px-4 ${className}`}>
      <div className="max-w-5xl mx-auto bg-white min-h-[85vh] rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
        {children}
      </div>
    </div>
  )
}