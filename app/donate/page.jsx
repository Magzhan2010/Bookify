'use client'
import Navbar from "../component/NavBar";

const DonatePage = () => {
  
  const kaspiLink = "https://kaspi.kz/pay/Transfer?phone=77055718202";
  
  const displayNumber = "+7 (705) 571 8202"; 

  return (
    <main className="min-h-screen bg-[#080c14] text-white pb-20">
      <Navbar />

      <div className="max-w-[500px] mx-auto px-6 md:px-10 pt-24 flex flex-col items-center text-center">
        
        <div className="text-6xl mb-8 animate-bounce">❤️</div>


        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
          Поддержи проект
        </h1>

        <p className="text-[#94a3b8] leading-relaxed mb-12">
          Если Bookify сделал твое обучение чуточку легче, купи мне кофе. 
          Нажми на карту ниже — откроется Каспи, нужно будет только ввести сумму!
        </p>

        <a 
          href={kaspiLink} 
          target="_blank"
          rel="noopener noreferrer"
          className="group w-full cursor-pointer mb-10"
        >
          <div className="relative w-full aspect-[1.6/1] max-w-[380px] rounded-2xl overflow-hidden 
          shadow-2xl shadow-black/50 transition-all duration-300 
            group-hover:shadow-blue-900/30 group-hover:scale-[1.02] active:scale-[0.98] 
            bg-[#0a101a] p-6 flex flex-col justify-between 
            border border-white/5">
            
            {/* Фоновый градиент-блик (характерный для Kaspi Gold) */}
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br from-[#c19a49]/20 to-transparent rounded-full blur-3xl"></div>
            
            {/* Верхняя часть карты */}
            <div className="flex justify-between items-start relative z-10">
              <div className="text-left">
                <p className="text-[#c19a49] text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Kaspi Gold</p>
                <div className="w-10 h-7 bg-gradient-to-br from-[#e5c78a] to-[#96702d] rounded-sm shadow-inner overflow-hidden relative">
                  {/* Полоски на чипе */}
                  <div className="absolute inset-0 flex flex-col justify-between p-[2px]">
                    <div className="h-[1px] bg-black/10 w-full"></div>
                    <div className="h-[1px] bg-black/10 w-full"></div>
                    <div className="h-[1px] bg-black/10 w-full"></div>
                  </div>
                </div>
              </div>
              <div className="text-2xl font-bold text-white flex items-center gap-1">
                <span className="text-[#c19a49]">Kaspi</span>
              </div>
            </div>

            {/* Нижняя часть карты */}
            <div className="flex flex-col items-start relative z-10">
              <p className="text-white/40 text-[9px] uppercase tracking-[0.3em] mb-2">Debit Card</p>
              <p className="text-white/90 text-xl font-mono tracking-[0.15em] mb-1">
                {displayNumber}
              </p>
              <p className="text-[#c19a49]/80 text-[10px] font-medium uppercase tracking-widest">
                Bookify Supporter
              </p>
            </div>

            {/* Эффект металлического отблеска */}
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
          </div>

        </a>


        {/* Подсказка */}
        <div className="bg-[#0d1a2e]/50 border border-dashed border-white/10 rounded-2xl p-5 w-full">
          <p className="text-sm text-[#4a6080] flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Нажми на карту — она сама откроет Каспи на твоем телефоне
          </p>
        </div>

        <button 
          onClick={() => window.history.back()}
          className="mt-12 text-[#4a6080] hover:text-white transition-colors text-sm font-medium"
        >
          ← Вернуться в библиотеку
        </button>

      </div>
    </main>
  );
};

export default DonatePage;