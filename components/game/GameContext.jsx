'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

/**
 * Общие игровые данные ученика (баланс, уровень, место) для всех страниц
 * ученического раздела. Грузятся один раз и обновляются по refresh() —
 * например, после покупки в магазине — и при возвращении на вкладку.
 */
const GameContext = createContext({ summary: null, loading: true, refresh: () => {} })

export function GameProvider({ children, enabled = true }) {
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const lastLoad = useRef(0)

  const refresh = useCallback(async () => {
    if (!enabled) return
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch('/api/game/summary', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setSummary(await res.json())
    } catch (e) {
      // игровая панель не критична — тихо игнорируем
    } finally {
      lastLoad.current = Date.now()
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    refresh()
    // При возвращении на вкладку — обновим, но не чаще раза в 30 секунд
    const onFocus = () => {
      if (Date.now() - lastLoad.current > 30_000) refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  return (
    <GameContext.Provider value={{ summary, loading, refresh }}>
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => useContext(GameContext)
