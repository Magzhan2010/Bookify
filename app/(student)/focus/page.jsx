'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import {
  Play, Pause, RotateCcw, SkipForward, Maximize2, Minimize2, CircleDot, Timer, Columns2,
  BookOpen, PenLine, Check, Minus, Plus, Flame, Clock, CalendarDays, Target, Volume2, VolumeX, Coffee
} from 'lucide-react'
import { RingTimer, DigitsTimer, ScoreboardTimer, PHASE_COLORS, fmt } from '../../../components/focus/Timers'
import { useT } from '../../../lib/i18n'

/* ------------------------------------------------------------------ */
/* Настройки и состояние (живут в браузере, переживают перезагрузку)    */
/* ------------------------------------------------------------------ */
const KEY = 'bookify-focus-v1'
const DEFAULTS = { focus: 25, short: 5, long: 15, rounds: 4, autoBreak: true, sound: true, design: 'ring' }
const PRESETS = [
  { name: 'Классика', focus: 25, short: 5, long: 15 },
  { name: 'Глубокое чтение', focus: 50, short: 10, long: 20 },
  { name: 'Разминка', focus: 15, short: 3, long: 10 }
]
const DESIGNS = [
  { key: 'ring', label: 'Круг', icon: CircleDot },
  { key: 'digits', label: 'Цифры', icon: Timer },
  { key: 'board', label: 'Табло', icon: Columns2 }
]
const PHASES = [
  { key: 'focus', label: 'Фокус' },
  { key: 'short', label: 'Перерыв' },
  { key: 'long', label: 'Длинный перерыв' }
]
const BG = {
  focus: ['#1f2a5c', '#0b1030', '#ffc93c', '#1a56db'],
  short: ['#0f3d3a', '#06201f', '#5eead4', '#22c55e'],
  long: ['#24215c', '#0d0b2c', '#93c5fd', '#a78bfa']
}

const loadSaved = () => {
  try { return JSON.parse(localStorage.getItem(KEY) || 'null') } catch { return null }
}
const save = data => { try { localStorage.setItem(KEY, JSON.stringify(data)) } catch {} }

