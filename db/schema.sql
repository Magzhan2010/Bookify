-- ============================================================
-- BOOKIFY — Database schema (v2 — simplified)
-- Divergents Leadership School Library
--
-- Логика:
-- 1. Ученик хочет книгу → создаётся book_request (pending)
-- 2. Библиотекарь выдаёт → book_request (fulfilled) + borrows (active)
-- 3. Ученик возвращает → borrows (returned)
-- 4. Ученик сам ставит рейтинг книге при возврате (опционально)
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','librarian')),
  class_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  token_version INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOOKS
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  year TEXT,
  description TEXT,
  cover_url TEXT,
  file_url TEXT,
  total_copies INT NOT NULL DEFAULT 1,
  available_copies INT NOT NULL DEFAULT 1,
  isbn TEXT,
  pages INT,
  tags TEXT,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);
CREATE INDEX IF NOT EXISTS idx_books_archived ON books(archived_at);

-- BOOK_REQUESTS: ученик хочет забрать книгу (заявка)
CREATE TABLE IF NOT EXISTS book_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected','fulfilled','cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by INT REFERENCES users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_requests_user ON book_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_requests_book ON book_requests(book_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON book_requests(status);

-- BORROWS: каждый заём (упрощённый)
-- status: active | returned | reviewed | approved
--   active   — книга на руках у ученика
--   returned — ученик вернул книгу
--   reviewed — ученик написал отзыв, ждёт одобрения библиотекаря
--   approved — библиотекарь подтвердил отзыв → книга в "прочитанные" (личная полка)
-- rating: ученик сам ставит после прочтения (1-5)
CREATE TABLE IF NOT EXISTS borrows (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','returned','reviewed','approved')),
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  issued_by INT REFERENCES users(id),
  rating INT CHECK (rating BETWEEN 0 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrows_user ON borrows(user_id);
CREATE INDEX IF NOT EXISTS idx_borrows_book ON borrows(book_id);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status);

-- BOOK_REVIEWS: отзыв ученика о прочитанной книге
CREATE TABLE IF NOT EXISTS book_reviews (
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
);

CREATE INDEX IF NOT EXISTS idx_reviews_status ON book_reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON book_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_book ON book_reviews(book_id);

-- USER_POINTS: баланс баллов и история начислений
-- Программа "Читай книги. Копи баллы. Получай призы."
CREATE TABLE IF NOT EXISTS user_points (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points INT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,              -- 'pages' | 'review' | 'video' | 'tedx' | 'prize' | 'adjust'
  description TEXT,                 -- человекочитаемое описание
  borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
  book_id INT REFERENCES books(id) ON DELETE SET NULL,
  spent BOOLEAN NOT NULL DEFAULT FALSE,  -- потрачены ли баллы (призы)
  created_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_user ON user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_points_created ON user_points(created_at DESC);

-- POINT_RULES: справочник сколько баллов за что
CREATE TABLE IF NOT EXISTS point_rules (
  id SERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,        -- 'pages_100_200' | 'review' | 'video' | 'tedx'
  title TEXT NOT NULL,
  points INT NOT NULL,
  description TEXT
);

-- FAVORITES
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

-- COMMENTS: комментарии учеников к книгам
CREATE TABLE IF NOT EXISTS book_comments (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_book ON book_comments(book_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON book_comments(user_id);

-- READING_GOALS: цель чтения на год
CREATE TABLE IF NOT EXISTS reading_goals (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  goal INT NOT NULL DEFAULT 12,
  UNIQUE (user_id, year)
);

-- BOOK_RATINGS: оценка книги учеником (1-5)
-- Одна оценка на пару ученик+книга, при повторной — обновляется
CREATE TABLE IF NOT EXISTS book_ratings (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  value INT NOT NULL CHECK (value BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_book ON book_ratings(book_id);

-- ============================================================
-- VIEW: все активные займы с данными
-- ============================================================
CREATE OR REPLACE VIEW v_active_loans AS
SELECT
  b.id            AS borrow_id,
  u.id            AS student_id,
  u.name          AS student_name,
  u.email         AS student_email,
  u.class_name    AS student_class,
  bk.id           AS book_id,
  bk.title        AS book_title,
  bk.author       AS book_author,
  bk.cover_url    AS book_cover,
  b.borrowed_at,
  b.due_date,
  EXTRACT(DAY FROM (NOW() - b.due_date))::INT AS overdue_days,
  lib.id          AS issued_by_id,
  lib.name        AS issued_by_name
FROM borrows b
JOIN users u  ON u.id = b.user_id
JOIN books bk ON bk.id = b.book_id
LEFT JOIN users lib ON lib.id = b.issued_by
WHERE b.status = 'active';

-- ============================================================
-- VIEW: статистика по ученику
-- ============================================================
CREATE OR REPLACE VIEW v_student_stats AS
SELECT
  u.id AS user_id,
  u.name,
  u.class_name,
  COUNT(*) FILTER (WHERE b.status <> 'active') AS books_finished,
  COUNT(*) FILTER (WHERE b.status = 'active') AS books_active,
  COUNT(DISTINCT bk.genre) FILTER (WHERE b.status <> 'active') AS genres_count,
  AVG(b.rating) FILTER (WHERE b.status <> 'active' AND b.rating > 0) AS avg_rating
FROM users u
LEFT JOIN borrows b ON b.user_id = u.id
LEFT JOIN books bk ON bk.id = b.book_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.class_name;
-- ============================================================
-- Программа «Читай — копи баллы — получай призы»
-- (таблицы также создаются автоматически миграциями в lib/db.js)
-- ============================================================
CREATE TABLE IF NOT EXISTS prizes (
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
);

-- Заказ приза: монеты резервируются сразу (pending/issued), отмена их возвращает
CREATE TABLE IF NOT EXISTS prize_orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  prize_id INT NOT NULL REFERENCES prizes(id),
  price INT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','cancelled')),
  processed_by INT REFERENCES users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
