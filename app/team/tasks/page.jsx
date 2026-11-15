'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  Plus, Calendar, MessageSquareText, Trash2, Users2, Check, RotateCcw, XCircle,
  ChevronDown, LayoutList, UserRound, Hourglass
} from 'lucide-react'
import { Button, Modal, Skeleton } from '../../../components/ui'
import { useTeam } from '../../../components/team/TeamContext'
import { PageHeader, Segmented, Avatar, Chip, Field, inputCls, dueLabel, api } from '../../../components/team/ui'
import ReportForm from '../../../components/team/ReportForm'
import ReportCard from '../../../components/team/ReportCard'
import { TASK_STATUSES, TASK_PRIORITIES, MEMBER_STATUS_KEYS, statusInfo, isClosed } from '../../../lib/team'

/* Фильтры по статусу: «Активные» — всё, что ещё в работе у исполнителя */
const FILTERS = [
  { value: 'active', label: 'Активные', keys: ['todo', 'in_progress', 'rejected'] },
  { value: 'review', label: 'На проверке', keys: ['review'] },
  { value: 'rejected', label: 'Не одобрено', keys: ['rejected'] },
  { value: 'done', label: 'Готово', keys: ['done'] },
  { value: 'failed', label: 'Не выполнено', keys: ['failed'] },
  { value: 'all', label: 'Все', keys: null }
]
const matches = (t, filter) => {
  const f = FILTERS.find(x => x.value === filter)
  return !f?.keys || f.keys.includes(t.status)
}
const groupKey = t => t.batch_id || `t-${t.id}`

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <Tasks />
    </Suspense>
  )
}

