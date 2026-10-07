# 📚 Bookify — Цифровая библиотека DLS

Платформа библиотеки Divergents Leadership School. Вместо бумажных журналов и Google Sheets — красивая, анимированная система выдачи книг с полной статистикой.

---

## 🚀 Запуск

### 1. Установи зависимости
```bash
npm install --legacy-peer-deps
```

### 2. Создай `.env.local`
```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=любая-длинная-строка
```
> 💡 **Нет Postgres?** Зарегистрируйся бесплатно на [neon.tech](https://neon.tech) и создай БД.

### 3. Примени схему БД
```bash
node scripts/setup-db.js
```

### 4. Запусти
```bash
npm run dev
```

Открой http://localhost:3000 и зарегистрируй первого библиотекаря.

---

## 👤 Роли

Только 2 роли:
- **student** — ученик (читает книги, делает заявки)
- **librarian** — библиотекарь (выдаёт, принимает, ведёт аналитику)

### Как библиотекарь получает роль
При регистрации определяется автоматически по email:
- `*@dls.school` → **librarian**
- `*@librarian.school` → **librarian**
- `*@lib.school` → **librarian**
- любой другой → **student**

### Как создать первого библиотекаря
1. Зайди на `/register`
2. Email: `malika@dls.school` (или с `@librarian.school`)
3. Пароль: любой ≥ 6 символов
4. Автоматически получишь права библиотекаря
5. Залогинься → попадёшь в `/librarian`

---

## 🔄 Импорт книг из Google Sheets

Подготовь таблицу с такой структурой (лист `books`):

| A: title | B: author | C: genre | D: year | E: description | F: cover_url | G: file_url | H: total_copies |
|---|---|---|---|---|---|---|---|
| Мастер и Маргарита | Булгаков | Классика | 1967 | Философский роман... | https:// | https:// | 2 |

1. Открой [console.cloud.google.com](https://console.cloud.google.com/)
2. Создай проект → Service Account → скачай ключ
3. Дай доступ к таблице (email как Editor)
4. Заполни в `.env.local`:
   ```env
   GOOGLE_SHEETS_ID=1AbCdEf...
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
   ```
5. Зайди как библиотекарь → `/librarian/sync` → жми «Синхронизировать»

---

## 🔄 Основные flow

### Ученик берёт книгу
1. `/library` — каталог с фильтрами по жанрам
2. Клик на книгу → `/books/[id]` — описание, кнопка **«Хочу забрать»**
3. Библиотекарь выдаёт → книга у ученика
4. После прочтения → ученик может поставить ★ оценку
5. `/librarian/returns` — библиотекарь жмёт «Принять» → книга возвращена

### Библиотекарь выдаёт
1. `/librarian` — дашборд с аналитикой
2. `/librarian/requests` — заявки учеников (кто что хочет)
3. «Выдать» → создаётся borrow + заявка fulfilled
4. Или `/librarian/issue` — выдать напрямую (без заявки)

### Аналитика
- `/librarian/analytics` — графики, топ читателей, жанры
- `/librarian/students` — все ученики с историей
- `/librarian/history` — журнал выдач/возвратов
- `/librarian/lookup` — поиск «у кого сейчас книга?»

---

## 📁 Структура проекта

```
app/
├── page.js                  # Лендинг
├── login/, register/        # Авторизация
├── library/                 # Каталог (wizard + книги)
├── books/[id]/              # Карточка книги
├── profile/                  # Профиль + графики
├── librarian/               # Панель библиотекаря
│   ├── page.jsx             # Дашборд
│   ├── requests/            # Заявки учеников
│   ├── issue/               # Выдать книгу
│   ├── returns/             # Принять возврат
│   ├── lookup/              # Поиск "у кого книга?"
│   ├── students/            # Управление учениками
│   ├── history/             # Журнал операций
│   ├── analytics/           # Графики
│   └── sync/                # Импорт из Google Sheets
├── setup/                   # Проверка БД
└── api/                     # Backend
    ├── auth/                # Login + Register
    ├── books/               # CRUD + borrow + return + request
    ├── librarian/           # Issue + return + lookup + history + analytics + students + sync-sheets + requests
    ├── profile/             # Профиль + goal
    ├── favorites/           # Избранное
    └── genres/[...path]/    # Иерархия жанров (wizard)

lib/
├── db.js                    # Postgres pool + ensureSchema
├── auth.js                  # JWT helpers + role detection
└── google-sheets.js         # Google Sheets API

db/schema.sql                 # Схема БД
scripts/setup-db.js           # Применение схемы
scripts/fetch-books.js        # Скачивание книг из Sheets
scripts/import-from-sheets.js # Импорт книг в БД
```

---

## 🛠 Технологии

- **Frontend:** Next.js 15, React 19, Tailwind CSS v4
- **Дизайн:** Inter / SF Pro stack, light/dark темы
- **Анимации:** Framer Motion
- **Графики:** Recharts
- **Backend:** Next.js API Routes (serverless)
- **БД:** PostgreSQL (Neon)
- **Auth:** JWT + bcryptjs
- **googleapis:** импорт книг из таблиц
- **sonner:** тосты
- **lucide-react:** иконки

---

## 🆘 Troubleshooting

| Ошибка | Решение |
|---|---|
| `connection refused` | Проверь `DATABASE_URL` в `.env.local`. Зайди на [neon.tech](https://neon.tech) и разбуди БД если suspend. |
| `relation does not exist` | Запусти `node scripts/setup-db.js` |
| Ошибка сети в браузере | Vercel: проверь env vars в дашборде. Локально: перезапусти `npm run dev` |
| Login не работает | Проверь `JWT_SECRET` в `.env.local` (должен быть стабильный) |

---

📐 Лицензия: Proprietary — для Divergents Leadership School