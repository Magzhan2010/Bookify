'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Trash2, Upload } from 'lucide-react'
import { Modal, Button } from './ui'
import { announceAvatar } from '../lib/useMyAvatar'

/**
 * Окно смены аватарки: своё фото (обрезается в квадрат и сжимается в браузере)
 * или готовая картинка из набора. Сохраняет через PUT /api/profile/avatar.
 */
const PRESETS = [
  { emoji: '📚', from: '#2f5bea', to: '#1f3a78' },
  { emoji: '🦉', from: '#c98a12', to: '#8a5c06' },
  { emoji: '🚀', from: '#8e4ec6', to: '#5a2a88' },
  { emoji: '🦊', from: '#fc9475', to: '#e5484d' },
  { emoji: '🐼', from: '#1d1d1f', to: '#4a5470' },
  { emoji: '🌱', from: '#7dc9a9', to: '#1aa37a' },
  { emoji: '⭐', from: '#f5dc7f', to: '#f5a524' },
  { emoji: '🎧', from: '#0ea5e9', to: '#0369a1' },
  { emoji: '🧠', from: '#f99ca9', to: '#e0457b' },
  { emoji: '⚽', from: '#30a46c', to: '#0e6b52' },
  { emoji: '🎨', from: '#a9e0da', to: '#2f5bea' },
  { emoji: '🏆', from: '#e6ae3a', to: '#c2410c' }
]

const SIZE = 256

function presetToDataUrl(p) {
  const c = document.createElement('canvas')
  c.width = c.height = SIZE
  const ctx = c.getContext('2d')
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE)
  g.addColorStop(0, p.from); g.addColorStop(1, p.to)
  ctx.fillStyle = g; ctx.fillRect(0, 0, SIZE, SIZE)
  ctx.font = `${SIZE * 0.5}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(p.emoji, SIZE / 2, SIZE / 2 + SIZE * 0.03)
  return c.toDataURL('image/jpeg', 0.9)
}

function fileToSquare(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('Выбери картинку'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const c = document.createElement('canvas')
      c.width = c.height = SIZE
      const ctx = c.getContext('2d')
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, SIZE, SIZE)
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, SIZE, SIZE)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не получилось открыть фото')) }
    img.src = url
  })
}

export default function AvatarPicker({ open, onClose, current, name, onSaved }) {
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  const shown = preview || current
  const close = () => { setPreview(null); onClose() }

  const pickFile = async e => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try { setPreview(await fileToSquare(f)) } catch (err) { toast.error(err.message) }
  }

  const save = async () => {
    if (!preview) return close()
    setSaving(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: preview })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Ошибка')
      toast.success('Аватарка обновлена')
      announceAvatar(data.avatar_url)
      onSaved?.(data.avatar_url)
      close()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/profile/avatar', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
      if (!res.ok) throw new Error('Не удалось убрать фото')
      announceAvatar(null)
      onSaved?.(null)
      close()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={close}
      title="Аватарка"
      description="Загрузи своё фото или выбери картинку"
      footer={
        <>
          {current && !preview && (
            <Button variant="ghost" icon={Trash2} onClick={remove} disabled={saving} className="mr-auto !text-[var(--color-danger)]">Убрать</Button>
          )}
          <Button variant="secondary" onClick={close}>Отмена</Button>
          <Button onClick={save} loading={saving} disabled={!preview}>Сохранить</Button>
        </>
      }
    >
      <div className="flex flex-col items-center">
        <div className="w-28 h-28 rounded-full overflow-hidden bg-[var(--color-brand)] flex items-center justify-center text-white text-4xl font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.12)]">
          {shown
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={shown} alt="" className="w-full h-full object-cover animate-[prizeFade_.3s_ease]" />
            : (name || '?').charAt(0).toUpperCase()}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
        <Button variant="secondary" icon={Upload} className="mt-4" onClick={() => fileRef.current?.click()}>
          Загрузить фото
        </Button>
      </div>

      <div className="mt-6">
        <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-2">Или выбери</div>
        <div className="grid grid-cols-6 gap-2.5">
          {PRESETS.map(p => (
            <button
              key={p.emoji}
              type="button"
              onClick={() => setPreview(presetToDataUrl(p))}
              className="aspect-square rounded-full flex items-center justify-center text-[22px] apple-press hover:scale-105 transition-transform"
              style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
              aria-label={`Аватарка ${p.emoji}`}
            >
              {p.emoji}
            </button>
          ))}
        </div>
      </div>
    </Modal>
  )
}

/** Круглая аватарка: фото или первая буква имени. */
export function UserAvatar({ src, name, className = '', textClass = '' }) {
  return (
    <div className={`overflow-hidden flex items-center justify-center font-semibold text-white bg-[var(--color-brand)] shrink-0 ${className}`}>
      {src
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" className="w-full h-full object-cover" />
        : <span className={textClass}>{(name || '?').charAt(0).toUpperCase()}</span>}
    </div>
  )
}

