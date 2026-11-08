'use client'

import { useEffect, useState } from 'react'

/**
 * Данные участника командной платформы (/api/team/me).
 * Кэшируется в sessionStorage, чтобы сайдбары не дёргали сервер на каждой странице.
 * undefined — ещё грузится, null — не участник, объект — участник.
 */
const KEY = 'bookify:team-me'

export function clearTeamMe() {
  try { sessionStorage.removeItem(KEY) } catch {}
}

export async function fetchTeamMe() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  if (!token) return null
  const res = await fetch('/api/team/me', { headers: { Authorization: `Bearer ${token}` } })
  if (res.status === 401) return null
  if (!res.ok) throw new Error('team/me failed')
  const data = await res.json()
  const value = data?.member ? data : null
  // Кэшируем только участников: если человека только что добавили, он увидит платформу сразу
  try { value ? sessionStorage.setItem(KEY, JSON.stringify({ token, value })) : sessionStorage.removeItem(KEY) } catch {}
  return value
}

export function useTeamMe() {
  const [me, setMe] = useState(undefined)

  useEffect(() => {
    let alive = true
    const token = localStorage.getItem('token')
    try {
      const cached = JSON.parse(sessionStorage.getItem(KEY) || 'null')
      if (cached && cached.token === token) {
        setMe(cached.value)
        return
      }
    } catch {}
    fetchTeamMe().then(v => alive && setMe(v)).catch(() => alive && setMe(null))
    return () => { alive = false }
  }, [])

  return me
}
