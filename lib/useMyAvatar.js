'use client'

import { useEffect, useState } from 'react'

/**
 * Аватарка текущего пользователя (для шапок и меню).
 * Кэш в sessionStorage по токену; после смены фото AvatarPicker шлёт событие
 * 'bookify:avatar', и все места обновляются сразу.
 */
const KEY = 'bookify:my-avatar'

export function announceAvatar(url) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ token: localStorage.getItem('token'), url })) } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bookify:avatar', { detail: url }))
}

export function useMyAvatar() {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const onChange = e => setUrl(e.detail || null)
    window.addEventListener('bookify:avatar', onChange)
    let alive = true
    try {
      const c = JSON.parse(sessionStorage.getItem(KEY) || 'null')
      if (c && c.token === token) { setUrl(c.url); return () => window.removeEventListener('bookify:avatar', onChange) }
    } catch {}
    if (token) {
      fetch('/api/profile/avatar', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          if (!alive || !d) return
          setUrl(d.avatar_url || null)
          try { sessionStorage.setItem(KEY, JSON.stringify({ token, url: d.avatar_url || null })) } catch {}
        })
        .catch(() => {})
    }
    return () => { alive = false; window.removeEventListener('bookify:avatar', onChange) }
  }, [])

  return url
}
