'use client'

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, Calendar, MessageSquareText, Trash2, ChevronRight, ChevronLeft, Users2 } from 'lucide-react'
import { Button, Modal, Skeleton } from '../../../components/ui'
import { useTeam } from '../../../components/team/TeamContext'
import { PageHeader, Segmented, Avatar, Chip, Field, inputCls, dueLabel, api } from '../../../components/team/ui'
import ReportForm from '../../../components/team/ReportForm'
import ReportCard from '../../../components/team/ReportCard'
import { TASK_STATUSES, TASK_PRIORITIES } from '../../../lib/team'

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
  const [creating, setCreating] = useState(false)
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
  const visible = useMemo(() => {
    if (!tasks) return []
    if (scope === 'all') return tasks
    if (scope === 'mine') return tasks.filter(t => t.assignee_id === me.id || (!t.assignee_id && myTeamIds.has(t.team_id)))
    return tasks.filter(t => String(t.team_id) === scope)
  }, [tasks, scope, me.id, myTeamIds])

  const setOpen = id => {
    const sp = new URLSearchParams(params.toString())
    if (id) sp.set('task', id); else sp.delete('task')
    router.replace(`/team/tasks${sp.toString() ? '?' + sp : ''}`, { scroll: false })
  }

  const move = async (task, status) => {
    setTasks(ts => ts.map(t => t.id === task.id ? { ...t, status } : t))
    try {
      await api(`/api/team/tasks/${task.id}`, { method: 'PATCH', body: { status } })
    } catch (e) {
      toast.error(e.message)
      load()
    }
  }

  const options = [
    { value: 'all', label: 'Все', count: tasks?.length },
    { value: 'mine', label: 'Мои' },
    ...teams.map(t => ({ value: String(t.id), label: t.name }))
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Работа"
        title="Задачи"
        subtitle={me.can_assign
          ? 'Ставь задачи командам и людям. Участники двигают их по доске и пишут отчёты.'
          : 'Твои задачи и задачи команды. Сделал — напиши отчёт и отправь на проверку.'}
        actions={me.can_assign && <Button icon={Plus} onClick={() => setCreating(true)}>Новая задача</Button>}
      />

      <div className="mb-5"><Segmented value={scope} onChange={setScope} options={options} /></div>

      {!tasks ? (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-64 rounded-[22px]" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {TASK_STATUSES.map((col, ci) => {
            const items = visible.filter(t => t.status === col.key)
            return (
              <section key={col.key} className="rounded-[22px] bg-[var(--color-text-primary)]/[0.03] p-2.5 min-h-[140px]">
                <header className="flex items-center justify-between px-2 pt-1 pb-2.5">
                  <h2 className="text-[13px] font-semibold">{col.label}</h2>
                  <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{items.length}</span>
                </header>
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {items.map(t => (
                      <TaskCard
                        key={t.id}
                        task={t}
                        onOpen={() => setOpen(t.id)}
                        canMove={me.can_assign || t.assignee_id === me.id || (!t.assignee_id && myTeamIds.has(t.team_id))}
                        onPrev={ci > 0 ? () => move(t, TASK_STATUSES[ci - 1].key) : null}
                        onNext={ci < TASK_STATUSES.length - 1 && (me.can_assign || col.key !== 'review')
                          ? () => move(t, TASK_STATUSES[ci + 1].key) : null}
                      />
                    ))}
                  </AnimatePresence>
                  {items.length === 0 && (
                    <div className="text-center text-[12px] text-[var(--color-text-tertiary)] py-6">Пусто</div>
                  )}
                </div>
              </section>
            )
          })}
        </div>
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
        onChanged={load}
      />
    </div>
  )
}

