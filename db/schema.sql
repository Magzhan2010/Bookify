-- ============================================================
-- BOOKIFY — Database schema
-- Divergents Leadership School Library
-- ============================================================

-- USERS: ученики, библиотекари, админы, учителя
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student','teacher','librarian','admin')),
  class_name TEXT,                     -- "10-A", "11-B" — для учеников
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- BOOKS: книги библиотеки
CREATE TABLE IF NOT EXISTS books (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  genre TEXT,
  year TEXT,
  description TEXT,
  cover_url TEXT,
  file_url TEXT,                       -- PDF для чтения онлайн
  total_copies INT NOT NULL DEFAULT 1, -- сколько экземпляров в библиотеке
  available_copies INT NOT NULL DEFAULT 1,
  isbn TEXT,
  pages INT,
  tags TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_books_genre ON books(genre);
CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
CREATE INDEX IF NOT EXISTS idx_books_author ON books(author);

-- BORROWS: каждое "взятие книги" — отдельная запись
-- Поддерживает все варианты жизненного цикла
CREATE TABLE IF NOT EXISTS borrows (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active','submitted','returned','approved','overdue','lost')),
  borrowed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  due_date TIMESTAMPTZ,                -- когда нужно вернуть
  returned_at TIMESTAMPTZ,             -- когда реально вернул
  issued_by INT REFERENCES users(id),  -- кто из библиотекарей выдал
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_borrows_user ON borrows(user_id);
CREATE INDEX IF NOT EXISTS idx_borrows_book ON borrows(book_id);
CREATE INDEX IF NOT EXISTS idx_borrows_status ON borrows(status);

-- REPORTS: отчёты учеников о прочитанном (для учителя/куратора)
CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT REFERENCES books(id) ON DELETE SET NULL,
  borrow_id INT REFERENCES borrows(id) ON DELETE SET NULL,
  custom_title TEXT,                   -- если book_id NULL (книга не в каталоге)
  quote1 TEXT,
  quote2 TEXT,
  confusing TEXT,
  life_example TEXT,
  apply_today TEXT,
  rating INT CHECK (rating BETWEEN 0 AND 5),
  status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending','approved','rejected')),
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- COMMENTS: комментарии к книгам
CREATE TABLE IF NOT EXISTS comment (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FAVORITES: избранные книги
CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id INT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, book_id)
);

-- BOOK_TRACKER: личный трекер чтения ученика (вне каталога библиотеки)
CREATE TABLE IF NOT EXISTS book_tracker (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target TEXT,
  start_date DATE,
  end_date DATE,
  rating INT CHECK (rating BETWEEN 0 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- READING_GOALS: цель чтения на год
CREATE TABLE IF NOT EXISTS reading_goals (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  year INT NOT NULL,
  goal INT NOT NULL DEFAULT 12,
  UNIQUE (user_id, year)
);

-- ============================================================
-- VIEW: удобный список "у кого какая книга сейчас"
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
  b.status,
  EXTRACT(DAY FROM (NOW() - b.due_date))::INT AS overdue_days,
  lib.id          AS issued_by_id,
  lib.name        AS issued_by_name
FROM borrows b
JOIN users u  ON u.id = b.user_id
JOIN books bk ON bk.id = b.book_id
LEFT JOIN users lib ON lib.id = b.issued_by
WHERE b.status IN ('active','overdue','submitted');

-- ============================================================
-- VIEW: статистика по ученику
-- ============================================================
CREATE OR REPLACE VIEW v_student_stats AS
SELECT
  u.id AS user_id,
  u.name,
  u.class_name,
  COUNT(DISTINCT CASE WHEN b.status = 'approved' THEN b.book_id END) AS books_finished,
  COUNT(DISTINCT CASE WHEN b.status IN ('active','overdue','submitted') THEN b.book_id END) AS books_active,
  COUNT(DISTINCT CASE WHEN b.status = 'approved' THEN bk.genre END) AS genres_finished
FROM users u
LEFT JOIN borrows b ON b.user_id = u.id
LEFT JOIN books bk ON bk.id = b.book_id
WHERE u.role = 'student'
GROUP BY u.id, u.name, u.class_name;