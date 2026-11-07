'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShoppingBag, Lock, Check, Clock, X, Gift, Info } from 'lucide-react'
import { Button, Modal, Input } from '../../../components/ui'
import { useGame } from '../../../components/game/GameContext'
import CoinCard from '../../../components/game/CoinCard'
import { PRIZE_TINTS } from '../../../lib/points'

const ORDER_STATUS = {
  pending: { label: 'Ждёт выдачи', icon: Clock, cls: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]' },
  issued: { label: 'Получен', icon: Check, cls: 'bg-[var(--color-success)]/15 text-[var(--color-success)]' },
  cancelled: { label: 'Отменён', icon: X, cls: 'bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)]' }
}

export default function ShopPage() {
  const { summary, refresh } = useGame()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [role, setRole] = useState('student')

  const load = async () => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/shop', { headers: { Authorization: `Bearer ${token}` } })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      setData(d)
    } catch (err) {
      toast.error(err.message || 'Не удалось загрузить магазин')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    import('../../../lib/jwt').then(({ parseJwt }) => {
      setRole(parseJwt(localStorage.getItem('token'))?.role || 'student')
    })
  }, [])

  const available = data?.balance?.available ?? summary?.balance?.available ?? 0
  const isStudent = role === 'student'

  const order = async () => {
    if (!buying) return
    if (buying.needs_note && !note.trim()) {
      toast.error('Напиши, какую книгу ты хочешь')
      return
    }
    setSaving(true)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/shop/order', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prizeId: buying.id, note })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success(`🎉 ${buying.title} — твой!`, { description: 'Забери приз у библиотекаря' })
      setBuying(null)
      setNote('')
      load()
      refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (orderId) => {
    const token = localStorage.getItem('token')
    try {
      const res = await fetch('/api/shop/order', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Ошибка')
      toast.success('Заказ отменён, баллы вернулись')
      load()
      refresh()
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <main className="max-w-[1100px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Шапка с балансом */}
      <section className="rounded-[28px] p-6 sm:p-8 mb-8 text-white bg-gradient-to-br from-[#1f2a5c] via-[#22348a] to-[#2f5bea] relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-white/70 text-[13px] font-semibold uppercase tracking-wider mb-2">
              <ShoppingBag size={16} /> Магазин призов
            </div>
            <h1 className="text-[30px] sm:text-[40px] font-extrabold leading-tight">Обменяй монеты на призы</h1>
            <p className="text-white/70 mt-1 text-[15px]">Выбери приз — библиотекарь выдаст его тебе в библиотеке.</p>
          </div>
          <div className="shrink-0 rounded-2xl bg-white/10 px-5 py-4 text-center">
            <div className="text-[12px] text-white/70 font-semibold">У тебя</div>
            <div className="text-[44px] font-extrabold leading-none text-[#ffc93c]">{available}</div>
            <div className="text-[12px] text-white/70">монет</div>
          </div>
        </div>
        <div className="absolute -right-6 -bottom-8 rotate-[-10deg] opacity-25 hidden sm:block">
          <CoinCard value={25} size="lg" />
        </div>
      </section>

      {!isStudent && (
        <div className="mb-6 p-4 rounded-2xl bg-[var(--color-bg-soft)] text-[13px] text-[var(--color-text-secondary)] flex items-center gap-2">
          <Info size={16} /> Это витрина для учеников. Заказы призов — в панели библиотекаря, раздел «Призы».
        </div>
      )}

      {/* Призы */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[320px] rounded-3xl bg-[var(--color-bg-soft)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(data?.prizes || []).map(p => {
            const enough = available >= p.price
            const pct = Math.min(100, Math.round((available / p.price) * 100))
            return (
              <div
                key={p.id}
                className={`group rounded-3xl border bg-[var(--color-bg-card)] p-3 sm:p-4 flex flex-col transition-all ${
                  enough
                    ? 'border-[#ffc93c] shadow-[0_6px_24px_rgba(255,201,60,0.25)] hover:-translate-y-1'
                    : 'border-[var(--color-border)]'
                }`}
              >
                <div
                  className="relative rounded-2xl aspect-square flex items-center justify-center mb-3 overflow-hidden"
                  style={{ background: PRIZE_TINTS[p.code] || '#eef2ff' }}
                >
                  <img
                    src={p.image}
                    alt={p.title}
                    className={`w-[80%] h-[80%] transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${enough ? '' : 'grayscale-[35%]'}`}
                  />
                  {!enough && (
                    <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                      <Lock size={13} className="text-[#1f2a5c]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-[14px] sm:text-[16px] text-[var(--color-text-primary)] leading-tight">{p.title}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5 line-clamp-2 min-h-[2.5em]">{p.description}</div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="px-3 py-1 rounded-full bg-[#ffc93c] text-[#1f2a5c] text-[14px] font-extrabold">
                    {p.price}
                  </span>
                  {!enough && (
                    <span className="text-[11px] text-[var(--color-text-tertiary)]">ещё {p.price - available}</span>
                  )}
                </div>
                {!enough && (
                  <div className="mt-2 h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                    <div className="h-full rounded-full bg-[var(--color-brand)]" style={{ width: `${pct}%` }} />
                  </div>
                )}
                {isStudent && (
                  <Button
                    size="sm"
                    className="mt-3"
                    fullWidth
                    variant={enough ? 'primary' : 'ghost'}
                    disabled={!enough}
                    icon={enough ? Gift : Lock}
                    onClick={() => { setBuying(p); setNote('') }}
                  >
                    {enough ? 'Обменять' : 'Не хватает'}
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Мои заказы */}
      {isStudent && data?.orders?.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[22px] font-extrabold text-[var(--color-text-primary)] mb-3">Мои призы</h2>
          <div className="space-y-2">
            {data.orders.map(o => {
              const st = ORDER_STATUS[o.status]
              const Icon = st.icon
              return (
                <div key={o.id} className="flex items-center gap-3 p-3 rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                  <img src={o.image} alt="" className="w-12 h-12 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[14px] text-[var(--color-text-primary)] truncate">{o.title}</div>
                    <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                      {o.price} монет · {new Date(o.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                      {o.note ? ` · «${o.note}»` : ''}
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 ${st.cls}`}>
                    <Icon size={12} /> {st.label}
                  </span>
                  {o.status === 'pending' && (
                    <button
                      onClick={() => cancel(o.id)}
                      className="text-[12px] text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] px-2"
                    >
                      Отменить
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      <p className="mt-8 text-[13px] text-[var(--color-text-tertiary)]">
        Как заработать монеты — на странице <Link href="/game" className="text-[var(--color-brand)] font-semibold">«Как это работает»</Link>.
      </p>

      <Modal
        open={!!buying}
        onClose={() => setBuying(null)}
        title="Обменять монеты?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBuying(null)}>Отмена</Button>
            <Button onClick={order} loading={saving} icon={Gift}>Обменять</Button>
          </>
        }
      >
        {buying && (
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0" style={{ background: PRIZE_TINTS[buying.code] || '#eef2ff' }}>
                <img src={buying.image} alt="" className="w-16 h-16" />
              </div>
              <div>
                <div className="font-bold text-[17px] text-[var(--color-text-primary)]">{buying.title}</div>
                <div className="text-[13px] text-[var(--color-text-secondary)]">
                  {buying.price} монет · останется <b>{available - buying.price}</b>
                </div>
              </div>
            </div>
            {buying.needs_note && (
              <Input
                label="Какую книгу ты хочешь?"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Название и автор"
                maxLength={300}
              />
            )}
            <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">
              Монеты спишутся сразу. Пока библиотекарь не выдал приз, заказ можно отменить — монеты вернутся.
            </p>
          </div>
        )}
      </Modal>
    </main>
  )
}
