const fs = require('fs')
const path = require('path')

const p = path.join('C:\\Users\\User\\Documents\\Default Project\\Bookify', 'app', 'librarian', 'page.jsx')
let content = fs.readFileSync(p, 'utf8')

// 1) Импорты
content = content.replace(
  `import {
  BookOpen, BookMarked, ArrowDownToLine, AlertTriangle, Users,
  TrendingUp, Clock
} from 'lucide-react'`,
  `import {
  BookOpen, BookMarked, ArrowDownToLine, AlertTriangle, Users,
  TrendingUp, Clock, PenLine, Star, Check, X, Loader2, Award
} from 'lucide-react'`
)

// 2) Стейты
content = content.replace(
  `export default function LibrarianDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)`,
  `export default function LibrarianDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reviews, setReviews] = useState([])
  const [reviewAction, setReviewAction] = useState(null)
  const [bonusPoints, setBonusPoints] = useState('')
  const [reviewNote, setReviewNote] = useState('')
  const [showReviews, setShowReviews] = useState(false)`
)

// 3) Загрузка отзывов
content = content.replace(
  `  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 60000)
    return () => clearInterval(interval)
  }, [])`,
  `  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/librarian/reviews?status=pending', {
        headers: { Authorization: \`Bearer \${token}\` }
      })
      if (res.ok) setReviews(await res.json())
    } catch (err) {
      console.error(err)
    }
  }

  const handleReviewAction = async (reviewId, action) => {
    setReviewAction(reviewId)
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(\`/api/librarian/reviews/\${reviewId}\`, {
        method: 'PATCH',
        headers: {
          Authorization: \`Bearer \${token}\`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          note: reviewNote || null,
          bonusPoints: parseInt(bonusPoints) || 0
        })
      })
      const data = await res.json()
      if (res.ok) {
        if (action === 'approve') {
          toast.success(\`Отзыв одобрен!\`, {
            description: \`\${data.student_name} +\${data.total_points} баллов (\${data.awarded.map(a => a.reason).join(', ')})\`
          })
        } else {
          toast.success('Отзыв отклонён', { description: 'Ученик может переписать' })
        }
        setBonusPoints('')
        setReviewNote('')
        fetchReviews()
        fetchAnalytics()
      } else {
        toast.error(data.error || 'Ошибка')
      }
    } catch (err) {
      toast.error('Ошибка сети')
    } finally {
      setReviewAction(null)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    fetchReviews()
    const interval = setInterval(fetchAnalytics, 60000)
    return () => clearInterval(interval)
  }, [])`
)

// 4) Секция отзывов — вставляем перед "Последние выдачи"
const marker = `              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Последние выдачи</h3>`

const reviewsSection = `              {/* === НОВЫЕ ОТЗЫВЫ === */}
              <div className="lg:col-span-3 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-[var(--color-brand-soft)] flex items-center justify-center">
                      <PenLine size={17} className="text-[var(--color-brand)]" />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">Новые отзывы</h3>
                      <p className="text-[12px] text-[var(--color-text-tertiary)]">
                        {reviews.length > 0 ? \`\${reviews.length} ждут проверки\` : 'Все отзывы проверены'}
                      </p>
                    </div>
                  </div>
                  {reviews.length > 0 && (
                    <button
                      onClick={() => setShowReviews(!showReviews)}
                      className="px-3.5 py-1.5 rounded-lg bg-[var(--color-brand)] text-white text-[12px] font-medium hover:bg-[var(--color-brand-hover)] transition-colors"
                    >
                      {showReviews ? 'Свернуть' : 'Показать'}
                    </button>
                  )}
                </div>

                {reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 rounded-2xl bg-[var(--color-success)]/10 text-[var(--color-success)] mx-auto mb-2.5 flex items-center justify-center">
                      <Check size={22} />
                    </div>
                    <p className="text-[14px] text-[var(--color-text-primary)] font-medium">Все отзывы проверены</p>
                    <p className="text-[12px] text-[var(--color-text-tertiary)] mt-0.5">
                      Новые отзывы учеников появятся здесь
                    </p>
                  </div>
                ) : showReviews ? (
                  <div className="space-y-4">
                    {reviews.map(r => (
                      <div key={r.id} className="p-4 rounded-2xl bg-[var(--color-bg-soft)] border border-[var(--color-border)]">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-12 shrink-0">
                            <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-[var(--color-bg-card)]">
                              {r.book_cover && (
                                <img src={r.book_cover} className="w-full h-full object-cover" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-[14px] text-[var(--color-text-primary)]">
                                {r.student_name}
                              </span>
                              {r.student_class && (
                                <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-card)] border border-[var(--color-border)] text-[10px] font-medium text-[var(--color-text-secondary)]">
                                  {r.student_class}
                                </span>
                              )}
                              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                                {new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                              </span>
                            </div>
                            <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                              {r.book_title}
                            </div>
                            <div className="text-[11px] text-[var(--color-text-tertiary)] mb-1.5">
                              {r.book_author}
                              {r.book_pages ? \` · \${r.book_pages} стр.\` : ''}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] text-[#ff9500]">
                                {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                              </span>
                              <span className="text-[11px] text-[var(--color-text-tertiary)]">
                                у ученика {r.user_points_total} баллов
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] mb-3">
                          <p className="text-[14px] text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                            {r.content}
                          </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="flex-1 flex flex-col sm:flex-row gap-2">
                            <input
                              type="number"
                              placeholder="Бонус (0, 10, 20)"
                              value={bonusPoints}
                              onChange={e => setBonusPoints(e.target.value)}
                              className="w-full sm:w-32 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-[var(--color-brand)]"
                            />
                            <input
                              type="text"
                              placeholder="Заметка (видео / TEDx / причина)"
                              value={reviewNote}
                              onChange={e => setReviewNote(e.target.value)}
                              className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-2.5 py-2 text-[12px] outline-none focus:border-[var(--color-brand)]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReviewAction(r.id, 'reject')}
                              disabled={reviewAction === r.id}
                              className="px-3.5 py-2 rounded-lg bg-[var(--color-danger)]/10 text-[var(--color-danger)] text-[12px] font-medium hover:bg-[var(--color-danger)]/15 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <X size={13} /> Отклонить
                            </button>
                            <button
                              onClick={() => handleReviewAction(r.id, 'approve')}
                              disabled={reviewAction === r.id}
                              className="px-3.5 py-2 rounded-lg bg-[var(--color-success)] text-white text-[12px] font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {reviewAction === r.id ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <>
                                  <Award size={13} /> Одобрить
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

${marker}`

if (content.includes(marker)) {
  content = content.replace(marker, reviewsSection)
  console.log('+ Reviews section inserted')
} else {
  console.log('MARKER NOT FOUND')
}

fs.writeFileSync(p, content)
console.log('✅ librarian dashboard updated')