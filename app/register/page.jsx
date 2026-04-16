"use client"
import { useRouter } from 'next/navigation'
import { useState } from "react";

const Register = (	) => {
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const router = useRouter()

	const handleSubmit = async (e) => {
		e.preventDefault()

		const res = await fetch('/api/auth/register', {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name,email,password })
		})
		const data = await res.json()
		if (data.success) {
			router.push('/login')
		} else {
			alert(data.error)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#080c14] px-4">
      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-md bg-[#0d1a2e] border border-[#162236] rounded-2xl p-8 shadow-2xl"
      >
      	<div className="mb-8 text-center flex flex-col items-center justify-center">
          <img 
            src="/lb_logo.png" 
            alt="dls-library logo" 
            className="relative opacity-80 hover:scale-110 transition-all duration-300"
            width={70} 
            height={70}
          />
          <h1 className="text-xl md:text-3xl font-bold text-white mb-2">
            Зарегистрироваться
          </h1>
          <p className="text-[#4a6080] text-sm">
          	Войдите в систему <span className="text-[#1a56db] font-semibold">Bookify</span>
          </p>
        </div>

        <div className="flex flex-col gap-5">
					<div className="flex flex-col gap-1">
            <label className="text-sm text-[#4a6080] ml-1">Имя</label>
            <input 
           		type="text" 
              required
              onChange={e => setName(e.target.value)} 
              value={name} 
              placeholder="Имя"
              className="bg-[#080c14] border border-[#162236] rounded-xl px-4 py-3 text-white outline-none placeholder-[#2a3a50] focus:border-[#1a56db] transition-all"
            />
        	</div>
          <div className="flex flex-col gap-1">
            <label className="text-sm text-[#4a6080] ml-1">Email</label>
            <input 
           		type="email" 
              required
              onChange={e => setEmail(e.target.value)} 
              value={email} 
              placeholder="name@company.com"
              className="bg-[#080c14] border border-[#162236] rounded-xl px-4 py-3 text-white outline-none placeholder-[#2a3a50] focus:border-[#1a56db] transition-all"
            />
        	</div>

            <div className="flex flex-col gap-1">
            	<label className="text-sm text-[#4a6080] ml-1">Пароль</label>
              <input 
                type="password" 
              	required
                onChange={e => setPassword(e.target.value)} 
                value={password} 
                placeholder="••••••••"
                className="bg-[#080c14] border border-[#162236] rounded-xl px-4 py-3 text-white outline-none placeholder-[#2a3a50] focus:border-[#1a56db] transition-all"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#1a56db] to-[#60a5fa] text-white font-bold py-3 rounded-xl mt-4 hover:opacity-90 transition-opacity shadow-lg shadow-[#1a56db]/20"
            >
              Регистрация
            </button>
      	</div>

          <p className="text-center text-[#4a6080] text-sm mt-6">
            Уже есть аккаунт? <a href="/login" className='text-[#1a56db]'>Войти</a>
        	</p>
      </form>
    </div>
	 )
}

export default Register;