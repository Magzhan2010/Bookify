/**
 * Школьная база dls.edu.kz (только чтение). Ключ — в переменной окружения DLS_API_KEY.
 * Данные приходят из школьной Google-таблицы: /tabs — вкладки как строки.
 */
const base = () => (process.env.DLS_API_BASE || 'https://dls.edu.kz/api/v1').replace(/\/+$/, '')

export function schoolApiConfigured() {
  return !!process.env.DLS_API_KEY
}

export async function schoolGet(path) {
  const key = process.env.DLS_API_KEY
  if (!key) throw new Error('Не настроен ключ школьной базы (DLS_API_KEY)')
  const res = await fetch(base() + path, {
    headers: { 'X-API-Key': key, Accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(20000)
  })
  if (res.status === 401 || res.status === 403) throw new Error('Школьная база не приняла ключ')
  if (!res.ok) throw new Error(`Школьная база ответила ошибкой ${res.status}`)
  return res.json()
}

/** Любой формат ответа /tabs → [{ name, rows }] (rows может не быть — тогда догружаем по имени). */
export function normalizeTabs(data) {
  const unwrap = d => (d && !Array.isArray(d) && typeof d === 'object' && (d.tabs || d.data || d.items || d.result)) || d
  const d = unwrap(data)
  if (Array.isArray(d)) {
    return d.map((t, i) => {
      if (typeof t === 'string') return { name: t }
      const name = t.name || t.title || t.tab || t.sheet || `Вкладка ${i + 1}`
      const rows = t.rows || t.values || t.data || t.items
      return { name: String(name), rows: Array.isArray(rows) ? rows : undefined }
    })
  }
  if (d && typeof d === 'object') {
    return Object.entries(d).map(([name, rows]) => ({ name, rows: Array.isArray(rows) ? rows : unwrap(rows) }))
  }
  return []
}

export function rowsOf(data) {
  const d = (data && !Array.isArray(data) && (data.rows || data.values || data.data || data.items || (Array.isArray(data.tabs) && data.tabs[0]?.rows))) || data
  return Array.isArray(d) ? d : []
}

const TEACHER_TAB = /teach|staff|учител|мұғал|педагог|сотрудн|кадр|персонал|faculty|mentor|ментор|куратор/i

export function pickTeacherTab(tabs) {
  return tabs.find(t => TEACHER_TAB.test(t.name)) || null
}

const COLS = {
  name: /^(фио|ф\.?\s?и\.?\s?о\.?|аты[- ]?жөні|толық аты|full\s?name|name|teacher|учитель|мұғалім|сотрудник|педагог)$/i,
  last: /^(фамилия|тегі|surname|last\s?name)$/i,
  first: /^(имя|аты|first\s?name|given\s?name)$/i,
  email: /e-?mail|почта|пошта|mail|логин|login/i,
  subject: /предмет|пән|subject|дисциплин/i,
  className: /^(класс|сынып|class|классный руководитель|сынып жетекшісі|homeroom|куратор)/i,
  phone: /телефон|phone|тел\.?$/i
}

/** Строки вкладки (массивы с заголовком или объекты) → [{ name, email, subject, className }] + найденные колонки. */
export function parseTeacherRows(rows) {
  if (!rows.length) return { headers: [], people: [], mapping: {} }
  let headers, records
  if (Array.isArray(rows[0])) {
    // Заголовок — первая строка, где есть хотя бы одно знакомое название колонки
    let h = rows.findIndex(r => r.some(c => Object.values(COLS).some(re => re.test(String(c || '').trim()))))
    if (h < 0) h = 0
    headers = rows[h].map(c => String(c || '').trim())
    records = rows.slice(h + 1).map(r => Object.fromEntries(headers.map((k, i) => [k || `col${i}`, r[i]])))
  } else {
    records = rows.filter(r => r && typeof r === 'object')
    headers = [...new Set(records.flatMap(r => Object.keys(r)))]
  }
  const find = re => headers.find(k => re.test(String(k).trim()))
  const mapping = {
    name: find(COLS.name), last: find(COLS.last), first: find(COLS.first),
    email: find(COLS.email), subject: find(COLS.subject), className: find(COLS.className)
  }
  // Почта без подписи — колонка, где почти везде есть @
  if (!mapping.email) {
    mapping.email = headers.find(k => {
      const v = records.map(r => String(r[k] || '')).filter(Boolean)
      return v.length > 0 && v.filter(x => /\S+@\S+\.\S+/.test(x)).length / v.length > 0.6
    })
  }
  const str = v => String(v ?? '').trim().replace(/\s+/g, ' ')
  const people = records.map(r => {
    const name = mapping.name ? str(r[mapping.name]) : [str(r[mapping.last]), str(r[mapping.first])].filter(Boolean).join(' ')
    const emailRaw = mapping.email ? str(r[mapping.email]).toLowerCase() : ''
    return {
      name: name.slice(0, 120),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw) ? emailRaw.slice(0, 160) : '',
      subject: mapping.subject ? str(r[mapping.subject]).slice(0, 80) : '',
      className: mapping.className ? str(r[mapping.className]).slice(0, 20) : ''
    }
  }).filter(p => p.name && /\p{L}{2,}/u.test(p.name) && !Object.values(COLS).some(re => re.test(p.name)))
  return { headers, people, mapping }
}
