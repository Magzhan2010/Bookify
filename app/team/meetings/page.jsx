'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Megaphone, MapPin, Users2, Check, X, HelpCircle, ChevronDown, Ban, Send } from 'lucide-react'
import { Button, Modal, Skeleton, EmptyState } from '../../../components/ui'
import { useTeam } from '../../../components/team/TeamContext'
import { PageHeader, Surface, Avatar, Chip, Segmented, Field, inputCls, api } from '../../../components/team/ui'

const TZ = 'Asia/Almaty'
const hhmm = d => new Date(d).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
const dayNum = d => new Date(d).toLocaleDateString('ru-RU', { day: 'numeric', timeZone: TZ })
const monShort = d => new Date(d).toLocaleDateString('ru-RU', { month: 'short', timeZone: TZ }).replace('.', '')
const weekday = d => new Date(d).toLocaleDateString('ru-RU', { weekday: 'long', timeZone: TZ })

function relative(d) {
  const ms = new Date(d) - Date.now()
  if (ms <= 0 && ms > -60 * 60000) return 'идёт сейчас'
  if (ms <= 0) return 'прошло'
  const min = Math.round(ms / 60000)
  if (min < 60) return `через ${Math.max(1, min)} мин`
  const h = Math.round(min / 60)
  if (h < 24) return `через ${h} ч`
  return `через ${Math.round(h / 24)} дн`
}

const pad = n => String(n).padStart(2, '0')
const toLocalInput = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const roundUp = (d, step = 5) => { const x = new Date(d); x.setSeconds(0, 0); x.setMinutes(Math.ceil(x.getMinutes() / step) * step); return x }

const QUICK_TIMES = [
  { label: 'Через 10 мин', get: () => roundUp(Date.now() + 10 * 60000) },
  { label: 'Через 30 мин', get: () => roundUp(Date.now() + 30 * 60000) },
  { label: 'Через час', get: () => roundUp(Date.now() + 60 * 60000) },
  { label: 'Завтра в 15:00', get: () => { const d = new Date(Date.now() + 86400000); d.setHours(15, 0, 0, 0); return d } }
]
const PLACES = ['Библиотека', 'Актовый зал', 'Онлайн']

export default function MeetingsPage() {
  const { me } = useTeam()
  const canCall = !!me?.can_assign
  const [data, setData] = useState(null)
  const [calling, setCalling] = useState(false)
  const [tab, setTab] = useState('upcoming')

  const load = useCallback(async () => {
    try {
      setData(await api('/api/meetings' + (canCall ? '?manage=1' : '')))
    } catch (e) {
      toast.error(e.message); setData({ mine: [], all: [] })
    }
  }, [canCall])
  useEffect(() => { load() }, [load])

  const isUpcoming = m => !m.cancelled_at && new Date(m.starts_at) > Date.now() - 60 * 60000
  const all = data?.all || []
  const upcoming = useMemo(() => all.filter(isUpcoming).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at)), [all])
  const past = useMemo(() => all.filter(m => !isUpcoming(m)), [all])
  const mine = (data?.mine || []).filter(m => !m.cancelled_at)

  const respond = async (id, response) => {
    setData(d => ({ ...d, mine: d.mine.map(x => x.id === id ? { ...x, response } : x) }))
    try { await api(`/api/meetings/${id}`, { method: 'PATCH', body: { response } }) } catch (e) { toast.error(e.message); load() }
  }

  const cancel = async m => {
    try {
      await api(`/api/meetings/${m.id}`, { method: 'PATCH', body: { cancel: true } })
      toast.success('Собрание отменено — всем пришло уведомление')
      load()
    } catch (e) { toast.error(e.message) }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Работа"
        title="Собрания"
        subtitle={canCall
          ? 'Назначь время и место — всем, кого позовёшь, сразу придёт уведомление, а за 30 минут до начала — напоминание. Здесь видно, кто придёт.'
          : 'Сюда приходят собрания, на которые тебя позвали. Ответь, придёшь ли — тимлид увидит.'}
        actions={canCall && <Button icon={Megaphone} onClick={() => setCalling(true)}>Созвать собрание</Button>}
      />

      {!data ? (
        <div className="space-y-3">{[0, 1, 2].map(i => <Skeleton key={i} className="h-28 rounded-[22px]" />)}</div>
      ) : canCall ? (
        <>
          <div className="mb-5">
            <Segmented value={tab} onChange={setTab} options={[
              { value: 'upcoming', label: 'Скоро', count: upcoming.length },
              { value: 'past', label: 'Прошедшие', count: past.length }
            ]} />
          </div>
          {(tab === 'upcoming' ? upcoming : past).length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title={tab === 'upcoming' ? 'Собраний пока нет' : 'Пока пусто'}
              description={tab === 'upcoming' ? 'Созови первое: выбери время, место и кого позвать.' : 'Здесь будут собрания за последние 30 дней.'}
              actionLabel={tab === 'upcoming' ? 'Созвать собрание' : undefined}
              onAction={tab === 'upcoming' ? () => setCalling(true) : undefined}
            />
          ) : (
            <div className="space-y-3">
              {(tab === 'upcoming' ? upcoming : past).map((m, i) => (
                <ManageCard key={m.id} m={m} i={i} me={me} onCancel={() => cancel(m)} />
              ))}
            </div>
          )}
        </>
      ) : mine.length === 0 ? (
        <EmptyState icon={Megaphone} title="Собраний нет" description="Когда тебя позовут, здесь появится время и место." />
      ) : (
        <div className="space-y-3">
          {mine.map((m, i) => <InviteCard key={m.id} m={m} i={i} onRespond={r => respond(m.id, r)} />)}
        </div>
      )}

      <CallModal open={calling} onClose={() => setCalling(false)} onDone={() => { setCalling(false); setTab('upcoming'); load() }} />
    </div>
  )
}

