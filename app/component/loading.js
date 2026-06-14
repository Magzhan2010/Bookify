export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-[#080c14] p-8 flex flex-col items-center">
      {/* Скелетон Аватара */}
      <div className="w-24 h-24 rounded-full bg-white/5 animate-pulse mb-6" />
      
      {/* Скелетон Имени */}
      <div className="h-8 w-48 bg-white/5 rounded-lg animate-pulse mb-4" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mt-8">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-white/5 border border-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  )
}