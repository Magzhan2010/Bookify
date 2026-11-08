'use client'

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Plus, UserPlus, Crown, Pencil, Trash2, Search, Copy, Check } from 'lucide-react'
import { Button, Modal, Skeleton } from '../../../components/ui'
import { useTeam } from '../../../components/team/TeamContext'
import { PageHeader, Surface, Avatar, AvatarStack, Chip, Field, inputCls, timeAgo, api } from '../../../components/team/ui'
import { TEAM_COLORS } from '../../../lib/team'
import { clearTeamMe } from '../../../lib/useTeamMe'

export default function PeoplePage() {
  const { me, refresh } = useTeam()
  const [teams, setTeams] = useState(null)
  const [people, setPeople] = useState([])
  const [teamEdit, setTeamEdit] = useState(null)      // {} — новая, объект — редактирование
  const [personEdit, setPersonEdit] = useState(null)
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([api('/api/team/teams'), api('/api/team/people')])
      setTeams(t); setPeople(p)
    } catch (e) { toast.error(e.message); setTeams([]) }
  }, [])
  useEffect(() => { load() }, [load])

  const afterChange = () => { load(); clearTeamMe(); refresh() }

  return (
    <div>
      <PageHeader
        eyebrow="Команда"
        title="Команды и люди"
        subtitle={me.is_lead
          ? 'Собирай команды, добавляй участников проекта и назначай им роли.'
          : 'Кто в какой команде и чем занимается.'}
        actions={me.is_lead && (
          <>
            <Button variant="secondary" icon={UserPlus} onClick={() => setAdding(true)}>Добавить участника</Button>
            <Button icon={Plus} onClick={() => setTeamEdit({})}>Новая команда</Button>
          </>
        )}
      />

      {!teams ? (
        <div className="grid md:grid-cols-3 gap-4">{[0, 1, 2].map(i => <Skeleton key={i} className="h-40 rounded-[22px]" />)}</div>
      ) : (
        <>
          <section className="mb-10">
            <h2 className="text-[15px] font-semibold mb-3">Команды <span className="text-[var(--color-text-tertiary)] font-normal">{teams.length}</span></h2>
            {teams.length === 0 ? (
              <Surface className="p-8 text-center text-[14px] text-[var(--color-text-tertiary)]">
                {me.is_lead ? 'Пока ни одной команды. Создай первую — например «Медиа» или «TEDx».' : 'Тимлид ещё не создал команды.'}
              </Surface>
            ) : (
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {teams.map((t, i) => {
                  const pct = t.tasks_total ? Math.round((t.tasks_done / t.tasks_total) * 100) : 0
                  return (
                    <motion.div key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Surface className="p-5 h-full flex flex-col card-lift">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-9 h-9 rounded-xl shrink-0" style={{ background: t.color }} />
                            <div className="min-w-0">
                              <div className="text-[16px] font-semibold truncate">{t.name}</div>
                              <div className="text-[12px] text-[var(--color-text-tertiary)]">{t.members.length} чел.</div>
                            </div>
                          </div>
                          {me.is_lead && (
                            <button onClick={() => setTeamEdit(t)} aria-label="Изменить команду" className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)]">
                              <Pencil size={14} />
                            </button>
                          )}
                        </div>
                        {t.description && <p className="text-[13px] text-[var(--color-text-secondary)] mt-3 line-clamp-2">{t.description}</p>}
                        <div className="mt-auto pt-5">
                          <div className="flex items-center justify-between mb-2">
                            <AvatarStack people={t.members} />
                            <span className="text-[12px] tabular-nums text-[var(--color-text-tertiary)]">{t.tasks_done}/{t.tasks_total} задач</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.1 + i * 0.04 }}
                              className="h-full rounded-full" style={{ background: t.color }} />
                          </div>
                        </div>
                      </Surface>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-[15px] font-semibold mb-3">Участники <span className="text-[var(--color-text-tertiary)] font-normal">{people.length}</span></h2>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {people.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Surface className="p-4 h-full">
                    <div className="flex items-start gap-3">
                      <Avatar name={p.name} src={p.avatar_url} size={42} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] font-semibold truncate flex items-center gap-1">
                          {p.name}
                          {p.platform_role === 'lead' && <Crown size={13} className="text-[#c97a00] shrink-0" />}
                        </div>
                        <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">
                          {p.platform_role === 'lead' ? 'Teamlead' : p.title || 'Участник'}
                        </div>
                      </div>
                      {me.is_lead && (
                        <button onClick={() => setPersonEdit(p)} aria-label="Изменить участника" className="p-1.5 rounded-lg text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-soft)]">
                          <Pencil size={14} />
                        </button>
                      )}
                    </div>
                    {p.teams.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {p.teams.map(t => <Chip key={t.id} color={t.color}>{t.name}</Chip>)}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                      <Num label="в работе" value={p.open_tasks} />
                      <Num label="сделано" value={p.done_tasks} />
                      <Num label="отчётов" value={p.reports} />
                    </div>
                    <div className="text-[11px] text-[var(--color-text-tertiary)] mt-3">
                      {p.last_report_at ? `Последний отчёт ${timeAgo(p.last_report_at)}` : 'Отчётов ещё не было'}
                    </div>
                  </Surface>
                </motion.div>
              ))}
            </div>
          </section>
        </>
      )}

      {me.is_lead && (
        <>
          <TeamEditor team={teamEdit} people={people} onClose={() => setTeamEdit(null)} onSaved={() => { setTeamEdit(null); afterChange() }} />
          <PersonEditor person={personEdit} teams={teams || []} me={me} onClose={() => setPersonEdit(null)} onSaved={() => { setPersonEdit(null); afterChange() }} />
          <AddPerson open={adding} teams={teams || []} onClose={() => setAdding(false)} onSaved={afterChange} />
        </>
      )}
    </div>
  )
}

