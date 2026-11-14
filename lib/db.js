import { Pool } from 'pg'

// Пул переживает «тёплые» вызовы serverless-функции. Небольшой max — у Neon
// лимит соединений; idle-соединения закрываем, чтобы не держать их зря.
const pool = global.__bookifyPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : false,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000
})
if (process.env.NODE_ENV !== 'production') global.__bookifyPool = pool

/**
 * Версия схемы. Увеличивай при добавлении миграций: тогда при следующем
 * запуске они накатятся один раз. Если версия в БД совпадает — миграции
 * не выполняются вовсе (раньше ~25 запросов шли при каждом холодном старте).
 */
const SCHEMA_VERSION = 15

let schemaEnsured = false

/**
 * Идемпотентные миграции для БД, созданных до этих изменений.
 * CREATE TABLE IF NOT EXISTS из schema.sql не добавляет новые колонки
 * в уже существующие таблицы, поэтому колонки накатываются отдельно.
 * Каждая миграция должна быть безопасна к многократному запуску.
 */
const MIGRATIONS = [
  // Архив книг вместо физического удаления (история выдач не должна пропадать)
  `ALTER TABLE books ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`,
  `CREATE INDEX IF NOT EXISTS idx_books_archived ON books(archived_at)`,
  // Оценки книг учениками (1-5)
  `CREATE TABLE IF NOT EXISTS book_ratings (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     value INT NOT NULL CHECK (value BETWEEN 1 AND 5),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (user_id, book_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_ratings_book ON book_ratings(book_id)`,
  // Версия токена: смена пароля увеличивает её и обнуляет все старые сессии
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0`,
  // === Программа «Читай книги. Копи баллы. Получай призы.» ===
  // Статусы займа: active → returned → reviewed (отзыв написан) → approved (отзыв принят)
  `ALTER TABLE borrows DROP CONSTRAINT IF EXISTS borrows_status_check`,
  `ALTER TABLE borrows ADD CONSTRAINT borrows_status_check
     CHECK (status IN ('active','returned','reviewed','approved','cancelled'))`,
  // Отзывы учеников о прочитанных книгах (один отзыв на заём)
  `CREATE TABLE IF NOT EXISTS book_reviews (
     id SERIAL PRIMARY KEY,
     borrow_id INT NOT NULL REFERENCES borrows(id) ON DELETE CASCADE,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
     content TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending','approved','rejected')),
     reviewed_by INT REFERENCES users(id),
     reviewed_at TIMESTAMPTZ,
     review_note TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     UNIQUE (borrow_id)
   )`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_status ON book_reviews(status)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_user ON book_reviews(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_book ON book_reviews(book_id)`,
  // Баллы: история начислений и трат
  `CREATE TABLE IF NOT EXISTS user_points (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     points INT NOT NULL DEFAULT 0,
     reason TEXT NOT NULL,
     description TEXT,
     borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
     book_id INT REFERENCES books(id) ON DELETE SET NULL,
     spent BOOLEAN NOT NULL DEFAULT FALSE,
     created_by INT REFERENCES users(id),
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_points_user ON user_points(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_points_created ON user_points(created_at DESC)`,
  // Справочник правил начисления
  `CREATE TABLE IF NOT EXISTS point_rules (
     id SERIAL PRIMARY KEY,
     code TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     points INT NOT NULL,
     description TEXT
   )`,
  `INSERT INTO point_rules (code, title, points, description) VALUES
     ('pages_100_200', '100-200 страниц', 5, 'Прочитал книгу объёмом 100-200 страниц'),
     ('pages_201_300', '201-300 страниц', 10, 'Прочитал книгу объёмом 201-300 страниц'),
     ('pages_301_400', '301-400 страниц', 15, 'Прочитал книгу объёмом 301-400 страниц'),
     ('pages_500_plus', '500+ страниц', 20, 'Прочитал книгу объёмом 500+ страниц'),
     ('review', 'Написать отзыв', 5, 'Покажи, как ты понял книгу'),
     ('video', 'Сняться в видео', 10, 'Поделись книгой на камеру'),
     ('tedx', 'Выступить на TEDx', 20, 'Самый большой бонус')
   ON CONFLICT (code) DO NOTHING`,
  // Правила из постера программы (401–500 = 20, 500+ = 25, TEDx = 15)
  `INSERT INTO point_rules (code, title, points, description) VALUES
     ('pages_100_200', '100-200 страниц', 5, 'Прочитал книгу объёмом 100-200 страниц'),
     ('pages_201_300', '201-300 страниц', 10, 'Прочитал книгу объёмом 201-300 страниц'),
     ('pages_301_400', '301-400 страниц', 15, 'Прочитал книгу объёмом 301-400 страниц'),
     ('pages_401_500', '401-500 страниц', 20, 'Прочитал книгу объёмом 401-500 страниц'),
     ('pages_500_plus', '500+ страниц', 25, 'Прочитал книгу объёмом больше 500 страниц'),
     ('review', 'Написал отзыв о книге', 5, 'Покажи, как ты понял книгу'),
     ('video', 'Снял видео с рассказом о книге', 10, 'Поделись книгой на камеру'),
     ('tedx', 'Выступил на TEDx', 15, 'Самый большой бонус')
   ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, points = EXCLUDED.points,
     description = EXCLUDED.description`,
  // Магазин призов
  `CREATE TABLE IF NOT EXISTS prizes (
     id SERIAL PRIMARY KEY,
     code TEXT UNIQUE NOT NULL,
     title TEXT NOT NULL,
     description TEXT,
     price INT NOT NULL CHECK (price > 0),
     image TEXT,
     sort INT NOT NULL DEFAULT 0,
     needs_note BOOLEAN NOT NULL DEFAULT FALSE,
     active BOOLEAN NOT NULL DEFAULT TRUE,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `INSERT INTO prizes (code, title, description, price, image, sort, needs_note) VALUES
     ('bookmark', 'Закладка', 'Фирменная закладка Divergents', 20, '/prizes/bookmark.svg', 1, FALSE),
     ('highlighter', 'Текстовыделитель', 'Яркий маркер для любимых цитат', 50, '/prizes/highlighter.svg', 2, FALSE),
     ('pen', 'Ручка', 'Ручка с логотипом школы', 120, '/prizes/pen.svg', 3, FALSE),
     ('notebook', 'Блокнот', 'Блокнот для мыслей и конспектов', 150, '/prizes/notebook.svg', 4, FALSE),
     ('mug', 'Термокружка', 'Термокружка Divergents', 200, '/prizes/mug.svg', 5, FALSE),
     ('wishbook', 'Книга из твоего Wish List', 'Любая книга, о которой ты мечтаешь', 250, '/prizes/wishbook.svg', 6, TRUE)
   ON CONFLICT (code) DO NOTHING`,
  // Заказы призов: баллы списываются сразу при заказе (pending/issued),
  // при отмене заказа — возвращаются
  `CREATE TABLE IF NOT EXISTS prize_orders (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     prize_id INT NOT NULL REFERENCES prizes(id),
     price INT NOT NULL,
     note TEXT,
     status TEXT NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending','issued','cancelled')),
     processed_by INT REFERENCES users(id),
     processed_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_orders_user ON prize_orders(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_orders_status ON prize_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_borrows_user_status ON borrows(user_id, status)`,
  // Цитаты из книг (добавляет библиотекарь). image — data:URL (загруженное фото,
  // сжатое в браузере) или https-ссылка на фото автора.
  `CREATE TABLE IF NOT EXISTS quotes (
     id SERIAL PRIMARY KEY,
     text TEXT NOT NULL,
     author_name TEXT NOT NULL,
     author_info TEXT,
     book_title TEXT,
     book_id INT REFERENCES books(id) ON DELETE SET NULL,
     image TEXT,
     active BOOLEAN NOT NULL DEFAULT TRUE,
     created_by INT REFERENCES users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_quotes_active ON quotes(active, created_at DESC)`,
  // === Командная платформа (команда проекта, не путать с ролью библиотекаря) ===
  // Участник платформы: lead — тимлид, member — участник
  `CREATE TABLE IF NOT EXISTS team_members (
     user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     platform_role TEXT NOT NULL DEFAULT 'member' CHECK (platform_role IN ('lead','member')),
     title TEXT,
     added_by INT REFERENCES users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS teams (
     id SERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     description TEXT,
     color TEXT NOT NULL DEFAULT '#2f5bea',
     created_by INT REFERENCES users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE TABLE IF NOT EXISTS team_memberships (
     team_id INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     PRIMARY KEY (team_id, user_id)
   )`,
  `CREATE TABLE IF NOT EXISTS team_tasks (
     id SERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     team_id INT REFERENCES teams(id) ON DELETE SET NULL,
     assignee_id INT REFERENCES users(id) ON DELETE SET NULL,
     status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','review','done')),
     priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
     due_date DATE,
     created_by INT REFERENCES users(id) ON DELETE SET NULL,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     done_at TIMESTAMPTZ
   )`,
  `CREATE INDEX IF NOT EXISTS idx_team_tasks_assignee ON team_tasks(assignee_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_team_tasks_team ON team_tasks(team_id, status)`,
  // Отчёт: что сделал и что получилось — видят все участники платформы
  `CREATE TABLE IF NOT EXISTS task_reports (
     id SERIAL PRIMARY KEY,
     task_id INT REFERENCES team_tasks(id) ON DELETE CASCADE,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     did TEXT NOT NULL,
     result TEXT,
     link TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_task_reports_created ON task_reports(created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_task_reports_task ON task_reports(task_id)`,
  // Фото призов и описание текстовыделителя (STABILO BOSS, выбор цвета)
  `UPDATE prizes SET description = 'STABILO BOSS pastel — выбери свой цвет', image = '/prizes/photo/highlighter-yellow.webp' WHERE code = 'highlighter'`,
  `UPDATE prizes SET image = '/prizes/photo/pen.webp' WHERE code = 'pen'`,
  `UPDATE prizes SET image = '/prizes/photo/notebook.webp' WHERE code = 'notebook'`,
  `UPDATE prizes SET image = '/prizes/photo/mug.webp' WHERE code = 'mug'`,
  `UPDATE prizes SET image = '/prizes/photo/wishbook.svg' WHERE code = 'wishbook'`,
  // v7: аватарка ученика (сжатое фото data:URL; отдаётся по /api/users/[id]/avatar)
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT`,
  // v7: новые фото призов (несколько ракурсов — в components/game/PrizeVisual.jsx)
  `UPDATE prizes SET image = '/prizes/photo/mug-1.webp' WHERE code = 'mug'`,
  `UPDATE prizes SET image = '/prizes/photo/notebook-1.webp' WHERE code = 'notebook'`,
  `UPDATE prizes SET image = '/prizes/photo/bookmark-1.webp' WHERE code = 'bookmark'`,
  `UPDATE prizes SET image = '/prizes/photo/wishbook-1.webp' WHERE code = 'wishbook'`,
  // v8: сколько раз продлевали срок книги
  `ALTER TABLE borrows ADD COLUMN IF NOT EXISTS extensions INT NOT NULL DEFAULT 0`,
  // v8: старт программы — история до этой даты не считается (меняется на странице «Мониторинг»)
  `CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `INSERT INTO app_meta (key, value) VALUES ('game_start', '2026-11-09T00:00:00+05:00') ON CONFLICT (key) DO NOTHING`,
  // v9: уведомления (dedupe_key — чтобы напоминание о сроке не повторялось)
  `CREATE TABLE IF NOT EXISTS notifications (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     kind TEXT NOT NULL,
     title TEXT NOT NULL,
     body TEXT,
     link TEXT,
     dedupe_key TEXT,
     read_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedupe ON notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`,
  // v9: полученные достижения
  `CREATE TABLE IF NOT EXISTS user_achievements (
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     code TEXT NOT NULL,
     earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     PRIMARY KEY (user_id, code)
   )`,
  // v9: призы — остаток на складе (NULL = без ограничения)
  `ALTER TABLE prizes ADD COLUMN IF NOT EXISTS stock INT`,
  `ALTER TABLE prizes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
  // v9: учителя
  `ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check`,
  `ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('student','librarian','teacher'))`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS teacher_pending BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE TABLE IF NOT EXISTS teacher_recommendations (
     id SERIAL PRIMARY KEY,
     teacher_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     class_name TEXT,
     note TEXT,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_teacher_recs_class ON teacher_recommendations(class_name, created_at DESC)`,
  // v9: ключ для экрана в холле (/tv?key=…)
  `INSERT INTO app_meta (key, value) VALUES ('tv_key', substr(md5(random()::text || clock_timestamp()::text), 1, 16)) ON CONFLICT (key) DO NOTHING`,
  // v10: «вернул без отзыва» — не понравилась / не стал читать: отзыв не нужен, монет нет
  `ALTER TABLE borrows DROP CONSTRAINT IF EXISTS borrows_status_check`,
  `ALTER TABLE borrows ADD CONSTRAINT borrows_status_check
     CHECK (status IN ('active','returned','reviewed','approved','cancelled'))`,
  // v10: учителя из школьной базы (dls.edu.kz) — чтобы не создавать дважды
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS school_ref TEXT`,
  // v11: «на полку без отзыва» — только через подтверждение библиотекаря или команды
  `CREATE TABLE IF NOT EXISTS shelf_requests (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
     borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
     note TEXT,
     decided_by INT REFERENCES users(id) ON DELETE SET NULL,
     decided_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_shelf_req_pending ON shelf_requests(user_id, book_id) WHERE status = 'pending'`,
  // Книги, которые ученики успели поставить на полку сами (без проверки), — в заявки
  `INSERT INTO shelf_requests (user_id, book_id, created_at)
     SELECT DISTINCT ON (b.user_id, b.book_id) b.user_id, b.book_id, b.created_at
       FROM borrows b
      WHERE b.status = 'approved' AND b.notes = 'Трофей: прочитано до запуска Bookify' AND b.issued_by = b.user_id
   ON CONFLICT DO NOTHING`,
  `DELETE FROM borrows WHERE status = 'approved' AND notes = 'Трофей: прочитано до запуска Bookify' AND issued_by = user_id`,
  // v12: отмена ошибочно начисленных монет — обратной записью, история сохраняется
  `ALTER TABLE user_points ADD COLUMN IF NOT EXISTS reverted BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE user_points ADD COLUMN IF NOT EXISTS revert_of INT REFERENCES user_points(id) ON DELETE CASCADE`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_points_revert_of ON user_points(revert_of) WHERE revert_of IS NOT NULL`,
  // v13: своя книга (не из библиотеки) — книга-«призрак» в архиве с владельцем, чтение — обычный заём own_book
  `ALTER TABLE books ADD COLUMN IF NOT EXISTS owner_id INT REFERENCES users(id) ON DELETE SET NULL`,
  `ALTER TABLE borrows ADD COLUMN IF NOT EXISTS own_book BOOLEAN NOT NULL DEFAULT FALSE`,
  `CREATE TABLE IF NOT EXISTS own_book_requests (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     author TEXT NOT NULL,
     pages INT NOT NULL,
     photo TEXT,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
     note TEXT,
     book_id INT REFERENCES books(id) ON DELETE SET NULL,
     borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
     decided_by INT REFERENCES users(id) ON DELETE SET NULL,
     decided_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE INDEX IF NOT EXISTS idx_own_book_req_status ON own_book_requests(status, created_at)`,
  // v13: видео и TEDx — отдельной заявкой позже, когда ученик их сделал
  `CREATE TABLE IF NOT EXISTS bonus_requests (
     id SERIAL PRIMARY KEY,
     user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     borrow_id INT NOT NULL REFERENCES borrows(id) ON DELETE CASCADE,
     book_id INT REFERENCES books(id) ON DELETE SET NULL,
     kind TEXT NOT NULL CHECK (kind IN ('video','tedx')),
     link TEXT,
     note TEXT,
     status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
     reject_note TEXT,
     decided_by INT REFERENCES users(id) ON DELETE SET NULL,
     decided_at TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_bonus_req_open ON bonus_requests(borrow_id, kind) WHERE status IN ('pending','approved')`,
  // v14: выданный школой пароль — обратимо зашифрованная копия (смотрят библиотекарь и тимлид) + журнал просмотров
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_view TEXT`,
  `CREATE TABLE IF NOT EXISTS password_view_log (
     id SERIAL PRIMARY KEY,
     viewer_id INT REFERENCES users(id) ON DELETE SET NULL,
     user_id INT REFERENCES users(id) ON DELETE CASCADE,
     count INT NOT NULL DEFAULT 1,
     created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,
  // v15: коэффициент страницы (плотность текста) — монеты за объём считаются по «страницы × коэффициент»
  `ALTER TABLE books ADD COLUMN IF NOT EXISTS page_coef NUMERIC(3,2)`,
  `ALTER TABLE books ADD COLUMN IF NOT EXISTS words_per_page INT`,
  `ALTER TABLE own_book_requests ADD COLUMN IF NOT EXISTS words_per_page INT`
]

const LOCK_ID = 7_310_442 // произвольный номер advisory-lock для миграций

/**
 * Накатывает миграции одной транзакцией под advisory-lock, чтобы несколько
 * одновременно стартовавших функций не делали это параллельно.
 */
async function runMigrations() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SELECT pg_advisory_xact_lock($1)', [LOCK_ID])
    await client.query(`CREATE TABLE IF NOT EXISTS app_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`)
    const cur = await client.query(`SELECT value FROM app_meta WHERE key = 'schema_version'`)
    if (cur.rows[0]?.value === String(SCHEMA_VERSION)) {
      await client.query('COMMIT')
      return
    }
    for (const sql of MIGRATIONS) {
      await client.query(sql)
    }
    await client.query(
      `INSERT INTO app_meta (key, value) VALUES ('schema_version', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [String(SCHEMA_VERSION)]
    )
    await client.query('COMMIT')
    console.log(`✅ [db] Миграции применены, версия схемы ${SCHEMA_VERSION}`)
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('❌ [db] Пакет миграций не прошёл, накатываю по одной:', err.message)
    // Запасной путь: по одной, ошибки не роняют сайт. Версию не записываем —
    // при следующем холодном старте попробуем пакетом ещё раз.
    for (const sql of MIGRATIONS) {
      try {
        await pool.query(sql)
      } catch (e) {
        console.error('❌ [db] Миграция не прошла:', sql.slice(0, 70), '—', e.message)
      }
    }
  } finally {
    client.release()
  }
}

let ensuring = null

/**
 * Проверяет схему один раз за жизнь процесса. Обычно это ОДИН запрос:
 * «есть ли таблицы и совпадает ли версия». Параллельные вызовы ждут один промис.
 */
export async function ensureSchema() {
  if (schemaEnsured) return true
  if (!ensuring) {
    ensuring = (async () => {
      const check = await pool.query(`
        SELECT to_regclass('public.users') IS NOT NULL AS has_users,
               to_regclass('public.app_meta') IS NOT NULL AS has_meta
      `)
      const { has_users, has_meta } = check.rows[0]

      if (!has_users) {
        const fs = await import('fs')
        const path = await import('path')
        const schemaPath = path.join(process.cwd(), 'db', 'schema.sql')
        await pool.query(fs.readFileSync(schemaPath, 'utf8'))
        console.log('✅ [db] Схема БД автоматически применена')
      }

      if (has_users && has_meta) {
        const v = await pool.query(`SELECT value FROM app_meta WHERE key = 'schema_version'`)
        if (v.rows[0]?.value === String(SCHEMA_VERSION)) {
          schemaEnsured = true
          return true
        }
      }

      await runMigrations()
      schemaEnsured = true
      return true
    })().catch(err => {
      console.error('❌ [db] Ошибка ensureSchema:', err.message)
      ensuring = null // попробуем снова при следующем запросе
      return false
    })
  }
  return ensuring
}

export default pool
