'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { ShoppingBag, Lock, Check, Clock, X, Gift, Info } from 'lucide-react'
import { Button, Modal, Input } from '../../../components/ui'
import { useGame } from '../../../components/game/GameContext'
import CoinCard from '../../../components/game/CoinCard'
import Confetti from '../../../components/game/Confetti'
import { motion } from 'framer-motion'

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
  const [boom, setBoom] = useState(0)

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
      setBoom(b => b + 1)
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
      <Confetti fire={boom} />
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
            <div key={i} className="h-[340px] rounded-[1.25rem] bg-[var(--color-bg-soft)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {(data?.prizes || []).map((p, i) => {
            const enough = available >= p.price
            const pct = Math.min(100, Math.round((available / p.price) * 100))
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`toon-card toon-card-hover hover-wiggle p-4 sm:p-5 flex flex-col ${enough ? '' : 'opacity-95'}`}
              >
                <div className="relative w-full aspect-square flex items-center justify-center mb-3">
                  <img
                    src={p.image}
                    alt={p.title}
                    className={`wiggle-target w-[85%] h-[85%] ${enough ? '' : 'grayscale-[40%] opacity-80'}`}
                  />
                  {enough ? (
                    <span className="absolute top-0 right-0 px-2 py-0.5 rounded-lg bg-[#20b486] text-white text-[11px] font-bold border-2 border-[var(--toon-ink)]">
                      Можно взять!
                    </span>
                  ) : (
                    <span className="absolute top-0 right-0 w-8 h-8 rounded-full bg-[var(--color-bg-card)] border-2 border-[var(--toon-ink)] flex items-center justify-center">
                      <Lock size={14} className="text-[var(--color-text-primary)]" />
                    </span>
                  )}
                </div>
                <div className="font-bold text-[15px] sm:text-[18px] text-[var(--color-text-primary)] leading-tight text-center">{p.title}</div>
                <div className="text-[12px] text-[var(--color-text-tertiary)] mt-1 line-clamp-2 min-h-[2.5em] text-center">{p.description}</div>

                <div className="mt-3 flex items-center justify-center">
                  <span className="toon-btn px-4 py-1.5 rounded-xl bg-[#ffc93c] text-[#1e293b] text-[15px] font-extrabold">
                    {p.price} баллов
                  </span>
                </div>
                {!enough && (
                  <>
                    <div className="mt-3 h-2 rounded-full bg-[var(--color-bg-soft)] overflow-hidden border border-[var(--color-border)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: 0.2 + i * 0.05 }}
                        className="h-full rounded-full bg-[var(--color-brand)]"
                      />
                    </div>
                    <div className="text-[11px] text-center text-[var(--color-text-tertiary)] mt-1">ещё {p.price - available} монет</div>
                  </>
                )}
                {isStudent && (
                  <button
                    disabled={!enough}
                    onClick={() => { setBuying(p); setNote('') }}
                    className={`toon-btn mt-3 w-full py-2.5 rounded-xl text-[14px] font-bold flex items-center justify-center gap-1.5 ${
                      enough
                        ? 'bg-[var(--color-brand)] text-white hover:brightness-110'
                        : 'bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)] cursor-not-allowed'
                    }`}
                  >
                    {enough ? <><Gift size={15} /> Обменять</> : <><Lock size={14} /> Не хватает</>}
                  </button>
                )}
              </motion.div>
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
              <div className="toon-card !shadow-none w-20 h-20 !rounded-2xl flex items-center justify-center shrink-0">
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