const authed = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}`, ...(opts.body ? { 'Content-Type': 'application/json' } : {}) }
  })

/** Мягкий колокольчик через Web Audio — без файлов */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    ;[660, 880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator()
      const g = ctx.createGain()
      o.type = 'sine'
      o.frequency.value = f
      const t = ctx.currentTime + i * 0.18
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.18, t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1)
      o.connect(g).connect(ctx.destination)
      o.start(t)
      o.stop(t + 1.2)
    })
    setTimeout(() => ctx.close(), 2000)
  } catch {}
}

const minutesText = (m, t) => {
  const h = Math.floor(m / 60)
  const r = m % 60
  return h ? (r ? t('{h} ч {m} мин', { h, m: r }) : t('{h} ч', { h })) : t('{m} мин', { m })
}

export default function FocusPage() {
  const { t } = useT()
  const still = useReducedMotion()
  const [ready, setReady] = useState(false)
  const [settings, setSettings] = useState(DEFAULTS)
  const [timer, setTimer] = useState({ phase: 'focus', running: false, endAt: null, remaining: DEFAULTS.focus * 60, total: DEFAULTS.focus * 60, round: 1 })
  const [target, setTarget] = useState(null) // { bookId, title, author, cover } | { custom: true, title }
  const [data, setData] = useState(null)
  const [denied, setDenied] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [fs, setFs] = useState(false)
  const heroRef = useRef(null)
  const pickerRef = useRef(null)
  const completing = useRef(false)

  /* ---------- загрузка ---------- */
  const loadData = useCallback(async () => {
    try {
      const r = await authed('/api/focus')
      if (r.status === 403) { setDenied(true); return }
      if (r.ok) setData(await r.json())
    } catch {}
  }, [])

  useEffect(() => {
    const s = loadSaved()
    if (s) {
      if (s.settings) setSettings({ ...DEFAULTS, ...s.settings })
      if (s.timer) setTimer(s.timer)
      if (s.target) setTarget(s.target)
    }
    setReady(true)
    loadData()
  }, [loadData])

  useEffect(() => { if (ready) save({ settings, timer, target }) }, [ready, settings, timer, target])

  /* ---------- тикание ---------- */
  useEffect(() => {
    if (!timer.running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timer.running])

  const remaining = timer.running ? Math.max(0, Math.ceil((timer.endAt - now) / 1000)) : timer.remaining
  const phaseLen = p => settings[p] * 60

  /* ---------- запись отрезка фокуса ---------- */
  const record = useCallback(async (minutes, completed) => {
    if (!target || minutes < 1) return
    try {
      const r = await authed('/api/focus', {
        method: 'POST',
        body: JSON.stringify({ bookId: target.bookId, customTitle: target.custom ? target.title : undefined, minutes, completed })
      })
      if (r.ok) loadData()
    } catch {}
  }, [target, loadData])

  const nextPhase = (phase, round) => {
    if (phase === 'focus') return { phase: round % settings.rounds === 0 ? 'long' : 'short', round }
    return { phase: 'focus', round: phase === 'long' ? 1 : round + 1 }
  }

  /* ---------- конец отрезка ---------- */
  useEffect(() => {
    if (!timer.running || remaining > 0 || completing.current) return
    completing.current = true
    const finished = timer.phase
    if (finished === 'focus') record(Math.round(timer.total / 60), true)
    if (settings.sound) chime()
    const n = nextPhase(finished, timer.round)
    const total = phaseLen(n.phase)
    const autostart = finished === 'focus' && settings.autoBreak
    setTimer({ phase: n.phase, round: n.round, total, remaining: total, running: autostart, endAt: autostart ? Date.now() + total * 1000 : null })
    const msg = finished === 'focus' ? t('Отлично! Отрезок фокуса засчитан — время отдохнуть') : t('Перерыв окончен — возвращаемся к книге')
    toast.success(msg)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) {
      try { new Notification('Bookify · Фокус', { body: msg, icon: '/lb_logo.png' }) } catch {}
    }
    setTimeout(() => { completing.current = false }, 500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, timer.running])

  /* ---------- управление ---------- */
  const elapsed = timer.total - remaining

  const start = () => {
    if (timer.phase === 'focus' && !target) {
      toast(t('Сначала выбери книгу, на которой концентрируешься'))
      pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    setNow(Date.now())
    setTimer(x => ({ ...x, running: true, endAt: Date.now() + x.remaining * 1000 }))
  }
  const pause = () => setTimer(x => ({ ...x, running: false, endAt: null, remaining }))
  const toggle = () => (timer.running ? pause() : start())

  const savePartial = () => {
    if (timer.phase === 'focus' && elapsed >= 60) record(Math.floor(elapsed / 60), false)
  }
  const reset = () => {
    savePartial()
    setTimer(x => ({ ...x, running: false, endAt: null, remaining: x.total }))
  }
  const skip = () => {
    savePartial()
    const n = nextPhase(timer.phase, timer.round)
    const total = phaseLen(n.phase)
    setTimer({ phase: n.phase, round: n.round, total, remaining: total, running: false, endAt: null })
  }
  const choosePhase = phase => {
    if (timer.running) return
    const total = phaseLen(phase)
    setTimer(x => ({ ...x, phase, total, remaining: total }))
  }

  const updateSettings = patch => {
    setSettings(s => {
      const next = { ...s, ...patch }
      // Если таймер не трогали — сразу подстраиваем длительность
      if (!timer.running && timer.remaining === timer.total) {
        const total = next[timer.phase] * 60
        setTimer(x => ({ ...x, total, remaining: total }))
      }
      return next
    })
  }

  /* ---------- пробел = старт/пауза, заголовок вкладки ---------- */
  useEffect(() => {
    const onKey = e => {
      if (e.code !== 'Space' || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(e.target.tagName)) return
      e.preventDefault()
      toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  useEffect(() => {
    const prev = document.title
    return () => { document.title = prev }
  }, [])
  useEffect(() => {
    document.title = timer.running ? `${fmt(remaining)} · ${t(PHASES.find(p => p.key === timer.phase).label)}` : 'Bookify — Фокус'
  }, [remaining, timer.running, timer.phase, t])

  /* ---------- полный экран ---------- */
  useEffect(() => {
    const on = () => setFs(document.fullscreenElement === heroRef.current)
    document.addEventListener('fullscreenchange', on)
    return () => document.removeEventListener('fullscreenchange', on)
  }, [])
  const toggleFs = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else heroRef.current?.requestFullscreen?.().catch(() => {})
  }

  const label = t(PHASES.find(p => p.key === timer.phase).label)
  const bg = BG[timer.phase]
  const c = PHASE_COLORS[timer.phase]
  const TimerView = settings.design === 'digits' ? DigitsTimer : settings.design === 'board' ? ScoreboardTimer : RingTimer

  if (denied) {
    return (
      <main className="max-w-[700px] mx-auto px-4 py-24 text-center text-[var(--color-text-secondary)]">
        {t('Фокус доступен ученикам и учителям.')}
      </main>
    )
  }

  return (
    <main className="max-w-[1180px] mx-auto px-4 sm:px-6 py-6 sm:py-10">
      <motion.header
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="mb-6 sm:mb-8 flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <div className="text-[13px] font-semibold text-[var(--color-brand)] mb-2">{t('Фокус')}</div>
          <h1 className="text-[34px] sm:text-[52px] font-semibold tracking-[-0.03em] leading-[1.02]">
            {t('Одна книга.')}<br className="sm:hidden" /> {t('Полное внимание.')}
          </h1>
        </div>
        {data && (
          <div className="flex items-center gap-2 text-[14px] text-[var(--color-text-secondary)]">
            <Flame size={18} className="text-[#ff6b2c]" />
            {t('Сегодня')}: <b className="text-[var(--color-text-primary)] tabular-nums">{minutesText(data.stats.today, t)}</b>
          </div>
        )}
      </motion.header>

      {/* ================= Главная сцена ================= */}
      <section
        ref={heroRef}
        className={`relative overflow-hidden text-white isolate ${fs ? 'w-screen h-screen rounded-none flex flex-col' : 'rounded-[32px] sm:rounded-[40px] min-h-[640px] flex flex-col'}`}
        style={{ background: `radial-gradient(120% 90% at 50% 0%, ${bg[0]} 0%, ${bg[1]} 70%)`, transition: 'background 1.2s ease' }}
      >
        {/* живые пятна света */}
        <motion.div
          aria-hidden
          className="absolute -z-10 w-[520px] h-[520px] rounded-full blur-[110px] opacity-40"
          style={{ background: bg[2], top: '-18%', left: '-10%' }}
          animate={still ? undefined : { x: [0, 80, 0], y: [0, 40, 0], scale: timer.running ? [1, 1.15, 1] : 1 }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="absolute -z-10 w-[460px] h-[460px] rounded-full blur-[120px] opacity-35"
          style={{ background: bg[3], bottom: '-20%', right: '-8%' }}
          animate={still ? undefined : { x: [0, -70, 0], y: [0, -30, 0] }}
          transition={{ duration: 19, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.06]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 45%, #000 0%, transparent 70%)' }} />

        {/* верхняя панель */}
        <div className="relative flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
          <div className="flex p-1 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md">
            {PHASES.map(p => {
              const active = p.key === timer.phase
              return (
                <button
                  key={p.key}
                  onClick={() => choosePhase(p.key)}
                  disabled={timer.running && !active}
                  className={`relative px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-semibold transition-colors disabled:opacity-40 ${active ? 'text-[#0b1030]' : 'text-white/70 hover:text-white'}`}
                >
                  {active && <motion.span layoutId="phase-pill" className="absolute inset-0 rounded-full" style={{ background: c.a }} transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                  <span className="relative">{t(p.label)}</span>
                </button>
              )
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex p-1 rounded-full bg-white/[0.07] border border-white/10 backdrop-blur-md">
              {DESIGNS.map(d => {
                const Icon = d.icon
                const active = settings.design === d.key
                return (
                  <button
                    key={d.key}
                    onClick={() => updateSettings({ design: d.key })}
                    title={t(d.label)}
                    aria-label={t(d.label)}
                    className={`relative h-8 px-2.5 rounded-full inline-flex items-center gap-1.5 text-[12px] font-semibold transition-colors ${active ? 'text-[#0b1030]' : 'text-white/70 hover:text-white'}`}
                  >
                    {active && <motion.span layoutId="design-pill" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
                    <Icon size={15} className="relative" />
                    <span className="relative hidden sm:inline">{t(d.label)}</span>
                  </button>
                )
              })}
            </div>
            <GlassBtn onClick={() => updateSettings({ sound: !settings.sound })} label={settings.sound ? t('Звук включён') : t('Звук выключен')}>
              {settings.sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </GlassBtn>
            <GlassBtn onClick={toggleFs} label={fs ? t('Выйти из полного экрана') : t('Полный экран')}>
              {fs ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </GlassBtn>
          </div>
        </div>

        {/* таймер */}
        <div className="relative flex-1 flex flex-col items-center justify-center px-4 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={settings.design}
              initial={{ opacity: 0, scale: 0.94, filter: 'blur(8px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 1.04, filter: 'blur(8px)' }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex justify-center w-full"
            >
              {ready && <TimerView remaining={remaining} total={timer.total} phase={timer.phase} label={label} />}
            </motion.div>
          </AnimatePresence>

          {/* на чём концентрируемся */}
          <button
            onClick={() => pickerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            className="mt-7 max-w-full inline-flex items-center gap-3 pl-1.5 pr-4 py-1.5 rounded-full bg-white/[0.08] border border-white/10 backdrop-blur-md hover:bg-white/[0.12] transition-colors"
          >
            {timer.phase !== 'focus' ? (
              <><span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><Coffee size={15} /></span>
                <span className="text-[14px] text-white/80">{t('Отдохни: встань, попей воды, посмотри вдаль')}</span></>
            ) : target ? (
              <>
                <BookThumb cover={target.cover} title={target.title} size={32} />
                <span className="text-[14px] truncate"><span className="text-white/55">{t('Читаю')}: </span>{target.title}</span>
              </>
            ) : (
              <><span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"><BookOpen size={15} /></span>
                <span className="text-[14px] text-white/80">{t('Выбери книгу, чтобы начать')}</span></>
            )}
          </button>

          {/* кнопки */}
          <div className="mt-7 flex items-center gap-5 sm:gap-7">
            <GlassBtn big onClick={reset} label={t('Сначала')}><RotateCcw size={20} /></GlassBtn>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={toggle}
              aria-label={timer.running ? t('Пауза') : t('Концентрироваться')}
              className="relative h-[84px] px-8 sm:px-10 rounded-full font-semibold text-[17px] text-[#0b1030] inline-flex items-center gap-2.5"
              style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})`, boxShadow: `0 18px 50px -10px ${c.soft}` }}
            >
              {timer.running && !still && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full"
                  style={{ border: `2px solid ${c.a}` }}
                  animate={{ scale: [1, 1.18], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              {timer.running ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
              <span>{timer.running ? t('Пауза') : timer.phase === 'focus' ? (elapsed > 0 ? t('Продолжить') : t('Концентрироваться')) : t('Начать перерыв')}</span>
            </motion.button>
            <GlassBtn big onClick={skip} label={t('Пропустить')}><SkipForward size={20} /></GlassBtn>
          </div>

          {/* раунды */}
          <div className="mt-7 flex items-center gap-3 text-[12px] text-white/55">
            <div className="flex gap-1.5">
              {Array.from({ length: settings.rounds }, (_, i) => {
                const doneRound = i + 1 < timer.round || (i + 1 === timer.round && timer.phase !== 'focus')
                const current = i + 1 === timer.round && timer.phase === 'focus'
                return (
                  <span key={i} className="h-2 rounded-full transition-all duration-500"
                    style={{ width: current ? 22 : 8, background: doneRound ? c.a : current ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.18)' }} />
                )
              })}
            </div>
            <span className="tabular-nums">{t('Раунд {n} из {m}', { n: Math.min(timer.round, settings.rounds), m: settings.rounds })}</span>
            <span className="hidden sm:inline">· {t('Пробел — старт и пауза')}</span>
          </div>
        </div>
      </section>

      {/* ================= Книга и время ================= */}
      <div className="mt-6 grid lg:grid-cols-[1.35fr_1fr] gap-6">
        <section ref={pickerRef} className="apple-card p-5 sm:p-7">
          <SectionTitle icon={Target} title={t('На чём концентрируемся')} hint={t('Книга, которую читаешь сейчас')} />
          <BookPicker data={data} target={target} setTarget={setTarget} locked={timer.running && timer.phase === 'focus'} t={t} />
        </section>

        <section className="apple-card p-5 sm:p-7">
          <SectionTitle icon={Clock} title={t('Время')} hint={timer.running ? t('Изменения — со следующего отрезка') : null} />
          <div className="flex flex-wrap gap-2 mb-6">
            {PRESETS.map(p => {
              const active = settings.focus === p.focus && settings.short === p.short && settings.long === p.long
              return (
                <button key={p.name} onClick={() => updateSettings({ focus: p.focus, short: p.short, long: p.long })}
                  className={`px-3.5 py-2 rounded-2xl text-left transition-colors border ${active ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)] border-transparent' : 'bg-[var(--color-bg-soft)] border-transparent hover:border-[var(--color-border-strong)]'}`}>
                  <div className="text-[13px] font-semibold">{t(p.name)}</div>
                  <div className={`text-[11px] tabular-nums ${active ? 'opacity-70' : 'text-[var(--color-text-tertiary)]'}`}>{p.focus} / {p.short} / {p.long} {t('мин')}</div>
                </button>
              )
            })}
          </div>
          <div className="space-y-1">
            <Stepper label={t('Фокус')} value={settings.focus} unit={t('мин')} min={5} max={90} step={5} onChange={v => updateSettings({ focus: v })} color={PHASE_COLORS.focus.a} />
            <Stepper label={t('Перерыв')} value={settings.short} unit={t('мин')} min={1} max={30} step={1} onChange={v => updateSettings({ short: v })} color={PHASE_COLORS.short.a} />
            <Stepper label={t('Длинный перерыв')} value={settings.long} unit={t('мин')} min={5} max={45} step={5} onChange={v => updateSettings({ long: v })} color={PHASE_COLORS.long.a} />
            <Stepper label={t('Раундов до длинного')} value={settings.rounds} min={2} max={8} step={1} onChange={v => updateSettings({ rounds: v })} />
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 py-2 cursor-pointer">
            <span className="text-[14px]">{t('Перерыв начинается сам')}</span>
            <Switch on={settings.autoBreak} onChange={v => updateSettings({ autoBreak: v })} />
          </label>
        </section>
      </div>

      {/* ================= Статистика ================= */}
      <Stats data={data} t={t} />
    </main>
  )
}

/* ------------------------------------------------------------------ */
function GlassBtn({ children, onClick, label, big }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`${big ? 'w-14 h-14' : 'w-10 h-10'} rounded-full inline-flex items-center justify-center bg-white/[0.08] border border-white/10 backdrop-blur-md text-white/85 hover:text-white hover:bg-white/[0.14] active:scale-95 transition-all`}
    >
      {children}
    </button>
  )
}

function SectionTitle({ icon: Icon, title, hint }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="w-9 h-9 rounded-xl bg-[var(--color-brand-soft)] text-[var(--color-brand)] flex items-center justify-center"><Icon size={18} /></span>
      <div className="min-w-0">
        <h2 className="text-[19px] font-semibold tracking-tight leading-tight">{title}</h2>
        {hint && <div className="text-[12px] text-[var(--color-text-tertiary)]">{hint}</div>}
      </div>
    </div>
  )
}

