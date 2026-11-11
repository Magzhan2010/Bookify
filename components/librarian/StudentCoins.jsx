'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Coins, Undo2, MinusCircle, Loader2 } from 'lucide-react'
import { Button, Modal } from '../ui'
import { useTeamMe } from '../../lib/useTeamMe'
import { parseJwt } from '../../lib/jwt'

/**
 * Монеты ученика: история начислений и исправление ошибок.
 * Отменять и списывать могут библиотекарь и тимлид; остальные участники команды только смотрят.
 */
export default function StudentCoins({ studentId }) {
  const me = useTeamMe()
  const [data, setData] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [busy, setBusy] = useState(null)
  const [deduct, setDeduct] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const auth = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` })
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/librarian/students/${studentId}/points`, { headers: auth() })
      if (res.ok) setData(await res.json())
    } catch {}
  }, [studentId])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    const role = parseJwt(localStorage.getItem('token') || '')?.role
    setCanEdit(role === 'librarian' || !!me?.is_lead)
  }, [me])

  const post = async body => {
    const res = await fetch(`/api/librarian/students/${studentId}/points`, {
      method: 'POST', headers: { ...auth(), 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })
    const d = await res.json()
    if (!res.ok) throw new Error(d.error || 'Ошибка')
    return d
  }

  const revert = async p => {
    const why = window.prompt(`Отменить «${p.description || p.reason}» (+${p.points})? Причина для ученика (можно пусто):`, 'Начислено по ошибке')
    if (why === null) return
    setBusy(p.id)
    try { await post({ action: 'revert', pointId: p.id, note: why }); toast.success(`−${p.points} монет`); load() }
    catch (e) { toast.error(e.message) } finally { setBusy(null) }
  }

  const doDeduct = async e => {
    e.preventDefault()
    setBusy('deduct')
    try {
      await post({ action: 'deduct', amount: parseInt(amount), note })
      toast.success(`Списано ${amount} монет`)
      setDeduct(false); setAmount(''); setNote(''); load()
    } catch (err) { toast.error(err.message) } finally { setBusy(null) }
  }

  if (!data) return null
  const { balance, items } = data
  const input = 'w-full h-11 px-3.5 rounded-xl bg-[var(--color-bg-soft)] text-[14px] text-[var(--color-text-primary)] outline-none focus:ring-2 focus:ring-[var(--color-brand)]/20'

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Coins size={15} className="text-[#c97a00]" /> Монеты
        </h3>
        {canEdit && (
          <button onClick={() => setDeduct(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[12px] font-semibold hover:bg-[var(--color-danger)]/15">
            <MinusCircle size={13} /> Списать
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 mb-4 text-center">
        {[['Заработано', balance.earned], ['Потрачено', balance.spent], ['Доступно', balance.available]].map(([l, v]) => (
          <div key={l} className="p-2.5 rounded-xl bg-[var(--color-bg-soft)]">
            <div className="text-[18px] font-bold tabular-nums text-[var(--color-text-primary)]">{v}</div>
            <div className="text-[11px] text-[var(--color-text-tertiary)]">{l}</div>
          </div>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="text-[13px] text-[var(--color-text-tertiary)] text-center py-4">Начислений пока нет</p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {items.map(p => {
            const negative = p.points < 0
            return (
              <div key={p.id} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[12px] ${p.reverted ? 'opacity-50' : ''} hover:bg-[var(--color-bg-soft)]`}>
                <span className={`w-12 shrink-0 font-bold tabular-nums ${negative ? 'text-[var(--color-danger)]' : 'text-[var(--color-success)]'}`}>
                  {negative ? p.points : `+${p.points}`}
                </span>
                <div className="flex-1 min-w-0">
                  <div className={`truncate text-[var(--color-text-primary)] ${p.reverted ? 'line-through' : ''}`}>{p.description || p.reason}</div>
                  <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                    {new Date(p.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    {p.created_by_name ? ` · ${p.created_by_name}` : ''}{p.reverted ? ' · отменено' : ''}
                  </div>
                </div>
                {canEdit && !p.reverted && !p.revert_of && p.points > 0 && (
                  <button onClick={() => revert(p)} disabled={busy === p.id} title="Отменить это начисление"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-[var(--color-text-tertiary)] hover:text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 disabled:opacity-50">
                    {busy === p.id ? <Loader2 size={12} className="animate-spin" /> : <Undo2 size={12} />} Отменить
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Modal open={deduct} onClose={() => setDeduct(false)} size="sm" title="Списать монеты"
        description="Монеты уйдут из баланса и из рейтинга. Ученик получит уведомление с причиной.">
        <form onSubmit={doDeduct} className="space-y-3">
          <input inputMode="numeric" required placeholder="Сколько монет" value={amount}
            onChange={e => setAmount(e.target.value.replace(/\D/g, '').slice(0, 4))} className={input} />
          <input required placeholder="Причина (видит ученик)" value={note} maxLength={200}
            onChange={e => setNote(e.target.value)} className={input} />
          {parseInt(amount) > balance.available && (
            <p className="text-[12px] text-[#c97a00]">У ученика доступно только {balance.available} — часть монет уже потрачена на призы. Доступно станет 0.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDeduct(false)}>Отмена</Button>
            <Button type="submit" variant="danger" loading={busy === 'deduct'}>Списать</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