function Num({ label, value }) {
  return (
    <div className="rounded-xl bg-[var(--color-bg-soft)] py-2">
      <div className="text-[16px] font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] text-[var(--color-text-tertiary)]">{label}</div>
    </div>
  )
}

function MemberPicker({ people, value, onChange }) {
  const toggle = id => onChange(value.includes(id) ? value.filter(x => x !== id) : [...value, id])
  return (
    <div className="flex flex-wrap gap-1.5">
      {people.map(p => (
        <button key={p.id} type="button" onClick={() => toggle(p.id)}
          className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-[13px] transition-colors ${
            value.includes(p.id)
              ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]'
              : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
          }`}>
          <Avatar name={p.name} src={p.avatar_url} size={20} /> {p.name}
        </button>
      ))}
      {people.length === 0 && <span className="text-[12px] text-[var(--color-text-tertiary)]">Сначала добавь участников</span>}
    </div>
  )
}

function TeamEditor({ team, people, onClose, onSaved }) {
  const isNew = team && !team.id
  const [form, setForm] = useState({ name: '', description: '', color: TEAM_COLORS[0], memberIds: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!team) return
    setForm({
      name: team.name || '', description: team.description || '',
      color: team.color || TEAM_COLORS[0], memberIds: (team.members || []).map(m => m.id)
    })
  }, [team])

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      if (isNew) await api('/api/team/teams', { method: 'POST', body: form })
      else await api(`/api/team/teams/${team.id}`, { method: 'PATCH', body: form })
      toast.success(isNew ? 'Команда создана' : 'Сохранено')
      onSaved()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm(`Удалить команду «${team.name}»? Задачи останутся, но без команды.`)) return
    try { await api(`/api/team/teams/${team.id}`, { method: 'DELETE' }); toast.success('Команда удалена'); onSaved() } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={!!team} onClose={onClose} title={isNew ? 'Новая команда' : 'Команда'} size="lg">
      <form onSubmit={save} className="space-y-4">
        <Field label="Название">
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} placeholder="Медиа, TEDx, Мониторинг…" />
        </Field>
        <Field label="Чем занимается">
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className={`${inputCls} resize-y`} />
        </Field>
        <Field label="Цвет">
          <div className="flex gap-2">
            {TEAM_COLORS.map(c => (
              <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))} aria-label={`Цвет ${c}`}
                className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-[var(--color-text-primary)] ring-offset-[var(--color-bg-card)] scale-105' : ''}`}
                style={{ background: c }} />
            ))}
          </div>
        </Field>
        <Field label="Участники">
          <MemberPicker people={people} value={form.memberIds} onChange={ids => setForm(f => ({ ...f, memberIds: ids }))} />
        </Field>
        <div className="flex justify-between pt-2">
          {!isNew ? <Button type="button" variant="ghost" icon={Trash2} onClick={remove} className="!text-[var(--color-danger)]">Удалить</Button> : <span />}
          <Button type="submit" loading={saving}>{isNew ? 'Создать' : 'Сохранить'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function PersonEditor({ person, teams, me, onClose, onSaved }) {
  const [form, setForm] = useState({ title: '', platformRole: 'member', teamIds: [] })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!person) return
    setForm({ title: person.title || '', platformRole: person.platform_role, teamIds: person.teams.map(t => t.id) })
  }, [person])

  const toggleTeam = id => setForm(f => ({ ...f, teamIds: f.teamIds.includes(id) ? f.teamIds.filter(x => x !== id) : [...f.teamIds, id] }))

  const save = async e => {
    e.preventDefault()
    setSaving(true)
    try {
      await api(`/api/team/people/${person.id}`, { method: 'PATCH', body: form })
      toast.success('Сохранено'); onSaved()
    } catch (err) { toast.error(err.message) } finally { setSaving(false) }
  }

  const remove = async () => {
    if (!confirm(`Убрать ${person.name} с платформы? Аккаунт останется.`)) return
    try { await api(`/api/team/people/${person.id}`, { method: 'DELETE' }); toast.success('Участник убран'); onSaved() } catch (e) { toast.error(e.message) }
  }

  return (
    <Modal open={!!person} onClose={onClose} title={person?.name} description={person?.email}>
      <form onSubmit={save} className="space-y-4">
        <Field label="Роль в проекте" hint="Например: дизайнер, ответственный за TEDx">
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} />
        </Field>
        <Field label="Доступ">
          <select value={form.platformRole} onChange={e => setForm(f => ({ ...f, platformRole: e.target.value }))} className={inputCls} disabled={person?.id === me.id}>
            <option value="member">Участник — получает задачи и пишет отчёты</option>
            <option value="lead">Teamlead — создаёт команды и ставит задачи</option>
          </select>
        </Field>
        <Field label="Команды">
          <div className="flex flex-wrap gap-1.5">
            {teams.map(t => <Chip key={t.id} color={t.color} active={form.teamIds.includes(t.id)} onClick={() => toggleTeam(t.id)}>{t.name}</Chip>)}
            {teams.length === 0 && <span className="text-[12px] text-[var(--color-text-tertiary)]">Команд пока нет</span>}
          </div>
        </Field>
        <div className="flex justify-between pt-2">
          {person?.id !== me.id ? <Button type="button" variant="ghost" icon={Trash2} onClick={remove} className="!text-[var(--color-danger)]">Убрать</Button> : <span />}
          <Button type="submit" loading={saving}>Сохранить</Button>
        </div>
      </form>
    </Modal>
  )
}