/** Плитка с датой слева — как в календаре. */
function DateTile({ d, dim }) {
  return (
    <div className={`w-[68px] shrink-0 rounded-2xl text-center py-2.5 ${dim ? 'bg-[var(--color-bg-soft)] text-[var(--color-text-tertiary)]' : 'bg-gradient-to-br from-[#1a56db] to-[#1f2a5c] text-white'}`}>
      <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">{monShort(d)}</div>
      <div className="text-[24px] font-semibold leading-none my-0.5 tabular-nums">{dayNum(d)}</div>
      <div className="text-[12px] font-semibold tabular-nums">{hhmm(d)}</div>
    </div>
  )
}

function ManageCard({ m, i, me, onCancel }) {
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const yes = m.invites.filter(x => x.response === 'yes')
  const no = m.invites.filter(x => x.response === 'no')
  const wait = m.invites.filter(x => !x.response)
  const total = m.invites.length || 1
  const dim = !!m.cancelled_at || new Date(m.starts_at) < Date.now() - 60 * 60000
  const canCancel = !m.cancelled_at && !dim && (m.created_by === me?.id || me?.is_lead)

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
      <Surface className="p-4 sm:p-5">
        <div className="flex gap-4">
          <DateTile d={m.starts_at} dim={dim} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-[var(--color-text-tertiary)] capitalize">
                  {weekday(m.starts_at)} · {m.cancelled_at ? <span className="text-[var(--color-danger)] normal-case">отменено</span> : relative(m.starts_at)}
                </div>
                <h3 className={`text-[17px] font-semibold tracking-tight ${m.cancelled_at ? 'line-through text-[var(--color-text-tertiary)]' : 'text-[var(--color-text-primary)]'}`}>{m.title}</h3>
                <div className="text-[13px] text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                  <span className="flex items-center gap-1"><MapPin size={13} /> {m.place}</span>
                  <span className="flex items-center gap-1"><Users2 size={13} /> {m.audience_label}</span>
                  {m.created_by_name && <span className="text-[var(--color-text-tertiary)]">созвал(а) {m.created_by_name}</span>}
                </div>
                {m.note && <p className="text-[13px] text-[var(--color-text-secondary)] mt-1.5">{m.note}</p>}
              </div>
              {canCancel && (
                confirm ? (
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="danger" onClick={onCancel}>Да, отменить</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>Нет</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="ghost" icon={Ban} onClick={() => setConfirm(true)}>Отменить</Button>
                )
              )}
            </div>

            {/* Кто придёт */}
            <button onClick={() => setOpen(o => !o)} className="mt-3 w-full text-left group">
              <div className="flex h-2 rounded-full overflow-hidden bg-[var(--color-bg-soft)]">
                <motion.div className="bg-[var(--color-success)]" initial={{ width: 0 }} animate={{ width: `${yes.length / total * 100}%` }} transition={{ duration: 0.6 }} />
                <motion.div className="bg-[var(--color-danger)]/70" initial={{ width: 0 }} animate={{ width: `${no.length / total * 100}%` }} transition={{ duration: 0.6, delay: 0.1 }} />
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-[12px] font-medium">
                <span className="flex items-center gap-1 text-[var(--color-success)]"><Check size={13} /> придут {yes.length}</span>
                <span className="flex items-center gap-1 text-[var(--color-danger)]"><X size={13} /> не смогут {no.length}</span>
                <span className="flex items-center gap-1 text-[var(--color-text-tertiary)]"><HelpCircle size={13} /> не ответили {wait.length}</span>
                <span className="ml-auto flex items-center gap-1 text-[var(--color-text-tertiary)] group-hover:text-[var(--color-text-primary)]">
                  {open ? 'Скрыть' : 'Кто именно'} <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
                </span>
              </div>
            </button>

            <AnimatePresence initial={false}>
              {open && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="grid sm:grid-cols-3 gap-3 pt-3">
                    <PeopleCol title="Придут" people={yes} tone="var(--color-success)" />
                    <PeopleCol title="Не смогут" people={no} tone="var(--color-danger)" />
                    <PeopleCol title="Не ответили" people={wait} tone="var(--color-text-tertiary)" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </Surface>
    </motion.div>
  )
}

