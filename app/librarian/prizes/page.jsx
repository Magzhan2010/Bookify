'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Pencil, EyeOff, Eye, Upload, Trash2, Package } from 'lucide-react'
import { Button, Modal, Skeleton } from '../../../components/ui'
import PrizeVisual from '../../../components/game/PrizeVisual'

/**
 * Магазин призов для библиотекаря: цены, остаток на складе, новые призы, фото.
 * Закончился приз (остаток 0) — он сам пропадает из магазина учеников.
 */
const inputCls = 'w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-soft)] border border-transparent text-[14px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-brand)]/40'

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || 'Ошибка')
  return data
}

function compress(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const s = Math.min(1, 800 / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * s); c.height = Math.round(img.height * s)
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
      ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Не получилось открыть фото')) }
    img.src = url
  })
}

export default function PrizesAdminPage() {
  const [prizes, setPrizes] = useState(null)
  const [edit, setEdit] = useState(null) // {} — новый

  const load = useCallback(async () => {
    try { setPrizes(await api('/api/librarian/prizes')) } catch (e) { toast.error(e.message); setPrizes([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const quick = async (p, patch, msg) => {
    try { await api(`/api/librarian/prizes/${p.id}`, 'PATCH', patch); toast.success(msg); load() } catch (e) { toast.error(e.message) }
  }

  return (
    <div className="max-w-[1100px] mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-7">
        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-[-0.025em] text-[var(--color-text-primary)]">Магазин призов</h1>
          <p className="text-[15px] text-[var(--color-text-secondary)] mt-1">Цены, остаток на складе и новые призы. Остаток 0 — приз скрывается сам.</p>
        </div>
        <Button icon={Plus} onClick={() => setEdit({})}>Новый приз</Button>
      </div>

      {!prizes ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-80 rounded-[22px]" />)}</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {prizes.map((p, i) => {
            const out = p.stock !== null && p.stock <= 0
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-[22px] bg-[var(--color-bg-card)] border border-[var(--color-border)] p-3 flex flex-col ${!p.active ? 'opacity-60' : ''}`}
              >
                <div className="relative">
                  <PrizeVisual code={p.code} image={p.custom_image} />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    {!p.active && <span className="px-2.5 py-1 rounded-full bg-black/70 text-white text-[11px] font-semibold">Скрыт</span>}
                    {p.active && out && <span className="px-2.5 py-1 rounded-full bg-[var(--color-danger)] text-white text-[11px] font-semibold">Закончился</span>}
                  </div>
                </div>
                <div className="px-1 pt-3 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-[16px] text-[var(--color-text-primary)] leading-tight">{p.title}</div>
                    <div className="text-[16px] font-bold text-[#c98a12] tabular-nums whitespace-nowrap">{p.price} 🪙</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                    <Num label="на складе" value={p.stock === null ? '∞' : p.stock} warn={p.stock !== null && p.stock <= 3} />
                    <Num label="ждут выдачи" value={p.pending} />
                    <Num label="выдано" value={p.issued} />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => setEdit(p)} className="flex-1 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[13px] font-medium flex items-center justify-center gap-1.5 hover:bg-[var(--color-border)]">
                      <Pencil size={13} /> Изменить
                    </button>
                    <button
                      onClick={() => quick(p, { active: !p.active }, p.active ? 'Приз скрыт из магазина' : 'Приз снова в магазине')}
                      className="px-3 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[13px] hover:bg-[var(--color-border)]"
                      title={p.active ? 'Скрыть из магазина' : 'Показать в магазине'}
                      aria-label={p.active ? 'Скрыть из магазина' : 'Показать в магазине'}
                    >
                      {p.active ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <PrizeEditor prize={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load() }} />
    </div>
  )
}

function Num({ label, value, warn }) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] py-2">
      <div className={`text-[17px] font-bold tabular-nums ${warn ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-primary)]'}`}>{value}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  )
}

function PrizeEditor({ prize, onClose, onSaved }) {
  const isNew = prize && !prize.id
  const [f, setF] = useState({ title: '', description: '', price: 50, stock: '', unlimited: true, needs_note: false })
  const [image, setImage] = useState(undefined) // undefined — не менять, null — убрать, string — новое
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!prize) return
    setF({
      title: prize.title || '', description: prize.description || '', price: prize.price || 50,
      stock: prize.stock ?? '', unlimited: prize.id ? prize.stock === null : true, needs_note: !!prize.needs_note
    })
    setImage(undefined)
  }, [prize])

  const set = (k, v) => setF(x => ({ ...x, [k]: v }))
  const preview = image === undefined ? prize?.custom_image : image

  const pick = async e => {
    const file = e.target.files?.[0]; e.target.value = ''
    if (!file) return
    try { setImage(await compress(file)) } catch (err) { toast.error(err.message) }
  }

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title: f.title, description: f.description, price: f.price, needs_note: f.needs_note,
        stock: f.unlimited ? null : f.stock === '' ? 0 : f.stock
      }
      if (image !== undefined) body.image = image
      if (isNew) await api('/api/librarian/prizes', 'POST', body)
      else await api(`/api/librarian/prizes/${prize.id}`, 'PATCH', body)
      toast.success(isNew ? 'Приз добавлен в магазин' : 'Сохранено')
      onSaved()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  return (
    <Modal open={!!prize} onClose={onClose} title={isNew ? 'Новый приз' : 'Изменить приз'} size="lg">
      <form onSubmit={save} className="grid sm:grid-cols-[180px_1fr] gap-5">
        <div>
          <div className="w-full aspect-square rounded-2xl overflow-hidden bg-[var(--color-bg-soft)] flex items-center justify-center">
            {preview
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={preview} alt="" className="w-full h-full object-cover" />
              : prize?.code && !isNew ? <PrizeVisual code={prize.code} /> : <Package size={40} className="text-[var(--color-text-tertiary)]" />}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <button type="button" onClick={() => fileRef.current?.click()} className="w-full mt-2 py-2 rounded-xl bg-[var(--color-bg-soft)] text-[13px] font-medium flex items-center justify-center gap-1.5 hover:bg-[var(--color-border)]">
            <Upload size={13} /> Фото
          </button>
          {preview && (
            <button type="button" onClick={() => setImage(null)} className="w-full mt-1.5 py-1.5 text-[12px] text-[var(--color-danger)] flex items-center justify-center gap-1">
              <Trash2 size={12} /> Убрать своё фото
            </button>
          )}
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Название</span>
            <input value={f.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="Например: Стикерпак" />
          </label>
          <label className="block">
            <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Описание</span>
            <input value={f.description} onChange={e => set('description', e.target.value)} className={inputCls} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">Цена, монет</span>
              <input type="number" min="1" value={f.price} onChange={e => set('price', e.target.value)} className={inputCls} />
            </label>
            <label className="block">
              <span className="block text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">На складе, шт.</span>
              <input type="number" min="0" value={f.unlimited ? '' : f.stock} disabled={f.unlimited} onChange={e => set('stock', e.target.value)} className={`${inputCls} disabled:opacity-50`} placeholder="∞" />
            </label>
          </div>
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer">
            <input type="checkbox" checked={f.unlimited} onChange={e => set('unlimited', e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
            Не считать остаток (без ограничения)
          </label>
          <label className="flex items-center gap-2.5 text-[13px] cursor-pointer">
            <input type="checkbox" checked={f.needs_note} onChange={e => set('needs_note', e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
            Ученик пишет пожелание при заказе (как «Книга из Wish List»)
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
            <Button type="submit" loading={saving}>{isNew ? 'Добавить' : 'Сохранить'}</Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
