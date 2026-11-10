'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ListChecks, Clock, AlertTriangle, CheckCircle2, ArrowRight, MessageSquareOff, Mic, Video, Hourglass
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTeam } from '../../components/team/TeamContext'
import { PageHeader, Surface, Stat, Avatar, timeAgo, dueLabel, api } from '../../components/team/ui'
import { statusLabel } from '../../lib/team'
import { Skeleton } from '../../components/ui'
import GameStart from '../../components/GameStart'

export default function TeamOverview() {
  const { me } = useTeam()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  const load = () => api('/api/team/overview').then(setData).catch(e => setError(e.message))
  useEffect(() => { load() }, [])

  const hour = new Date().getHours()
  const hello = hour < 12 ? 'Доброе утро' : hour < 18 ? 'Добрый день' : 'Добрый вечер'

  return (
    <div>
      <PageHeader
        eyebrow={new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${hello}, ${me.name.split(' ')[0]}`}
        subtitle="Задачи команды, свежие отчёты и как идут дела у учеников — на одном экране."
        actions={<GameStart onChanged={load} />}
      />

      {error && <Surface className="p-5 text-[14px] text-[var(--color-danger)]">{error}</Surface>}

      {!data && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[92px] rounded-[20px]" />)}
        </div>
      )}

      {data && (
        <div className="space-y-6">
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat i={0} icon={ListChecks} label="К выполнению" value={data.tasks.todo} />
            <Stat i={1} icon={Clock} label="В работе" value={data.tasks.in_progress} />
            <Stat i={2} icon={Hourglass} label="На проверке" value={data.tasks.review} />
            <Stat i={3} icon={AlertTriangle} label="Просрочено" value={data.tasks.overdue} tone={data.tasks.overdue > 0 ? 'danger' : undefined} />
          </section>

          <div className="grid lg:grid-cols-[1.25fr_1fr] gap-6">
            {/* Мои задачи */}
            <Surface className="p-5">
              <SectionTitle title="Мои задачи" href="/team/tasks?mine=1" />
              {data.my_tasks.length === 0 ? (
                <p className="text-[13px] text-[var(--color-text-tertiary)] py-6 text-center">Открытых задач нет — можно выдохнуть.</p>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.my_tasks.map(t => {
                    const due = dueLabel(t.due_date)
                    return (
                      <li key={t.id}>
                        <Link href={`/team/tasks?task=${t.id}`} className="flex items-center gap-3 py-3 group">
                          <span className="w-1.5 h-8 rounded-full shrink-0" style={{ background: t.team_color || 'var(--color-border-strong)' }} />
                          <div className="min-w-0 flex-1">
                            <div className="text-[14px] font-medium truncate group-hover:text-[var(--color-brand)] transition-colors">{t.title}</div>
                            <div className="text-[12px] text-[var(--color-text-tertiary)]">
                              {statusLabel(t.status)}{t.team_name ? ` · ${t.team_name}` : ''}
                            </div>
                          </div>
                          {due && (
                            <span className={`text-[12px] tabular-nums shrink-0 ${due.overdue ? 'text-[var(--color-danger)] font-medium' : 'text-[var(--color-text-tertiary)]'}`}>
                              {due.text}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Surface>

            {/* Ученики */}
            <Surface className="p-5">
              <SectionTitle title="Ученики" href="/team/monitoring" />
              <div className="grid grid-cols-2 gap-3">
                <MiniStat icon={MessageSquareOff} label="Книг без отзыва" value={data.students.reviews_missing} tone={data.students.reviews_missing > 0 ? 'warn' : undefined} href="/team/monitoring?filter=missing" />
                <MiniStat icon={Hourglass} label="Отзывов ждут проверки" value={data.students.reviews_pending} tone={data.students.reviews_pending > 0 ? 'warn' : undefined} href="/team/reviews" />
                <MiniStat icon={Mic} label="Выступлений TEDx" value={data.students.tedx} href="/team/monitoring?filter=tedx" />
                <MiniStat icon={Video} label="Видео о книгах" value={data.students.videos} href="/team/monitoring?filter=video" />
                <MiniStat icon={AlertTriangle} label="Просрочено книг — продлить" value={data.students.overdue_loans} tone={data.students.overdue_loans > 0 ? 'warn' : undefined} href="/team/loans" />
              </div>
              <p className="text-[12px] text-[var(--color-text-tertiary)] mt-4">Всего учеников: {data.students.students}</p>
            </Surface>
          </div>

          <div className="grid lg:grid-cols-[1fr_1.25fr] gap-6">
            {/* Команды */}
            <Surface className="p-5">
              <SectionTitle title="Команды" href="/team/people" />
              {data.teams.length === 0 ? (
                <p className="text-[13px] text-[var(--color-text-tertiary)] py-6 text-center">
                  {me.is_lead ? 'Создай первую команду в разделе «Команды и люди».' : 'Команд пока нет.'}
                </p>
              ) : (
                <ul className="space-y-4">
                  {data.teams.map((t, i) => {
                    const pct = t.total ? Math.round((t.done / t.total) * 100) : 0
                    return (
                      <li key={t.id}>
                        <div className="flex items-center justify-between text-[13px] mb-1.5">
                          <span className="flex items-center gap-2 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} /> {t.name}
                          </span>
                          <span className="text-[var(--color-text-tertiary)] tabular-nums">{t.done}/{t.total} · {t.members} чел.</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.15 + i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                            className="h-full rounded-full"
                            style={{ background: t.color }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Surface>

            {/* Активность */}
            <Surface className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[15px] font-semibold">Активность за 2 недели</h2>
                <div className="flex items-center gap-3 text-[12px] text-[var(--color-text-secondary)]">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--chart-1)]" /> Отчёты</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--chart-2)]" /> Закрыто задач</span>
                </div>
              </div>
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.activity} barGap={2} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-border)" />
                    <XAxis
                      dataKey="day"
                      tickFormatter={d => new Date(d + 'T00:00:00').getDate()}
                      tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }}
                      axisLine={false} tickLine={false}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--color-bg-soft)' }}
                      labelFormatter={d => new Date(d + 'T00:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
                      formatter={(v, k) => [v, k === 'reports' ? 'Отчёты' : 'Закрыто задач']}
                      contentStyle={{ borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--color-bg-card)', fontSize: 12 }}
                    />
                    <Bar dataKey="reports" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                    <Bar dataKey="done" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Surface>
          </div>

          {/* Свежие отчёты */}
          <Surface className="p-5">
            <SectionTitle title="Свежие отчёты" href="/team/reports" />
            {data.recent_reports.length === 0 ? (
              <p className="text-[13px] text-[var(--color-text-tertiary)] py-6 text-center">Пока никто не отчитался.</p>
            ) : (
              <ul className="grid md:grid-cols-2 gap-3">
                {data.recent_reports.map(r => (
                  <li key={r.id} className="rounded-2xl bg-[var(--color-bg-soft)] p-4">
                    <div className="flex items-center gap-2.5 mb-2">
                      <Avatar name={r.user_name} src={r.user_avatar} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold truncate">{r.user_name}</div>
                        <div className="text-[11px] text-[var(--color-text-tertiary)] truncate">
                          {r.task_title || 'Без задачи'} · {timeAgo(r.created_at)}
                        </div>
                      </div>
                      {r.task_status === 'done' && <CheckCircle2 size={16} className="text-[var(--color-success)] shrink-0" />}
                    </div>
                    <p className="text-[13px] text-[var(--color-text-secondary)] line-clamp-3 whitespace-pre-line">{r.did}</p>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </div>
      )}
    </div>
  )
}

function SectionTitle({ title, href }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {href && (
        <Link href={href} className="text-[12px] font-medium text-[var(--color-brand)] flex items-center gap-1 hover:gap-1.5 transition-all">
          Все <ArrowRight size={12} />
        </Link>
      )}
    </div>
  )
}

function MiniStat({ icon: Icon, label, value, tone, href }) {
  const body = (
    <>
      <Icon size={15} className={tone === 'warn' ? 'text-[#c97a00]' : 'text-[var(--color-text-tertiary)]'} />
      <div className="mt-2 text-[22px] font-semibold tabular-nums">{value ?? 0}</div>
      <div className="text-[12px] text-[var(--color-text-secondary)]">{label}</div>
    </>
  )
  const cls = 'block rounded-2xl bg-[var(--color-bg-soft)] p-3.5 transition-colors'
  return href
    ? <Link href={href} className={`${cls} hover:bg-[var(--color-border)]/60`}>{body}</Link>
    : <div className={cls}>{body}</div>
}
