'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Swords, Crown, Check, X, Search, BookOpen, Clock, Info, ChevronDown, Hourglass } from 'lucide-react'
import { Button, Modal } from '../ui'

const authed = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  }).then(async r => {
    const d = await r.json().catch(() => ({}))
    if (!r.ok) throw new Error(d.error || 'Ошибка')
    return d
  })

const STAGES = {
  none: { label: 'Ещё не взял книгу', color: '#8e8e93' },
  reading: { label: 'Читает', color: '#5b8def' },
  returned: { label: 'Вернул, пишет отзыв', color: '#ff9f0a' },
  review: { label: 'Отзыв на проверке', color: '#bf8cff' },
  done: { label: 'Дочитал', color: '#32d74b' }
}
const daysLeft = d => Math.max(0, Math.ceil((new Date(d) - Date.now()) / 86400000))
const initials = n => String(n || '?').split(' ').map(x => x[0]).slice(0, 2).join('').toUpperCase()

/** «Вызов другу» в профиле ученика. */
export default function Challenges() {
  const [data, setData] = useState(null)
  const [creating, setCreating] = useState(false)
  const [rules, setRules] = useState(false)

  const load = useCallback(() => {
    authed('/api/challenges').then(setData).catch(() => setData({ challenges: [], wins: 0 }))
  }, [])
  useEffect(() => { load() }, [load])

  const act = async (id, action) => {
    try {
      await authed(`/api/challenges/${id}`, { method: 'PATCH', body: { action } })
      toast.success(action === 'accept' ? 'Вызов принят — старт!' : action === 'decline' ? 'Вызов отклонён' : 'Вызов отменён')
      load()
    } catch (e) { toast.error(e.message) }
  }

  const list = data?.challenges || []
  const open = list.filter(c => c.status === 'pending' || c.status === 'active')
  const past = list.filter(c => c.status !== 'pending' && c.status !== 'active')

  return (
    <motion.section
      id="challenges"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="apple-card p-5 sm:p-7 mb-6 scroll-mt-24"
    >
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: '#1f2a5c', color: '#ffc93c' }}>
          <Swords size={19} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-[20px] font-semibold tracking-tight leading-tight">Вызов другу</h2>
          <div className="text-[13px] text-[var(--color-text-tertiary)]">Кто быстрее прочитает книгу · побед: <b className="text-[var(--color-text-primary)]">{data?.wins ?? 0}</b></div>
        </div>
        <Button icon={Swords} onClick={() => setCreating(true)}>Бросить вызов</Button>
      </div>

      <button onClick={() => setRules(!rules)} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--color-brand)] mb-3">
        <Info size={14} /> Как это честно, если книги разные? <ChevronDown size={14} className={`transition-transform ${rules ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {rules && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-4 space-y-1.5 text-[13px] text-[var(--color-text-secondary)] leading-relaxed">
            <li>• Старт у обоих одновременно — в момент, когда соперник принял вызов. На всё 30 дней.</li>
            <li>• Читаете книгу вызова или любую книгу похожего объёма: от 75% до 125% её страниц. Страницы считаются с коэффициентом, как для монет.</li>
            <li>• Засчитывается только книга, которую выдали после старта — никто не начнёт читать раньше другого.</li>
            <li>• Финиш — отправленный отзыв, который потом одобрили.</li>
            <li>• Побеждает тот, у кого выше скорость: страниц в день. Если книга одна и та же — это просто «кто первым дочитал».</li>
          </motion.ul>
        )}
      </AnimatePresence>

      {!data ? (
        <div className="h-28 rounded-2xl bg-[var(--color-bg-soft)] animate-pulse" />
      ) : open.length === 0 && past.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] py-8 px-4 text-center text-[14px] text-[var(--color-text-tertiary)]">
          Позови одноклассника наперегонки — так читать веселее.
        </div>
      ) : (
        <div className="space-y-3">
          {open.map(c => <ChallengeCard key={c.id} c={c} onAct={act} />)}
          {past.length > 0 && (
            <div className="pt-2">
              <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-tertiary)] mb-2">Прошлые вызовы</div>
              <ul className="rounded-2xl border border-[var(--color-border)] divide-y divide-[var(--color-border)]">
                {past.map(c => <PastRow key={c.id} c={c} />)}
              </ul>
            </div>
          )}
        </div>
      )}

      <CreateChallenge open={creating} onClose={() => setCreating(false)} onDone={() => { setCreating(false); load() }} />
    </motion.section>
  )
}

function ChallengeCard({ c, onAct }) {
  const me = c[c.mine]
  const other = c[c.mine === 'challenger' ? 'opponent' : 'challenger']

  if (c.status === 'pending') {
    const incoming = c.mine === 'opponent'
    return (
      <div className={`rounded-2xl p-4 border ${incoming ? 'border-[#ffc93c]/60 bg-[#ffc93c]/[0.08]' : 'border-[var(--color-border)]'}`}>
        <div className="flex items-center gap-3">
          <BookCover book={c.book} />
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold">
              {incoming ? <>{other.name} бросает тебе вызов</> : <>Ждём ответа от {other.name}</>}
            </div>
            <div className="text-[13px] text-[var(--color-text-secondary)] truncate">«{c.book.title}» · {c.target_pages} стр.</div>
            {c.message && <div className="text-[13px] mt-1 italic text-[var(--color-text-secondary)]">«{c.message}»</div>}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 justify-end">
          {incoming ? (
            <>
              <Button variant="ghost" icon={X} onClick={() => onAct(c.id, 'decline')}>Отклонить</Button>
              <Button icon={Check} onClick={() => onAct(c.id, 'accept')}>Принять вызов</Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => onAct(c.id, 'cancel')}>Отменить</Button>
          )}
        </div>
      </div>
    )
  }

  // Идёт вызов
  const total = 30
  const left = daysLeft(c.deadline_at)
  return (
    <div className="relative overflow-hidden rounded-[24px] text-white p-4 sm:p-5"
      style={{ background: 'radial-gradient(120% 120% at 50% 0%, #2a3a7c 0%, #1f2a5c 45%, #0e1433 100%)' }}>
      <div aria-hidden className="absolute -top-16 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full blur-3xl opacity-30" style={{ background: '#ffc93c' }} />
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-start gap-2 sm:gap-4">
        <Side s={me} label="Ты" />
        <div className="pt-3 flex flex-col items-center">
          <span className="text-[22px] sm:text-[28px] font-black italic tracking-tight" style={{ color: '#ffc93c' }}>VS</span>
        </div>
        <Side s={other} label={other.name} right />
      </div>
      <div className="relative mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-white/65">
        <span className="inline-flex items-center gap-1.5"><BookOpen size={13} /> «{c.book.title}» или книга {c.pages_range[0]}–{c.pages_range[1]} стр.</span>
        <span className="inline-flex items-center gap-1.5"><Clock size={13} /> осталось {left} дн.</span>
      </div>
      <div className="relative mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${((total - left) / total) * 100}%`, background: '#ffc93c' }} />
      </div>
    </div>
  )
}

