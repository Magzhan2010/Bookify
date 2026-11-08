'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Gift, Check, X, Loader2 } from 'lucide-react'
import { Button, EmptyState } from '../../../components/ui'
import PrizeVisual from '../../../components/game/PrizeVisual'
import { HIGHLIGHTER_COLORS, colorKeyFromNote } from '../../../lib/points'

const FILTERS = [
  { key: 'pending', label: 'Ждут выдачи' },
  { key: 'issued', label: 'Выданы' },
  { key: 'cancelled', label: 'Отменены' },
  { key: 'all', label: 'Все' }
]

const STATUS_LABEL = { pending: 'Ждёт выдачи', issued: 'Выдан', cancelled: 'Отменён' }

export default function LibrarianOrdersPage() {
  const [filter, setFilter] = useState('pending')
  const [orders, setOrders] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/librarian/orders?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setOrders(d.orders || [])
      setCounts(d.counts || {})
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filter])

  const act = async (id, action) => {
    setBusy(id)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/librarian/orders/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success(action === 'issue' ? 'Приз выдан 🎉' : 'Заказ отменён, монеты вернулись ученику')
      load()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-[1000px] mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight mb-1 text-[var(--color-text-primary)] flex items-center gap-2">
          <Gift className="text-[var(--color-brand)]" /> Призы
        </h1>
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          Ученики обменивают монеты на призы. Отдай приз и нажми «Выдан». Отмена возвращает монеты ученику.
        </p>
      </div>

      <div className="flex gap-1 mb-5 p-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl w-fit max-w-full overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-lg text-[13px] font-medium whitespace-nowrap flex items-center gap-2 ${
              filter === f.key ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-secondary)]'
            }`}
          >
            {f.label}
            {f.key !== 'all' && (
              <span className={`text-[11px] ${filter === f.key ? 'text-white/80' : 'text-[var(--color-text-tertiary)]'}`}>
                {counts[f.key] || 0}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-[var(--color-brand)]" /></div>
      ) : orders.length === 0 ? (
        <EmptyState title={filter === 'pending' ? 'Новых заказов нет' : 'Здесь пока пусто'} />
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <div key={o.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <PrizeVisual code={o.prize_code} variant={colorKeyFromNote(o.note)} size="sm" className="shrink-0 !w-14 !h-14" />
                <div className="min-w-0">
                  <div className="font-semibold text-[15px] text-[var(--color-text-primary)]">
                    {o.prize_title} <span className="text-[var(--color-text-tertiary)] font-normal">· {o.price} монет</span>
                  </div>
                  <div className="text-[13px] text-[var(--color-text-secondary)] truncate">
                    {o.student_name}{o.student_class ? ` · ${o.student_class} класс` : ''}
                  </div>
                  {o.note && (colorKeyFromNote(o.note) ? (
                    <div className="text-[12px] text-[var(--color-text-primary)] mt-0.5 flex items-center gap-1.5 font-medium">
                      <span className="w-3 h-3 rounded-full" style={{ background: HIGHLIGHTER_COLORS.find(c => c.key === colorKeyFromNote(o.note))?.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                      {o.note}
                    </div>
                  ) : (
                    <div className="text-[12px] text-[var(--color-brand)] mt-0.5">«{o.note}»</div>
                  ))}
                  <div className="text-[11px] text-[var(--color-text-tertiary)] mt-0.5">
                    {new Date(o.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    {o.status !== 'pending' && ` · ${STATUS_LABEL[o.status]}${o.processed_by_name ? ` (${o.processed_by_name})` : ''}`}
                  </div>
                </div>
              </div>
              {o.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="secondary" icon={X} disabled={busy === o.id} onClick={() => act(o.id, 'cancel')}>
                    Отменить
                  </Button>
                  <Button size="sm" icon={Check} loading={busy === o.id} onClick={() => act(o.id, 'issue')}>
                    Выдан
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