function Tasks() {
  const { me } = useTeam()
  const router = useRouter()
  const params = useSearchParams()
  const [tasks, setTasks] = useState(null)
  const [teams, setTeams] = useState([])
  const [people, setPeople] = useState([])
  const [scope, setScope] = useState(params.get('mine') ? 'mine' : 'all')
  const [filter, setFilter] = useState('active')
  const [view, setView] = useState('tasks')
  const [creating, setCreating] = useState(false)
  const [deciding, setDeciding] = useState(null) // { task, status }
  const openId = parseInt(params.get('task')) || null

  const load = useCallback(async () => {
    try {
      const [t, tm, pp] = await Promise.all([api('/api/team/tasks'), api('/api/team/teams'), api('/api/team/people')])
      setTasks(t); setTeams(tm); setPeople(pp)
    } catch (e) {
      toast.error(e.message)
      setTasks([])
    }
  }, [])
  useEffect(() => { load() }, [load])

  const myTeamIds = useMemo(() => new Set((me.teams || []).map(t => t.id)), [me])
  const inScope = useMemo(() => {
    if (!tasks) return []
    if (scope === 'all') return tasks
    if (scope === 'mine') return tasks.filter(t => t.assignee_id === me.id || (!t.assignee_id && myTeamIds.has(t.team_id)))
    return tasks.filter(t => String(t.team_id) === scope)
  }, [tasks, scope, me.id, myTeamIds])

  const counts = useMemo(() => {
    const c = {}
    for (const f of FILTERS) c[f.value] = inScope.filter(t => matches(t, f.value)).length
    return c
  }, [inScope])

  const visible = useMemo(() => inScope.filter(t => matches(t, filter)), [inScope, filter])

  // Группы: одна задача на нескольких людей — одна карточка
  const groups = useMemo(() => {
    const all = new Map()
    for (const t of inScope) {
      const k = groupKey(t)
      if (!all.has(k)) all.set(k, [])
      all.get(k).push(t)
    }
    const shownKeys = new Set(visible.map(groupKey))
    return [...all.entries()]
      .filter(([k]) => shownKeys.has(k))
      .map(([k, items]) => ({ key: k, items: items.sort((a, b) => String(a.assignee_name || '').localeCompare(String(b.assignee_name || ''), 'ru')) }))
  }, [inScope, visible])

  const groupSize = useMemo(() => {
    const m = new Map()
    for (const t of tasks || []) m.set(groupKey(t), (m.get(groupKey(t)) || 0) + 1)
    return m
  }, [tasks])

  const setOpen = id => {
    const sp = new URLSearchParams(params.toString())
    if (id) sp.set('task', id); else sp.delete('task')
    router.replace(`/team/tasks${sp.toString() ? '?' + sp : ''}`, { scroll: false })
  }

  const decide = async (task, status, note) => {
    try {
      await api(`/api/team/tasks/${task.id}`, { method: 'PATCH', body: { status, note } })
      toast.success(statusInfo(status).label + (task.assignee_name ? ` — ${task.assignee_name}` : ''))
      load()
      return true
    } catch (e) {
      toast.error(e.message)
      return false
    }
  }

  const canDecide = t => me.can_assign && t.assignee_id !== me.id
  const reviewCount = me.can_assign ? inScope.filter(t => t.status === 'review' && canDecide(t)).length : 0

  return (
    <div>
      <PageHeader
        eyebrow="Работа"
        title="Задачи"
        subtitle={me.can_assign
          ? 'Одна задача — одна карточка, даже если её делают десять человек. Внутри видно, кто на каком шаге.'
          : 'Твои задачи и задачи команды. Сделал — напиши отчёт и отправь на проверку.'}
        actions={me.can_assign && <Button icon={Plus} onClick={() => setCreating(true)}>Новая задача</Button>}
      />

      {reviewCount > 0 && filter !== 'review' && (
        <button
          onClick={() => setFilter('review')}
          className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-2xl text-left bg-[#8b5cf6]/10 border border-[#8b5cf6]/25 hover:bg-[#8b5cf6]/15 transition-colors"
        >
          <Hourglass size={18} className="text-[#8b5cf6] shrink-0" />
          <span className="text-[14px] font-medium flex-1">Ждут твоей проверки: {reviewCount}</span>
          <span className="text-[13px] text-[#8b5cf6] font-semibold">Открыть</span>
        </button>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-3">
        <Segmented value={filter} onChange={setFilter} options={FILTERS.map(f => ({ value: f.value, label: f.label, count: counts[f.value] }))} />
        <div className="lg:ml-auto">
          <Segmented value={view} onChange={setView} options={[
            { value: 'tasks', label: <span className="inline-flex items-center gap-1.5"><LayoutList size={14} /> По задачам</span> },
            { value: 'people', label: <span className="inline-flex items-center gap-1.5"><UserRound size={14} /> По людям</span> }
          ]} />
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-6">
        <Chip active={scope === 'all'} onClick={() => setScope('all')}>Все</Chip>
        <Chip active={scope === 'mine'} onClick={() => setScope('mine')}>Мои</Chip>
        {teams.map(t => (
          <Chip key={t.id} color={t.color} active={scope === String(t.id)} onClick={() => setScope(String(t.id))}>{t.name}</Chip>
        ))}
      </div>

      {!tasks ? (
        <div className="grid xl:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-44 rounded-[22px]" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-[22px] border border-dashed border-[var(--color-border-strong)] py-16 text-center text-[14px] text-[var(--color-text-tertiary)]">
          {filter === 'review' ? 'На проверке ничего нет' : filter === 'active' ? 'Активных задач нет — можно выдохнуть' : 'Здесь пока пусто'}
        </div>
      ) : view === 'tasks' ? (
        <div className="grid xl:grid-cols-2 gap-4 items-start">
          <AnimatePresence initial={false}>
            {groups.map(g => (
              <TaskGroup
                key={g.key}
                items={g.items}
                filter={filter}
                canDecide={canDecide}
                onOpen={setOpen}
                onApprove={t => decide(t, 'done')}
                onDecide={(t, status) => setDeciding({ task: t, status })}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <PeopleView tasks={visible} onOpen={setOpen} />
      )}

      <TaskEditor
        open={creating}
        onClose={() => setCreating(false)}
        teams={teams}
        people={people}
        onSaved={() => { setCreating(false); load() }}
      />

      <TaskDetails
        id={openId}
        onClose={() => setOpen(null)}
        teams={teams}
        people={people}
        groupSize={groupSize}
        onChanged={load}
        onDecide={(t, status) => setDeciding({ task: t, status })}
      />

      <DecisionModal
        state={deciding}
        onClose={() => setDeciding(null)}
        onSubmit={async note => { if (await decide(deciding.task, deciding.status, note)) setDeciding(null) }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Карточка задачи: один заголовок, внутри — каждый исполнитель         */
/* ------------------------------------------------------------------ */
function TaskGroup({ items, filter, canDecide, onOpen, onApprove, onDecide }) {
  const [expanded, setExpanded] = useState(false)
  const t = items[0]
  const due = dueLabel(t.due_date)
  const pr = TASK_PRIORITIES.find(p => p.key === t.priority)
  const total = items.length
  const by = key => items.filter(x => x.status === key).length
  const done = by('done')
  const open = items.filter(x => !isClosed(x.status)).length
  const reports = items.reduce((s, x) => s + (x.reports_count || 0), 0)

  // Сначала те, кто подходит под фильтр; остальные — по кнопке «Показать всех»
  const relevant = filter === 'all' ? items : items.filter(x => matches(x, filter))
  const rest = items.filter(x => !relevant.includes(x))
  const LIMIT = 5
  const shown = expanded ? [...relevant, ...rest] : relevant.slice(0, LIMIT)
  const hidden = total - shown.length

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="rounded-[22px] bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] overflow-hidden"
    >
      <button onClick={() => onOpen(t.id)} className="w-full text-left px-5 pt-4 pb-3 group">
        <div className="flex items-start gap-2">
          {t.priority === 'high' && <span title={pr?.label} className="mt-[7px] w-2 h-2 rounded-full shrink-0" style={{ background: pr.color }} />}
          <h3 className="text-[16px] font-semibold leading-snug group-hover:text-[var(--color-brand)] transition-colors">{t.title}</h3>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-[var(--color-text-tertiary)]">
          {t.team_name && <Chip color={t.team_color}>{t.team_name}</Chip>}
          {due && (
            <span className={`inline-flex items-center gap-1 ${due.overdue && open > 0 ? 'text-[var(--color-danger)] font-medium' : ''}`}>
              <Calendar size={12} /> {due.text}
            </span>
          )}
          {reports > 0 && <span className="inline-flex items-center gap-1"><MessageSquareText size={12} /> {reports}</span>}
          {total > 1 && <span className="inline-flex items-center gap-1"><Users2 size={12} /> {total}</span>}
        </div>
      </button>

      {total > 1 && (
        <div className="px-5 pb-3">
          <div className="flex h-1.5 rounded-full overflow-hidden bg-[var(--color-bg-soft)]">
            {TASK_STATUSES.map(s => {
              const n = by(s.key)
              return n ? <div key={s.key} title={`${s.label}: ${n}`} style={{ width: `${(n / total) * 100}%`, background: s.color }} /> : null
            })}
          </div>
          <div className="mt-1.5 text-[12px] text-[var(--color-text-tertiary)]">
            Готово {done} из {total}
            {TASK_STATUSES.filter(s => s.key !== 'done' && by(s.key)).map(s => ` · ${s.label.toLowerCase()} ${by(s.key)}`).join('')}
          </div>
        </div>
      )}

      <ul className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
        {shown.map(x => (
          <PersonRow key={x.id} task={x} canDecide={canDecide(x)} onOpen={() => onOpen(x.id)} onApprove={() => onApprove(x)} onDecide={s => onDecide(x, s)} />
        ))}
      </ul>
      {hidden > 0 && (
        <button
          onClick={() => setExpanded(true)}
          className="w-full flex items-center justify-center gap-1 py-2.5 text-[13px] font-medium text-[var(--color-brand)] border-t border-[var(--color-border)] hover:bg-[var(--color-bg-soft)] transition-colors"
        >
          Показать всех ({total}) <ChevronDown size={14} />
        </button>
      )}
    </motion.article>
  )
}

function StatusPill({ status, className = '' }) {
  const s = statusInfo(status)
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${className}`}
      style={{ color: s.color, background: `color-mix(in srgb, ${s.color} 13%, transparent)` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  )
}

function PersonRow({ task: x, canDecide, onOpen, onApprove, onDecide }) {
  const due = dueLabel(x.due_date)
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--color-bg-soft)]/60 transition-colors">
      <button onClick={onOpen} className="flex items-center gap-2.5 min-w-0 flex-1 text-left">
        {x.assignee_name
          ? <Avatar name={x.assignee_name} src={x.assignee_avatar} size={26} />
          : <span className="w-[26px] h-[26px] rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center shrink-0"><Users2 size={13} className="text-[var(--color-text-tertiary)]" /></span>}
        <span className="text-[14px] truncate">{x.assignee_name || 'Вся команда'}</span>
        {x.reports_count > 0 && (
          <span className="inline-flex items-center gap-0.5 text-[11px] text-[var(--color-text-tertiary)] shrink-0"><MessageSquareText size={11} />{x.reports_count}</span>
        )}
        {due?.overdue && !isClosed(x.status) && <span className="text-[11px] font-medium text-[var(--color-danger)] shrink-0">просрочено</span>}
      </button>
      {canDecide && x.status === 'review' ? (
        <span className="flex items-center gap-1 shrink-0">
          <IconBtn label="Принять" onClick={onApprove} tone="#22a55b"><Check size={15} /></IconBtn>
          <IconBtn label="Не одобрено" onClick={() => onDecide('rejected')} tone="#f26b1d"><RotateCcw size={14} /></IconBtn>
        </span>
      ) : (
        <StatusPill status={x.status} className="shrink-0" />
      )}
    </li>
  )
}

function IconBtn({ children, onClick, label, tone }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-8 px-2.5 rounded-lg inline-flex items-center gap-1 text-[12px] font-semibold apple-press transition-colors"
      style={{ color: tone, background: `color-mix(in srgb, ${tone} 12%, transparent)` }}
    >
      {children}<span className="hidden sm:inline">{label}</span>
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Вид «По людям»: у кого сколько и каких задач                         */
/* ------------------------------------------------------------------ */
function PeopleView({ tasks, onOpen }) {
  const rows = useMemo(() => {
    const m = new Map()
    for (const t of tasks) {
      const k = t.assignee_id || `team-${t.team_id}`
      if (!m.has(k)) m.set(k, { key: k, name: t.assignee_name || `Вся команда${t.team_name ? ' · ' + t.team_name : ''}`, avatar: t.assignee_avatar, team: !t.assignee_id, items: [] })
      m.get(k).items.push(t)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length || a.name.localeCompare(b.name, 'ru'))
  }, [tasks])

  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
      {rows.map(p => (
        <motion.section
          key={p.key}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[22px] bg-[var(--color-bg-card)] border border-[var(--color-border)] overflow-hidden"
        >
          <header className="flex items-center gap-3 px-4 py-3.5">
            {p.team
              ? <span className="w-9 h-9 rounded-full bg-[var(--color-bg-soft)] flex items-center justify-center"><Users2 size={16} className="text-[var(--color-text-tertiary)]" /></span>
              : <Avatar name={p.name} src={p.avatar} size={36} />}
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold truncate">{p.name}</div>
              <div className="flex flex-wrap gap-x-2 text-[12px] text-[var(--color-text-tertiary)]">
                {TASK_STATUSES.filter(s => p.items.some(t => t.status === s.key)).map(s => (
                  <span key={s.key} style={{ color: s.color }}>{s.label.toLowerCase()} {p.items.filter(t => t.status === s.key).length}</span>
                ))}
              </div>
            </div>
            <span className="text-[20px] font-semibold tabular-nums">{p.items.length}</span>
          </header>
          <ul className="border-t border-[var(--color-border)] divide-y divide-[var(--color-border)]">
            {p.items.map(t => {
              const due = dueLabel(t.due_date)
              return (
                <li key={t.id}>
                  <button onClick={() => onOpen(t.id)} className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-[var(--color-bg-soft)]/60 transition-colors">
                    <span className="w-1 h-6 rounded-full shrink-0" style={{ background: t.team_color || 'var(--color-border-strong)' }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-medium truncate">{t.title}</span>
                      {due && <span className={`text-[11px] ${due.overdue && !isClosed(t.status) ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-tertiary)]'}`}>{due.text}</span>}
                    </span>
                    <StatusPill status={t.status} />
                  </button>
                </li>
              )
            })}
          </ul>
        </motion.section>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* «Не одобрено» / «Не выполнено» — с причиной                          */
/* ------------------------------------------------------------------ */
function DecisionModal({ state, onClose, onSubmit }) {
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (state) setNote(state.task?.review_note && state.status === state.task?.status ? state.task.review_note : '') }, [state])
  const rejected = state?.status === 'rejected'
  const who = state?.task?.assignee_name

  const submit = async e => {
    e.preventDefault()
    if (rejected && !note.trim()) return toast.error('Напиши, что исправить')
    setSaving(true)
    await onSubmit(note.trim())
    setSaving(false)
  }

  return (
    <Modal open={!!state} onClose={onClose} title={rejected ? 'Не одобрено' : 'Не выполнено'}>
      <form onSubmit={submit} className="space-y-4">
        <p className="text-[14px] text-[var(--color-text-secondary)]">
          {rejected
            ? <>Задача вернётся {who ? <b className="text-[var(--color-text-primary)]">{who}</b> : 'исполнителю'} на доработку. Он увидит причину и сможет отправить на проверку ещё раз.</>
            : <>Задача закроется как невыполненная{who ? <> у <b className="text-[var(--color-text-primary)]">{who}</b></> : ''}. Это видно в статистике участника.</>}
        </p>
        <Field label={rejected ? 'Что исправить' : 'Причина — по желанию'}>
          <textarea
            autoFocus
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={3}
            className={`${inputCls} resize-y`}
            placeholder={rejected ? 'Например: в отчёте нет ссылки на фото, добавь и отправь заново' : 'Например: срок прошёл, задача не сделана'}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" variant={rejected ? 'primary' : 'danger'} loading={saving}>
            {rejected ? 'Вернуть на доработку' : 'Закрыть как невыполненную'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Создание и редактирование задачи (тимлид, библиотекарь)              */
/* ------------------------------------------------------------------ */
function TaskEditor({ open, onClose, teams, people, task, batchCount = 1, onSaved }) {
  const empty = { title: '', description: '', teamId: '', assigneeId: '', assigneeIds: [], priority: 'normal', dueDate: '' }
  const [form, setForm] = useState(empty)
  const [allCopies, setAllCopies] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAllCopies(true)
    setForm(task ? {
      title: task.title, description: task.description || '', teamId: task.team_id || '',
      assigneeId: task.assignee_id || '', priority: task.priority, dueDate: task.due_date ? String(task.due_date).slice(0, 10) : ''
    } : empty)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const teamPeople = form.teamId
    ? people.filter(p => (p.teams || []).some(t => String(t.id) === String(form.teamId)))
    : people
  const batch = task && batchCount > 1 && allCopies

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (task) {
        const body = { ...form, scope: batch ? 'batch' : undefined }
        if (batch) delete body.assigneeId
        await api(`/api/team/tasks/${task.id}`, { method: 'PATCH', body })
      } else {
        await api('/api/team/tasks', { method: 'POST', body: form })
      }
      toast.success(task ? 'Задача обновлена'
        : form.assigneeIds.length > 1 ? `Задача поставлена ${form.assigneeIds.length} участникам` : 'Задача поставлена')
      onSaved?.()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Изменить задачу' : 'Новая задача'} size="lg">
      <form onSubmit={save} className="space-y-3">
        <Field label="Что нужно сделать">
          <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="Например: собрать отзывы 9-х классов" />
        </Field>
        <Field label="Подробности">
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={4} className={`${inputCls} resize-y`} placeholder="Цель, критерии готовности, ссылки" />
        </Field>
        {!task && (
          <div>
            <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-1.5">
              Исполнители{form.assigneeIds.length ? ` · ${form.assigneeIds.length}` : ''}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {teamPeople.map(p => {
                const on = form.assigneeIds.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => set('assigneeIds', on ? form.assigneeIds.filter(x => x !== p.id) : [...form.assigneeIds, p.id])}
                    className={`inline-flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-[13px] font-medium transition-colors ${
                      on ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}
                  >
                    <Avatar name={p.name} src={p.avatar_url} size={22} /> {p.name}
                  </button>
                )
              })}
              {teamPeople.length > 1 && (
                <button
                  type="button"
                  onClick={() => set('assigneeIds', form.assigneeIds.length === teamPeople.length ? [] : teamPeople.map(p => p.id))}
                  className="px-3 py-1 rounded-full text-[13px] font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)]"
                >
                  {form.assigneeIds.length === teamPeople.length ? 'Снять всех' : 'Выбрать всех'}
                </button>
              )}
            </div>
            <div className="text-[11px] text-[var(--color-text-tertiary)] mt-1.5">
              {form.assigneeIds.length > 1
                ? 'На доске это будет одна задача; у каждого свой статус и свои отчёты'
                : form.teamId && !form.assigneeIds.length
                  ? 'Никого не выбрал — задачу увидит и сможет взять вся команда'
                  : 'Можно выбрать несколько человек'}
            </div>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Команда">
            <select value={form.teamId} onChange={e => set('teamId', e.target.value)} className={inputCls}>
              <option value="">Без команды</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          {task && !batch && (
            <Field label="Исполнитель" hint={form.teamId && !form.assigneeId ? 'Задачу увидит и сможет взять вся команда' : undefined}>
              <select value={form.assigneeId} onChange={e => set('assigneeId', e.target.value)} className={inputCls}>
                <option value="">{form.teamId ? 'Вся команда' : 'Выбери человека'}</option>
                {teamPeople.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Приоритет">
            <select value={form.priority} onChange={e => set('priority', e.target.value)} className={inputCls}>
              {TASK_PRIORITIES.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
          <Field label="Срок">
            <input type="date" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} className={inputCls} />
          </Field>
        </div>
        {task && batchCount > 1 && (
          <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)] cursor-pointer">
            <input type="checkbox" checked={allCopies} onChange={e => setAllCopies(e.target.checked)} className="w-4 h-4 accent-[var(--color-brand)]" />
            Изменить у всех исполнителей ({batchCount})
          </label>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={saving}>{task ? 'Сохранить' : 'Поставить задачу'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/* ------------------------------------------------------------------ */
/* Карточка одной копии: статус, решение, отчёты                        */
/* ------------------------------------------------------------------ */
function TaskDetails({ id, onClose, teams, people, groupSize, onChanged, onDecide }) {
  const { me } = useTeam()
  const [task, setTask] = useState(null)
  const [editing, setEditing] = useState(false)
  // Родитель передаёт новые функции на каждый рендер — держим их в ref,
  // иначе загрузка задачи зациклится.
  const cb = useRef({ onClose, onChanged })
  cb.current = { onClose, onChanged }

  const load = useCallback(async () => {
    if (!id) return
    try { setTask(await api(`/api/team/tasks/${id}`)) } catch (e) { toast.error(e.message); cb.current.onClose() }
  }, [id])

  useEffect(() => { setTask(null); load() }, [load])
  // После решения из модального окна список обновляется — подтягиваем и карточку
  useEffect(() => { if (id) load() }, [groupSize, id, load])

  const setStatus = async status => {
    try {
      await api(`/api/team/tasks/${id}`, { method: 'PATCH', body: { status } })
      await load(); onChanged()
    } catch (e) { toast.error(e.message) }
  }

  const batchCount = task ? groupSize.get(task.batch_id || `t-${task.id}`) || 1 : 1

  const remove = async all => {
    if (!confirm(all ? `Удалить задачу у всех исполнителей (${batchCount}) вместе с отчётами?` : 'Удалить задачу у этого исполнителя вместе с отчётами?')) return
    try {
      await api(`/api/team/tasks/${id}${all ? '?batch=1' : ''}`, { method: 'DELETE' })
      toast.success('Задача удалена'); onClose(); onChanged()
    } catch (e) { toast.error(e.message) }
  }

  const deleteReport = async r => {
    if (!confirm('Удалить отчёт?')) return
    try { await api(`/api/team/reports/${r.id}`, { method: 'DELETE' }); load(); onChanged() } catch (e) { toast.error(e.message) }
  }

  const due = task && dueLabel(task.due_date)
  const closed = task && isClosed(task.status)
  const memberStatuses = TASK_STATUSES.filter(s => MEMBER_STATUS_KEYS.includes(s.key))
  const showNote = task?.review_note && task.status !== 'done'

  return (
    <>
      <Modal open={!!id && !editing} onClose={onClose} title={task?.title || 'Задача'} size="lg">
        {!task ? (
          <div className="space-y-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status={task.status} className="!text-[12px] !px-2.5 !py-1" />
              {task.team_name && <Chip color={task.team_color}>{task.team_name}</Chip>}
              <Chip>{task.assignee_name ? `Исполнитель: ${task.assignee_name}` : 'Вся команда'}</Chip>
              {due && <Chip className={due.overdue && !closed ? '!text-[var(--color-danger)]' : ''}>Срок: {due.text}</Chip>}
              <Chip color={TASK_PRIORITIES.find(p => p.key === task.priority)?.color}>
                {TASK_PRIORITIES.find(p => p.key === task.priority)?.label}
              </Chip>
              {batchCount > 1 && <Chip><Users2 size={12} /> Ещё {batchCount - 1} исполн.</Chip>}
            </div>

            {task.description && <p className="text-[14px] leading-relaxed whitespace-pre-line">{task.description}</p>}

            {showNote && (
              <div className="rounded-2xl px-4 py-3 text-[14px]"
                style={{ background: `color-mix(in srgb, ${statusInfo(task.status === 'failed' ? 'failed' : 'rejected').color} 10%, transparent)` }}>
                <div className="text-[12px] font-semibold mb-1" style={{ color: statusInfo(task.status === 'failed' ? 'failed' : 'rejected').color }}>
                  {task.status === 'failed' ? 'Не выполнено' : 'Что исправить'}{task.decided_by_name ? ` · ${task.decided_by_name}` : ''}
                </div>
                <p className="whitespace-pre-line">{task.review_note}</p>
              </div>
            )}

            {task.can_work && (!closed || me.can_assign) && (
              <div>
                <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-2">Статус</div>
                <Segmented
                  value={MEMBER_STATUS_KEYS.includes(task.status) ? task.status : null}
                  onChange={setStatus}
                  options={memberStatuses.map(s => ({ value: s.key, label: s.label }))}
                />
                {!task.can_decide && task.status === 'review' && (
                  <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2">
                    {me.can_assign
                      ? 'Свою задачу закрывает другой тимлид или библиотекарь.'
                      : 'Задача на проверке — тимлид примет её или вернёт на доработку.'}
                  </p>
                )}
                {task.status === 'rejected' && !task.can_decide && (
                  <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2">Исправь, напиши отчёт и снова отправь «На проверке».</p>
                )}
              </div>
            )}

            {task.can_decide && (
              <div>
                <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-2">Решение</div>
                <div className="flex flex-wrap gap-2">
                  <DecisionBtn active={task.status === 'done'} color="#22a55b" icon={Check} onClick={() => setStatus('done')}>Готово</DecisionBtn>
                  <DecisionBtn active={task.status === 'rejected'} color="#f26b1d" icon={RotateCcw} onClick={() => onDecide(task, 'rejected')}>Не одобрено</DecisionBtn>
                  <DecisionBtn active={task.status === 'failed'} color="#e5484d" icon={XCircle} onClick={() => onDecide(task, 'failed')}>Не выполнено</DecisionBtn>
                </div>
              </div>
            )}

            <div>
              <h3 className="text-[15px] font-semibold mb-3">Отчёты <span className="text-[var(--color-text-tertiary)] font-normal">{task.reports.length}</span></h3>
              <div className="space-y-3">
                {task.reports.map((r, i) => (
                  <ReportCard key={r.id} report={r} i={i} showTask={false}
                    canDelete={r.user_id === me.id || me.can_assign} onDelete={deleteReport} />
                ))}
                {task.reports.length === 0 && <p className="text-[13px] text-[var(--color-text-tertiary)]">Отчётов пока нет.</p>}
              </div>
            </div>

            {task.can_work && !closed && (
              <div className="rounded-[20px] bg-[var(--color-bg-soft)] p-4">
                <h3 className="text-[14px] font-semibold mb-3">Написать отчёт</h3>
                <ReportForm task={task} isLead={task.can_decide} onDone={() => { load(); onChanged() }} />
              </div>
            )}

            {me.can_assign && (
              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <div className="flex flex-wrap gap-1">
                  <Button variant="ghost" icon={Trash2} onClick={() => remove(false)} className="!text-[var(--color-danger)]">
                    {batchCount > 1 ? 'Удалить у него' : 'Удалить'}
                  </Button>
                  {batchCount > 1 && (
                    <Button variant="ghost" onClick={() => remove(true)} className="!text-[var(--color-danger)]">Удалить у всех</Button>
                  )}
                </div>
                <Button variant="secondary" onClick={() => setEditing(true)}>Изменить</Button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <TaskEditor
        open={editing}
        onClose={() => setEditing(false)}
        teams={teams}
        people={people}
        task={task}
        batchCount={batchCount}
        onSaved={() => { setEditing(false); load(); onChanged() }}
      />
    </>
  )
}

function DecisionBtn({ children, active, color, icon: Icon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold apple-press transition-colors border"
      style={active
        ? { background: color, color: '#fff', borderColor: color }
        : { color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 8%, transparent)` }}
    >
      <Icon size={15} /> {children}
    </button>
  )
}