function TaskCard({ task: t, onOpen, canMove, onPrev, onNext }) {
  const due = dueLabel(t.due_date)
  const pr = TASK_PRIORITIES.find(p => p.key === t.priority)
  return (
    <motion.div
      layout
      layoutId={`task-${t.id}`}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
      className="group rounded-2xl bg-[var(--color-bg-card)] border border-[var(--color-border)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] transition-shadow"
    >
      <button onClick={onOpen} className="w-full text-left p-3.5 pb-2">
        <div className="flex items-start gap-2">
          {t.priority === 'high' && <span title={pr?.label} className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: pr.color }} />}
          <span className="text-[14px] font-medium leading-snug">{t.title}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {t.team_name && <Chip color={t.team_color}>{t.team_name}</Chip>}
          {due && (
            <span className={`inline-flex items-center gap-1 text-[12px] ${due.overdue && t.status !== 'done' ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
              <Calendar size={11} /> {due.text}
            </span>
          )}
          {t.reports_count > 0 && (
            <span className="inline-flex items-center gap-1 text-[12px] text-[var(--color-text-tertiary)]">
              <MessageSquareText size={11} /> {t.reports_count}
            </span>
          )}
        </div>
      </button>
      <div className="flex items-center justify-between px-3.5 pb-3">
        {t.assignee_name ? (
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)] min-w-0">
            <Avatar name={t.assignee_name} src={t.assignee_avatar} size={20} />
            <span className="truncate">{t.assignee_name}</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-tertiary)]"><Users2 size={13} /> Вся команда</span>
        )}
        {canMove && (
          <span className="flex gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
            {onPrev && <MoveBtn onClick={onPrev} label="Назад"><ChevronLeft size={14} /></MoveBtn>}
            {onNext && <MoveBtn onClick={onNext} label="Дальше"><ChevronRight size={14} /></MoveBtn>}
          </span>
        )}
      </div>
    </motion.div>
  )
}

function MoveBtn({ children, onClick, label }) {
  return (
    <button onClick={onClick} aria-label={label} title={label}
      className="w-7 h-7 rounded-lg flex items-center justify-center bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] apple-press">
      {children}
    </button>
  )
}

/** Создание и редактирование задачи (тимлид). */
function TaskEditor({ open, onClose, teams, people, task, onSaved }) {
  const empty = { title: '', description: '', teamId: '', assigneeId: '', assigneeIds: [], priority: 'normal', dueDate: '' }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
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

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (task) await api(`/api/team/tasks/${task.id}`, { method: 'PATCH', body: form })
      else await api('/api/team/tasks', { method: 'POST', body: form })
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
                ? 'Каждый получит свою копию задачи и отчитается отдельно'
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
          {task && (
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>Отмена</Button>
          <Button type="submit" loading={saving}>{task ? 'Сохранить' : 'Поставить задачу'}</Button>
        </div>
      </form>
    </Modal>
  )
}

/** Карточка задачи: описание, статус, отчёты и форма отчёта. */
function TaskDetails({ id, onClose, teams, people, onChanged }) {
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

  const setStatus = async status => {
    try {
      await api(`/api/team/tasks/${id}`, { method: 'PATCH', body: { status } })
      await load(); onChanged()
    } catch (e) { toast.error(e.message) }
  }

  const remove = async () => {
    if (!confirm('Удалить задачу вместе с отчётами?')) return
    try {
      await api(`/api/team/tasks/${id}`, { method: 'DELETE' })
      toast.success('Задача удалена'); onClose(); onChanged()
    } catch (e) { toast.error(e.message) }
  }

  const deleteReport = async r => {
    if (!confirm('Удалить отчёт?')) return
    try { await api(`/api/team/reports/${r.id}`, { method: 'DELETE' }); load(); onChanged() } catch (e) { toast.error(e.message) }
  }

  const due = task && dueLabel(task.due_date)
  const statuses = me.can_assign ? TASK_STATUSES : TASK_STATUSES.filter(s => s.key !== 'done')

  return (
    <>
      <Modal open={!!id && !editing} onClose={onClose} title={task?.title || 'Задача'} size="lg">
        {!task ? (
          <div className="space-y-3"><Skeleton className="h-5 w-1/2" /><Skeleton className="h-24" /></div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {task.team_name && <Chip color={task.team_color}>{task.team_name}</Chip>}
              <Chip>{task.assignee_name ? `Исполнитель: ${task.assignee_name}` : 'Вся команда'}</Chip>
              {due && <Chip className={due.overdue && task.status !== 'done' ? '!text-[var(--color-danger)]' : ''}>Срок: {due.text}</Chip>}
              <Chip color={TASK_PRIORITIES.find(p => p.key === task.priority)?.color}>
                {TASK_PRIORITIES.find(p => p.key === task.priority)?.label}
              </Chip>
            </div>

            {task.description && <p className="text-[14px] leading-relaxed whitespace-pre-line">{task.description}</p>}

            {task.can_work && (
              <div>
                <div className="text-[12px] font-medium text-[var(--color-text-secondary)] mb-2">Статус</div>
                <Segmented value={task.status} onChange={setStatus} options={statuses.map(s => ({ value: s.key, label: s.label }))} />
                {!me.can_assign && task.status === 'review' && (
                  <p className="text-[12px] text-[var(--color-text-tertiary)] mt-2">Задача у тимлида на проверке — он закроет её или вернёт в работу.</p>
                )}
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

            {task.can_work && (
              <div className="rounded-[20px] bg-[var(--color-bg-soft)] p-4">
                <h3 className="text-[14px] font-semibold mb-3">Написать отчёт</h3>
                <ReportForm task={task} isLead={me.can_assign} onDone={() => { load(); onChanged() }} />
              </div>
            )}

            {me.can_assign && (
              <div className="flex justify-between pt-1">
                <Button variant="ghost" icon={Trash2} onClick={remove} className="!text-[var(--color-danger)]">Удалить</Button>
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
        onSaved={() => { setEditing(false); load(); onChanged() }}
      />
    </>
  )
}