function BookThumb({ cover, title, size = 40 }) {
  if (cover) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={cover} alt="" className="rounded-md object-cover shrink-0 bg-white/10" style={{ width: size * 0.72, height: size }} />
  }
  return (
    <span className="rounded-md shrink-0 flex items-center justify-center font-bold text-[#1f2a5c]"
      style={{ width: size * 0.72, height: size, background: '#ffc93c', fontSize: size * 0.4 }}>
      {String(title || '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}

function BookPicker({ data, target, setTarget, locked, t }) {
  const [mode, setMode] = useState(target?.custom ? 'own' : 'library')
  const [own, setOwn] = useState(target?.custom ? target.title : '')
  useEffect(() => { if (target?.custom) { setMode('own'); setOwn(target.title) } }, [target])

  if (!data) return <div className="h-40 rounded-2xl bg-[var(--color-bg-soft)] animate-pulse" />

  const pickOwn = title => {
    const v = String(title || '').trim()
    if (v.length < 2) return toast(t('Напиши название книги'))
    setTarget({ custom: true, title: v.slice(0, 160) })
    toast.success(t('Книга выбрана'))
  }

  return (
    <div className={locked ? 'opacity-60 pointer-events-none' : ''}>
      <div className="inline-flex p-1 rounded-xl bg-[var(--color-bg-soft)] mb-4">
        {[{ k: 'library', l: 'Из библиотеки', i: BookOpen }, { k: 'own', l: 'Своя книга', i: PenLine }].map(o => (
          <button key={o.k} onClick={() => setMode(o.k)}
            className={`relative px-3.5 py-1.5 rounded-lg text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors ${mode === o.k ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
            {mode === o.k && <motion.span layoutId="pick-mode" className="absolute inset-0 rounded-lg bg-[var(--color-bg-card)] shadow-[0_1px_3px_rgba(0,0,0,0.08)]" />}
            <o.i size={14} className="relative" /><span className="relative">{t(o.l)}</span>
          </button>
        ))}
      </div>

      {mode === 'library' ? (
        data.books.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border-strong)] p-6 text-center text-[14px] text-[var(--color-text-tertiary)]">
            {t('Сейчас у тебя нет книг из библиотеки. Возьми книгу или выбери «Своя книга».')}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {data.books.map(b => {
              const active = target && !target.custom && target.bookId === b.book_id
              return (
                <motion.button
                  key={b.book_id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setTarget({ bookId: b.book_id, title: b.title, author: b.author, cover: b.cover_url })}
                  className={`relative flex items-center gap-3 p-2.5 pr-9 rounded-2xl text-left border transition-colors ${active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'}`}
                >
                  <BookThumb cover={b.cover_url} title={b.title} size={52} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold leading-snug line-clamp-2">{b.title}</span>
                    {b.author && <span className="block text-[12px] text-[var(--color-text-tertiary)] truncate">{b.author}</span>}
                  </span>
                  {active && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[var(--color-brand)] text-white flex items-center justify-center">
                      <Check size={14} strokeWidth={3} />
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )
      ) : (
        <div>
          <form onSubmit={e => { e.preventDefault(); pickOwn(own) }} className="flex gap-2">
            <input
              value={own}
              onChange={e => setOwn(e.target.value)}
              placeholder={t('Название книги и автор')}
              maxLength={160}
              className="flex-1 min-w-0 px-4 py-3 rounded-xl bg-[var(--color-bg-soft)] border border-transparent focus:border-[var(--color-brand)]/40 focus:bg-[var(--color-bg-card)] outline-none text-[15px]"
            />
            <button type="submit" className="px-4 rounded-xl bg-[var(--color-brand)] text-white text-[14px] font-semibold hover:bg-[var(--color-brand-hover)] transition-colors">
              {t('Выбрать')}
            </button>
          </form>
          {data.custom.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {data.custom.map(title => {
                const active = target?.custom && target.title === title
                return (
                  <button key={title} onClick={() => { setOwn(title); pickOwn(title) }}
                    className={`px-3 py-1.5 rounded-full text-[13px] font-medium transition-colors ${active ? 'bg-[var(--color-text-primary)] text-[var(--color-bg-card)]' : 'bg-[var(--color-bg-soft)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                    {title}
                  </button>
                )
              })}
            </div>
          )}
          {target?.custom && (
            <div className="mt-4 flex items-center gap-2 text-[13px] text-[var(--color-success)]">
              <Check size={15} /> {t('Читаю')}: <b>{target.title}</b>
            </div>
          )}
        </div>
      )}
      {locked && <p className="mt-3 text-[12px] text-[var(--color-text-tertiary)]">{t('Книгу можно сменить на паузе')}</p>}
    </div>
  )
}

function Stepper({ label, value, unit, min, max, step, onChange, color }) {
  const set = v => onChange(Math.min(max, Math.max(min, v)))
  return (
    <div className="flex items-center gap-3 py-2">
      {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span className="flex-1 text-[14px]">{label}</span>
      <div className="flex items-center gap-1 rounded-xl bg-[var(--color-bg-soft)] p-1">
        <button onClick={() => set(value - step)} disabled={value <= min} aria-label="−"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-card)] disabled:opacity-30 transition-colors"><Minus size={15} /></button>
        <span className="w-[64px] text-center text-[15px] font-semibold tabular-nums">{value}{unit ? <span className="text-[12px] font-normal text-[var(--color-text-tertiary)]"> {unit}</span> : null}</span>
        <button onClick={() => set(value + step)} disabled={value >= max} aria-label="+"
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-bg-card)] disabled:opacity-30 transition-colors"><Plus size={15} /></button>
      </div>
    </div>
  )
}

function Switch({ on, onChange }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => onChange(!on)}
      className={`relative w-[46px] h-[28px] rounded-full transition-colors ${on ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border-strong)]'}`}>
      <motion.span layout transition={{ type: 'spring', stiffness: 600, damping: 36 }}
        className="absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow" style={{ left: on ? 21 : 3 }} />
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Статистика                                                          */
/* ------------------------------------------------------------------ */
const WEEKDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

function Stats({ data, t }) {
  const max = useMemo(() => Math.max(30, ...(data?.last7 || []).map(d => d.minutes)), [data])
  if (!data) return <div className="mt-6 h-64 rounded-[28px] bg-[var(--color-bg-soft)] animate-pulse" />
  const s = data.stats
  const tiles = [
    { icon: Clock, label: t('Сегодня'), value: minutesText(s.today, t), sub: t('{n} отрезков', { n: s.today_sessions }) },
    { icon: CalendarDays, label: t('За 7 дней'), value: minutesText(s.week, t) },
    { icon: Flame, label: t('Серия'), value: t('{n} дн.', { n: s.streak }), sub: s.streak ? t('не прерывай!') : t('начни сегодня') },
    { icon: Target, label: t('Всего отрезков'), value: s.sessions, sub: minutesText(s.total, t) }
  ]
  const todayIso = data.last7[data.last7.length - 1]?.day

  return (
    <section className="mt-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {tiles.map((x, i) => (
          <motion.div key={x.label} initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            transition={{ delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="apple-card p-5">
            <div className="flex items-center gap-2 text-[12px] font-medium text-[var(--color-text-tertiary)]"><x.icon size={14} /> {x.label}</div>
            <div className="mt-2 text-[26px] sm:text-[30px] font-semibold tracking-tight tabular-nums leading-none">{x.value}</div>
            {x.sub && <div className="mt-1.5 text-[12px] text-[var(--color-text-tertiary)]">{x.sub}</div>}
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-[1.35fr_1fr] gap-6">
        <div className="apple-card p-5 sm:p-7">
          <SectionTitle icon={CalendarDays} title={t('Последние 7 дней')} hint={t('Минуты фокуса по дням')} />
          <div className="flex items-end gap-2 sm:gap-3 h-[180px]">
            {data.last7.map((d, i) => {
              const h = d.minutes ? Math.max(6, (d.minutes / max) * 150) : 4
              const isToday = d.day === todayIso
              return (
                <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
                  <span className="text-[11px] font-semibold tabular-nums text-[var(--color-text-secondary)]">{d.minutes || ''}</span>
                  <motion.div
                    initial={{ height: 0 }} whileInView={{ height: h }} viewport={{ once: true }}
                    transition={{ delay: i * 0.05, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full max-w-[44px] rounded-[10px]"
                    style={{ background: d.minutes ? (isToday ? 'linear-gradient(180deg,#ffc93c,#ff9f43)' : 'linear-gradient(180deg,#5b8def,#1a56db)') : 'var(--color-bg-soft)' }}
                  />
                  <span className={`text-[11px] ${isToday ? 'font-semibold text-[var(--color-text-primary)]' : 'text-[var(--color-text-tertiary)]'}`}>
                    {t(WEEKDAYS[new Date(d.day + 'T12:00:00').getDay()])}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="apple-card p-5 sm:p-7">
          <SectionTitle icon={BookOpen} title={t('Книги в фокусе')} />
          {data.by_book.length === 0 ? (
            <p className="text-[14px] text-[var(--color-text-tertiary)] py-6 text-center">{t('Здесь появятся книги, над которыми ты сосредотачивался.')}</p>
          ) : (
            <ul className="space-y-3.5">
              {data.by_book.map((b, i) => (
                <li key={b.title + i} className="flex items-center gap-3">
                  <BookThumb cover={b.cover_url} title={b.title} size={44} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[14px] font-semibold truncate">{b.title}</span>
                      <span className="text-[12px] text-[var(--color-text-secondary)] tabular-nums shrink-0">{minutesText(b.minutes, t)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-[var(--color-bg-soft)] overflow-hidden">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${(b.minutes / data.by_book[0].minutes) * 100}%` }} viewport={{ once: true }}
                        transition={{ duration: 0.8, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                        className="h-full rounded-full bg-[var(--color-brand)]" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