function PeopleCol({ title, people, tone }) {
  return (
    <div className="rounded-2xl bg-[var(--color-bg-soft)] p-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-2" style={{ color: tone }}>{title} · {people.length}</div>
      {people.length === 0 ? <div className="text-[12px] text-[var(--color-text-tertiary)]">—</div> : (
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {people.map(p => (
            <div key={p.id} className="flex items-center gap-2 min-w-0">
              <Avatar name={p.name} src={p.avatar_url} size={22} />
              <span className="text-[13px] text-[var(--color-text-primary)] truncate">{p.name}</span>
              {p.class_name && <span className="text-[11px] text-[var(--color-text-tertiary)] shrink-0">{p.class_name}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function InviteCard({ m, i, onRespond }) {
  const past = new Date(m.starts_at) < Date.now() - 60 * 60000
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 8) * 0.04 }}>
      <Surface className="p-4 sm:p-5">
        <div className="flex gap-4">
          <DateTile d={m.starts_at} dim={past} />
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-[var(--color-text-tertiary)] capitalize">{weekday(m.starts_at)} · {relative(m.starts_at)}</div>
            <h3 className="text-[17px] font-semibold tracking-tight text-[var(--color-text-primary)]">{m.title}</h3>
            <div className="text-[13px] text-[var(--color-text-secondary)] flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
              <span className="flex items-center gap-1"><MapPin size={13} /> {m.place}</span>
              {m.created_by_name && <span className="text-[var(--color-text-tertiary)]">зовёт {m.created_by_name}</span>}
            </div>
            {m.note && <p className="text-[13px] text-[var(--color-text-secondary)] mt-1.5">{m.note}</p>}
            {!past && (
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant={m.response === 'yes' ? 'success' : 'secondary'} icon={Check} onClick={() => onRespond('yes')}>Приду</Button>
                <Button size="sm" variant={m.response === 'no' ? 'danger' : 'secondary'} icon={X} onClick={() => onRespond('no')}>Не смогу</Button>
              </div>
            )}
          </div>
        </div>
      </Surface>
    </motion.div>
  )
}

function CallModal({ open, onClose, onDone }) {
  const [opts, setOpts] = useState(null)
  const [title, setTitle] = useState('Собрание команды')
  const [place, setPlace] = useState('Библиотека')
  const [when, setWhen] = useState('')
  const [note, setNote] = useState('')
  const [type, setType] = useState('team')
  const [teamId, setTeamId] = useState(null)
  const [cls, setCls] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setWhen(toLocalInput(roundUp(Date.now() + 30 * 60000)))
    if (!opts) api('/api/meetings?options=1').then(setOpts).catch(e => toast.error(e.message))
  }, [open, opts])

  const estimate = useMemo(() => {
    if (!opts) return null
    const c = opts.counts
    if (type === 'team') return Math.max(0, c.team - 1)
    if (type === 'subteam') return opts.teams.find(t => t.id === teamId)?.n ?? null
    if (type === 'students') return cls ? opts.classes.find(x => x.class_name === cls)?.n ?? 0 : c.students
    if (type === 'teachers') return c.teachers
    return c.students + c.teachers + c.team
  }, [opts, type, teamId, cls])

  const submit = async () => {
    if (type === 'subteam' && !teamId) return toast.error('Выбери группу')
    const d = new Date(when)
    if (isNaN(d)) return toast.error('Укажи время')
    setBusy(true)
    try {
      const r = await api('/api/meetings', {
        method: 'POST',
        body: { title, place, note, starts_at: d.toISOString(), audience: { type, team_id: teamId, class_name: cls } }
      })
      toast.success(`Собрание созвано — уведомление ушло ${r.invited} чел.`)
      setNote('')
      onDone()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} size="lg" title="Созвать собрание" description="Всем, кого выберешь, сразу придёт уведомление на сайте."
      footer={<>
        <Button variant="ghost" onClick={onClose}>Отмена</Button>
        <Button icon={Send} loading={busy} onClick={submit}>
          {estimate != null ? `Отправить ${type === 'all' ? '≈' : ''}${estimate} чел.` : 'Отправить'}
        </Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="О чём собрание">
          <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Собрание команды" />
        </Field>

        <Field label="Когда">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {QUICK_TIMES.map(q => (
              <Chip key={q.label} onClick={() => setWhen(toLocalInput(q.get()))}>{q.label}</Chip>
            ))}
          </div>
          <input type="datetime-local" className={inputCls} value={when} onChange={e => setWhen(e.target.value)} />
        </Field>

        <Field label="Где">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {PLACES.map(p => <Chip key={p} active={place === p} onClick={() => setPlace(p)}>{p}</Chip>)}
          </div>
          <input className={inputCls} value={place} onChange={e => setPlace(e.target.value)} maxLength={80} placeholder="Библиотека" />
        </Field>

        <Field label="Кого позвать">
          <Segmented value={type} onChange={setType} options={[
            { value: 'team', label: 'Вся команда' },
            { value: 'subteam', label: 'Группа' },
            { value: 'students', label: 'Ученики' },
            { value: 'teachers', label: 'Учителя' },
            { value: 'all', label: 'Все' }
          ]} />
          {type === 'subteam' && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {!opts ? <Skeleton className="h-7 w-40 rounded-full" /> : opts.teams.length === 0
                ? <span className="text-[12px] text-[var(--color-text-tertiary)]">Групп пока нет — создай их в «Команды и люди».</span>
                : opts.teams.map(t => <Chip key={t.id} color={t.color} active={teamId === t.id} onClick={() => setTeamId(t.id)}>{t.name} · {t.n}</Chip>)}
            </div>
          )}
          {type === 'students' && opts && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Chip active={!cls} onClick={() => setCls('')}>Все классы · {opts.counts.students}</Chip>
              {opts.classes.map(c => <Chip key={c.class_name} active={cls === c.class_name} onClick={() => setCls(c.class_name)}>{c.class_name} · {c.n}</Chip>)}
            </div>
          )}
        </Field>

        <Field label="Комментарий" hint="Необязательно: что взять с собой, что обсудим.">
          <textarea className={`${inputCls} min-h-[72px] resize-y`} value={note} onChange={e => setNote(e.target.value)} maxLength={400} placeholder="Обсудим планы на неделю, возьмите ноутбуки" />
        </Field>
      </div>
    </Modal>
  )
}