function AddPerson({ open, teams, onClose, onSaved }) {
  const [mode, setMode] = useState('find')
  const [q, setQ] = useState('')
  const [found, setFound] = useState([])
  const [form, setForm] = useState({ name: '', email: '', title: '', teamIds: [] })
  const [saving, setSaving] = useState(false)
  const [creds, setCreds] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!open) { setQ(''); setFound([]); setCreds(null); setForm({ name: '', email: '', title: '', teamIds: [] }); setMode('find') }
  }, [open])

  useEffect(() => {
    if (mode !== 'find' || q.trim().length < 2) { setFound([]); return }
    const t = setTimeout(() => {
      api(`/api/team/users/search?q=${encodeURIComponent(q.trim())}`).then(setFound).catch(() => setFound([]))
    }, 250)
    return () => clearTimeout(t)
  }, [q, mode])

  const toggleTeam = id => setForm(f => ({ ...f, teamIds: f.teamIds.includes(id) ? f.teamIds.filter(x => x !== id) : [...f.teamIds, id] }))

  const add = async body => {
    setSaving(true)
    try {
      const res = await api('/api/team/people', { method: 'POST', body: { ...body, title: form.title, teamIds: form.teamIds } })
      onSaved()
      if (res.credentials) setCreds(res.credentials)
      else { toast.success('Участник добавлен'); onClose() }
    } catch (e) { toast.error(e.message) } finally { setSaving(false) }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`Bookify Team\nЛогин: ${creds.email}\nПароль: ${creds.password}`)
      setCopied(true); setTimeout(() => setCopied(false), 1500)
    } catch { toast.error('Не удалось скопировать') }
  }

  return (
    <Modal open={open} onClose={onClose} title="Добавить участника" size="lg">
      {creds ? (
        <div className="space-y-4">
          <p className="text-[14px] text-[var(--color-text-secondary)]">Аккаунт создан. Передай данные для входа — пароль больше нигде не показывается.</p>
          <div className="rounded-2xl bg-[var(--color-bg-soft)] p-4 font-mono text-[14px] space-y-1">
            <div>Логин: {creds.email}</div>
            <div>Пароль: {creds.password}</div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Скопировано' : 'Скопировать'}</Button>
            <Button onClick={onClose}>Готово</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="inline-flex p-1 rounded-xl bg-[var(--color-bg-soft)]">
            {[['find', 'Есть аккаунт'], ['new', 'Создать аккаунт']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)}
                className={`px-3 py-1.5 rounded-lg text-[13px] font-medium ${mode === k ? 'bg-[var(--color-bg-card)] shadow-sm' : 'text-[var(--color-text-secondary)]'}`}>{l}</button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Роль в проекте">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} placeholder="Например: SMM" />
            </Field>
            <Field label="Команды">
              <div className="flex flex-wrap gap-1.5 pt-1">
                {teams.map(t => <Chip key={t.id} color={t.color} active={form.teamIds.includes(t.id)} onClick={() => toggleTeam(t.id)}>{t.name}</Chip>)}
                {teams.length === 0 && <span className="text-[12px] text-[var(--color-text-tertiary)]">можно позже</span>}
              </div>
            </Field>
          </div>

          {mode === 'find' ? (
            <div>
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)]" />
                <input value={q} onChange={e => setQ(e.target.value)} placeholder="Имя или email" className={`${inputCls} pl-10`} />
              </div>
              <ul className="mt-2 max-h-64 overflow-y-auto">
                {found.map(u => (
                  <li key={u.id} className="flex items-center gap-3 py-2">
                    <Avatar name={u.name} src={u.avatar_url} size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-medium truncate">{u.name}</div>
                      <div className="text-[12px] text-[var(--color-text-tertiary)] truncate">{u.email}{u.class_name ? ` · ${u.class_name}` : ''}</div>
                    </div>
                    <Button size="sm" loading={saving} onClick={() => add({ userId: u.id })}>Добавить</Button>
                  </li>
                ))}
                {q.trim().length >= 2 && found.length === 0 && (
                  <li className="text-[13px] text-[var(--color-text-tertiary)] py-3">Никого не нашли. Можно создать новый аккаунт.</li>
                )}
              </ul>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); add({ name: form.name, email: form.email }) }} className="space-y-3">
              <Field label="Имя и фамилия">
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inputCls} />
              </Field>
              <Field label="Email" hint="Можно оставить пустым — логин сделаем из имени">
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={inputCls} type="email" />
              </Field>
              <div className="flex justify-end"><Button type="submit" icon={UserPlus} loading={saving}>Создать и добавить</Button></div>
            </form>
          )}
        </div>
      )}
    </Modal>
  )
}
