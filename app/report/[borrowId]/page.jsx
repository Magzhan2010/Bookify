'use client'

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const Reports = () => {
	const [selectedBorrow, setSelectedBorrow] = useState(null) 
	const [quote1, setQuote1] = useState('')
	const [quote2, setQuote2] = useState('')
	const [confusing, setConfusing] = useState('')
	const [lifeExample, setLifeExample] = useState('')
	const [applyToday, setApplyToday] = useState('')
	const [rating, setRating] = useState(0)
	const [loading,setLoading] = useState(false)
	const [result,setResult] = useState(null)
	const router = useRouter()
	const {borrowId} =  useParams()
	
	const handleSubmit = async () => {
  setLoading(true)
  setResult(null)

  try {
    const token = localStorage.getItem('token')
    
    const bodyData = {
      bookId: selectedBorrow.book_id,
      borrowId: borrowId,
      quote1: quote1,
      quote2: quote2,
      confusing,
      life_example: lifeExample,
      apply_today: applyToday,
      rating
    }


    const res = await fetch('/api/reports', {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(bodyData)
    })

    const data = await res.json()

    if (res.ok) {
      setResult({ success: `Отчет принят! Оценка ИИ: ${data.ai_score}%` })
    } else {
      setResult({ error: data.error })
    }

  } catch (err) {
    setResult({ error: "Не удалось отправить отчет" })
  } finally {
    setLoading(false)
  }
}

	useEffect(() => {
		const fetchData = async () => {
			const token = localStorage.getItem("token")

			try {
				const resBooks = await fetch('/api/profile', {
					method: "GET",
					headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }
				})
				const data = await resBooks.json()
				const bookFind = data.active.find(b=> b.borrow_id === Number(borrowId))
				console.log("1. ID из URL:", borrowId)
				console.log("2. Книги из базы:", data.active)
				console.log("3. Результат поиска:", bookFind)
				
				
				setSelectedBorrow(bookFind)		
			} catch(err) {	
				console.error(err.message)
			}
		}
		fetchData()
	}, [])
	
	
	return(
		<div className="max-w-[800px] mx-auto px-6 py-12 min-h-screen bg-[#080c14] text-white">
			
			<div className="text-center mb-12 relative">
				<div className="absolute inset-0 bg-[#1a56db] blur-[120px] opacity-10 -z-10"></div>
				<p className="text-[#4a6080] text-sm uppercase tracking-[0.3em] font-mono mb-4">Divergents Academic</p>
				<h1 className="text-3xl md:text-4xl font-extrabold mb-4 bg-gradient-to-r from-white to-[#60a5fa] bg-clip-text text-transparent leading-tight">
					Книга — для изменения мышления
				</h1>
				<p className="text-[#4a6080] text-sm italic max-w-[500px] mx-auto">
					"Книги делятся мнением. Мнения сеют сомнения. От сомнения лень, а от лени веет забвением."
				</p>
				<div className="mt-6 inline-block bg-[#1a56db]/10 border border-[#1a56db]/30 text-[#60a5fa] text-xs font-bold uppercase tracking-widest px-6 py-2 rounded-full">
					Book Review
				</div>
			</div>

      {selectedBorrow && (
        <div className="bg-[#0d1a2e] border border-[#162236] rounded-3xl p-6 flex gap-6 items-center relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
                    
            <img 
              src={selectedBorrow.cover_url} 
              className="w-24 h-32 object-cover rounded-xl shadow-2xl border border-white/10" 
              alt="Обложка книги" 
            />
                    
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#4a6080] font-bold mb-1">Вы пишете отчет по книге</p>
              <h3 className="text-2xl font-extrabold text-white mb-1 tracking-tight">{selectedBorrow.title}</h3>
              <p className="text-[#7a8eb0] text-sm mb-3">{selectedBorrow.author}</p>
              <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-widest bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full">
                В процессе чтения
              </span>
            </div>
          </div>
        )}


		<div className="flex flex-col gap-10 mt-12">
    
    <div className="bg-[#0d1a2e]/20 backdrop-blur-xl border border-[#162236] rounded-3xl p-8 relative overflow-hidden group hover:border-[#1a56db]/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
        
        <label className="text-lg font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#1a56db]/20 border border-[#1a56db]/50 text-[#60a5fa] text-sm flex items-center justify-center font-bold">1</span>
            Две важные цитаты из главы
        </label>
        <p className="text-[#4a6080] text-sm mb-4 ml-11">Найдите 2 ключевые мысли автора и объясните своими словами, почему они важны.</p>
        
        <textarea 
            onChange={e => setQuote1(e.target.value)} 
            value={quote1} 
            placeholder="Например: 'Дисциплина — это решение делать то, чего очень не хочется делать...' Мой смысл: ..."
            className="w-full bg-[#080c14]/50 border border-[#162236] rounded-xl px-5 py-4 text-white text-base outline-none focus:border-[#1a56db] focus:shadow-[0_0_15px_rgba(26,86,219,0.2)] transition-all resize-none h-44 placeholder-[#1c2a40]"
        />
    </div>

    {/* Шаг 2 */}
    <div className="bg-[#0d1a2e]/20 backdrop-blur-xl border border-[#162236] rounded-3xl p-8 relative overflow-hidden group hover:border-[#1a56db]/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
        
        <label className="text-lg font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#1a56db]/20 border border-[#1a56db]/50 text-[#60a5fa] text-sm flex items-center justify-center font-bold">2</span>
            Что было непонятно или удивило?
        </label>
        <p className="text-[#4a6080] text-sm mb-4 ml-11">Опишите концепции, которые заставили вас задуматься или вызвали вопросы.</p>
        
        <textarea 
            onChange={e => setQuote2(e.target.value)} 
            value={quote2} 
            placeholder="Меня удивил тот факт, что наш мозг тратит 20% всей энергии..."
            className="w-full bg-[#080c14]/50 border border-[#162236] rounded-xl px-5 py-4 text-white text-base outline-none focus:border-[#1a56db] focus:shadow-[0_0_15px_rgba(26,86,219,0.2)] transition-all resize-none h-44 placeholder-[#1c2a40]"
        />
    </div>

    {/* Шаг 3 */}
    <div className="bg-[#0d1a2e]/20 backdrop-blur-xl border border-[#162236] rounded-3xl p-8 relative overflow-hidden group hover:border-[#1a56db]/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
        
        <label className="text-lg font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#1a56db]/20 border border-[#1a56db]/50 text-[#60a5fa] text-sm flex items-center justify-center font-bold">3</span>
            Как это проявляется в твоей жизни?
        </label>
        <p className="text-[#4a6080] text-sm mb-4 ml-11">Свяжите прочитанное с личным опытом или ситуациями в вашей школе/жизни.</p>
        
        <textarea 
            onChange={e => setLifeExample(e.target.value)} 
            value={lifeExample} 
            placeholder="В моей жизни это проявляется тогда, когда я пытаюсь проснуться в 6 утра..."
            className="w-full bg-[#080c14]/50 border border-[#162236] rounded-xl px-5 py-4 text-white text-base outline-none focus:border-[#1a56db] focus:shadow-[0_0_15px_rgba(26,86,219,0.2)] transition-all resize-none h-44 placeholder-[#1c2a40]"
        />
    </div>

    {/* Шаг 4 */}
    <div className="bg-[#0d1a2e]/20 backdrop-blur-xl border border-[#162236] rounded-3xl p-8 relative overflow-hidden group hover:border-[#1a56db]/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
        
        <label className="text-lg font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#1a56db]/20 border border-[#1a56db]/50 text-[#60a5fa] text-sm flex items-center justify-center font-bold">4</span>
            Что попробуешь применить уже сегодня?
        </label>
        <p className="text-[#4a6080] text-sm mb-4 ml-11">Напишите конкретный, измеримый план действий на ближайшие дни.</p>
        
        <textarea 
            onChange={e => setApplyToday(e.target.value)} 
            value={applyToday} 
            placeholder="Я удалю соцсети на 3 часа в день, чтобы сфокусироваться на коде..."
            className="w-full bg-[#080c14]/50 border border-[#162236] rounded-xl px-5 py-4 text-white text-base outline-none focus:border-[#1a56db] focus:shadow-[0_0_15px_rgba(26,86,219,0.2)] transition-all resize-none h-44 placeholder-[#1c2a40]"
        />
    </div>

    {/* Шаг 5 */}
    <div className="bg-[#0d1a2e]/20 backdrop-blur-xl border border-[#162236] rounded-3xl p-8 relative overflow-hidden group hover:border-[#1a56db]/50 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#1a56db] blur-[100px] opacity-10 -z-10"></div>
        
        <label className="text-lg font-bold text-white mb-2 flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-[#1a56db]/20 border border-[#1a56db]/50 text-[#60a5fa] text-sm flex items-center justify-center font-bold">5</span>
            Какие новые факты узнал?
        </label>
        <p className="text-[#4a6080] text-sm mb-4 ml-11">Выпишите новую информацию, цифры или факты, о которых вы раньше не знали.</p>
        
        <textarea 
            onChange={e => setConfusing(e.target.value)} 
            value={confusing} 
            placeholder="Я узнал, что Дэвид Гоггинс весил почти 130 кг перед тем, как..."
            className="w-full bg-[#080c14]/50 border border-[#162236] rounded-xl px-5 py-4 text-white text-base outline-none focus:border-[#1a56db] focus:shadow-[0_0_15px_rgba(26,86,219,0.2)] transition-all resize-none h-44 placeholder-[#1c2a40]"
        />
    </div>
</div>

<div className="mt-12 bg-[#0d1a2e]/50 border border-[#162236] p-8 rounded-3xl flex flex-col items-center">
    <p className="text-xs text-[#4a6080] uppercase tracking-widest mb-4">Субъективная оценка книги</p>
    <div className="flex gap-4">
        {[1, 2, 3, 4, 5].map(star => (
            <button 
                key={star} 
                className={`text-4xl transition-all duration-200 hover:scale-125 cursor-pointer ${star <= rating ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "text-[#162236]"}`} 
                onClick={() => setRating(star)}
            >
                {star <= rating ? "★" : "☆"}
            </button>
        ))}
    </div>
</div>

			<button 
					onClick={() => handleSubmit()} 
					disabled={loading}
					className="w-full bg-gradient-to-r from-[#1a56db] to-[#60a5fa] py-5 rounded-2xl font-bold text-lg mt-8 shadow-lg shadow-[#1a56db]/20 transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
			>
					{loading ? (
							<>
									<div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
									Система ИИ проверяет ваш отчет...
							</>
					) : 'Сдать отчёт в систему'}
			</button>
			{result && result.error && (
				<div className="text-red-400 text-center mt-4 bg-red-500/10 border border-red-500/30 rounded-xl py-3 px-4">
					{result.error}
				</div>
			)}
			{result && result.success && (
				<div className="text-green-400 text-center mt-4 bg-green-500/10 border border-green-500/30 rounded-xl py-3 px-4">
					{result.success}
				</div>
			)}
		</div>
	)
} 

export default Reports;