function Side({ s, label, right }) {
  const stage = STAGES[s.linked ? s.stage : 'none']
  return (
    <div className={`min-w-0 flex flex-col ${right ? 'items-end text-right' : 'items-start'}`}>
      <div className={`flex items-center gap-2 ${right ? 'flex-row-reverse' : ''}`}>
        <span className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
          style={{ background: s.stage === 'done' ? '#ffc93c' : 'rgba(255,255,255,0.12)', color: s.stage === 'done' ? '#1f2a5c' : '#fff' }}>
          {s.stage === 'done' ? <Check size={18} strokeWidth={3} /> : initials(s.name)}
        </span>
        <span className="text-[14px] font-semibold truncate max-w-[110px] sm:max-w-[180px]">{label}</span>
      </div>
      <span className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold"
        style={{ background: `${stage.color}22`, color: stage.color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }} />{stage.label}
      </span>
      {s.linked && (
        <span className="mt-1.5 text-[12px] text-white/60 truncate max-w-full">{s.title} · {s.pages} стр.</span>
      )}
    </div>
  )
}

function PastRow({ c }) {
  const other = c[c.mine === 'challenger' ? 'opponent' : 'challenger']
  const meId = c[c.mine].id
  const won = c.winner_id === meId
  const text = c.status === 'finished' ? (won ? `Ты выиграл у ${other.name}` : `${other.name} выиграл`)
    : c.status === 'declined' ? `${c.mine === 'challenger' ? other.name + ' отклонил' : 'Ты отклонил'} вызов`
    : c.status === 'cancelled' ? 'Вызов отменён'
    : c.accepted_at ? 'Никто не дочитал за 30 дней' : 'Приглашение истекло'
  const mySpeed = c.result?.[c.mine]?.speed
  const otherSpeed = c.result?.[c.mine === 'challenger' ? 'opponent' : 'challenger']?.speed
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <span className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${won ? 'bg-[#ffc93c] text-[#1f2a5c]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)]'}`}>
        {won ? <Crown size={15} /> : c.status === 'finished' ? <Swords size={14} /> : <Hourglass size={14} />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-medium truncate">{text}</div>
        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
          «{c.book.title}»{(mySpeed || otherSpeed) ? ` · ты ${mySpeed ?? '—'} / соперник ${otherSpeed ?? '—'} стр. в день` : ''}
        </div>
      </div>
    </li>
  )
}

function BookCover({ book, size = 56 }) {
  return book.cover_url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={book.cover_url} alt="" className="rounded-lg object-cover shrink-0 bg-[var(--color-bg-soft)]" style={{ width: size * 0.7, height: size }} />
    : <span className="rounded-lg shrink-0 flex items-center justify-center font-bold text-[#1f2a5c]" style={{ width: size * 0.7, height: size, background: '#ffc93c' }}>{String(book.title || '?').charAt(0)}</span>
}

/* ------------------------------------------------------------------ */
function CreateChallenge({ open, onClose, onDone }) {
  const [step, setStep] = useState(0)
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [books, setBooks] = useState([])
  const [opponent, setOpponent] = useState(null)
  const [book, setBook] = useState(null)
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) { setStep(0); setQ(''); setOpponent(null); setBook(null); setMessage('') }
  }, [open])

  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => {
      const url = step === 0 ? `/api/challenges?people=1&q=${encodeURIComponent(q)}` : `/api/challenges?books=1&q=${encodeURIComponent(q)}`
      authed(url).then(d => (step === 0 ? setPeople(d) : setBooks(d))).catch(() => {})
    }, 250)
    return () => clearTimeout(id)
  }, [q, step, open])

  const send = async () => {
    setSaving(true)
    try {
      await authed('/api/challenges', { method: 'POST', body: { opponentId: opponent.id, bookId: book.id, message } })
      toast.success(`Вызов отправлен: ${opponent.name}`)
      onDone()
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const goStep = s => { setStep(s); setQ('') }

  return (
    <Modal open={open} onClose={onClose} title={['Кого вызываем?', 'Какую книгу читаем?', 'Всё готово'][step]} size="lg">
      <div className="flex gap-1.5 mb-4">
        {[0, 1, 2].map(i => <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-bg-soft)]'}`} />)}
      </div>

      {step < 2 && (
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder={step === 0 ? 'Имя или класс' : 'Название или автор'}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] outline-none text-[14px] border border-transparent focus:border-[var(--color-brand)]/40" />
        </div>
      )}

      {step === 0 && (
        <ul className="max-h-[360px] overflow-y-auto -mx-1">
          {people.map(p => (
            <li key={p.id}>
              <button onClick={() => { setOpponent(p); goStep(1) }}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--color-bg-soft)] text-left">
                <span className="w-9 h-9 rounded-full bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center text-[13px] font-bold">{initials(p.name)}</span>
                <span className="flex-1 min-w-0 text-[14px] font-medium truncate">{p.name}</span>
                {p.class_name && <span className={`text-[12px] ${p.same_class ? 'text-[var(--color-brand)] font-semibold' : 'text-[var(--color-text-tertiary)]'}`}>{p.class_name}{p.same_class ? ' · твой класс' : ''}</span>}
              </button>
            </li>
          ))}
          {people.length === 0 && <li className="py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">Никого не нашли</li>}
        </ul>
      )}

      {step === 1 && (
        <>
          <p className="text-[12px] text-[var(--color-text-tertiary)] mb-2">Книга задаёт объём. Соперник может читать её же или книгу похожего объёма (±25%).</p>
          <ul className="max-h-[360px] overflow-y-auto -mx-1">
            {books.map(b => (
              <li key={b.id}>
                <button onClick={() => { setBook(b); goStep(2) }}
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--color-bg-soft)] text-left">
                  <BookCover book={b} size={48} />
                  <span className="flex-1 min-w-0">
                    <span className="block text-[14px] font-semibold truncate">{b.title}</span>
                    <span className="block text-[12px] text-[var(--color-text-tertiary)] truncate">{b.author}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[13px] font-semibold tabular-nums">{b.counted_pages} стр.</span>
                    <span className={`block text-[11px] ${b.available_copies > 0 ? 'text-[var(--color-success)]' : 'text-[var(--color-text-tertiary)]'}`}>
                      {b.available_copies > 0 ? `в наличии: ${b.available_copies}` : 'сейчас выдана'}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {books.length === 0 && <li className="py-8 text-center text-[13px] text-[var(--color-text-tertiary)]">Книг не нашли</li>}
          </ul>
          <button onClick={() => goStep(0)} className="mt-3 text-[13px] text-[var(--color-brand)] font-medium">← Другой соперник</button>
        </>
      )}

      {step === 2 && opponent && book && (
        <div className="space-y-4">
          <div className="rounded-2xl p-4 text-white flex items-center gap-4" style={{ background: 'linear-gradient(135deg,#1f2a5c,#1a56db)' }}>
            <BookCover book={book} size={64} />
            <div className="min-w-0">
              <div className="text-[13px] text-white/70">Ты vs {opponent.name}</div>
              <div className="text-[17px] font-semibold truncate">{book.title}</div>
              <div className="text-[13px] text-white/70">{book.counted_pages} стр. · подойдёт {Math.floor(book.counted_pages * 0.75)}–{Math.ceil(book.counted_pages * 1.25)} стр.</div>
            </div>
          </div>
          <label className="block">
            <span className="text-[12px] font-medium text-[var(--color-text-secondary)]">Сообщение сопернику — по желанию</span>
            <input value={message} onChange={e => setMessage(e.target.value)} maxLength={200} placeholder="Спорим, я быстрее?"
              className="mt-1 w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-soft)] outline-none text-[14px] border border-transparent focus:border-[var(--color-brand)]/40" />
          </label>
          <p className="text-[12px] text-[var(--color-text-tertiary)]">Старт — когда {opponent.name} примет вызов. Книгу берите в библиотеке после старта — взятая раньше не засчитается.</p>
          <div className="flex justify-between gap-2">
            <Button variant="ghost" onClick={() => goStep(1)}>← Другая книга</Button>
            <Button icon={Swords} loading={saving} onClick={send}>Бросить вызов</Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
