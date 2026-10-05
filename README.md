# 📚 Bookify — Цифровая библиотека DLS

Платформа библиотеки Divergents Leadership School. Вместо бумажных журналов и Google Sheets — красивая, анимированная система выдачи книг с полной статистикой.

---

## ⚡ Быстрый старт

### 1. Установи зависимости
```bash
npm install --legacy-peer-deps
```

### 2. Создай `.env.local`
```env
DATABASE_URL=postgresql://user:password@host/db?sslmode=require
JWT_SECRET=любая-длинная-строка
```
> 💡 **Нет Postgres?** Зарегистрируйся бесплатно на [neon.tech](https://neon.tech) и создай БД. Скопируй Connection String.

### 3. Примени схему + добавь демо-данные
```bash
node scripts/setup-db.js
```
Это создаст таблицы + добавит:
- 👤 8 пользователей (admin / librarian / teacher / 5 студентов)
- 📚 15 книг разных жанров

### 4. Запусти
```bash
npm run dev
```

Открой http://localhost:3000

### 5. Готовые аккаунты
| Email | Пароль | Роль |
|---|---|---|
| admin@dls.school.com | admin123 | admin |
| aigerim@librarian.school.com | library123 | librarian (библиотекарь) |
| yerzhan@teacher.school.com | teacher123 | teacher |
| aidana@student.school.com | student123 | student (10-А) |

> Авторизация определяется по email: `@admin.school`, `@librarian.school`/`@lib.school`, `@teacher.school` — иначе student.

---

## 🔄 Импорт из Google Sheets

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
5. Зайди как librarian → `http://localhost:3000/librarian/sync` → жми «Синхронизировать»

---

## 📁 Структура

```
app/
├── page.js                  # Лендинг
├── login/, register/        # Авторизация
├── library/                 # Каталог (ученик)
├── books/[id]/              # Карточка книги + комментарии
├── profile/                  # Профиль + графики
├── report/[borrowId]/       # Сдача отчёта
├── librarian/               # Панель библиотекаря
│   ├── page.jsx             # Аналитика + KPI
│   ├── issue/               # Выдать книгу (wizard)
│   ├── returns/             # Принять возврат
│   ├── lookup/              # Поиск "у кого книга"
│   ├── students/            # Управление учениками
│   ├── history/             # История операций
│   ├── analytics/           # Графики
│   └── sync/                # Google Sheets sync
├── admin/                   # Админ-панель
│   ├── page.jsx             # CRUD книг
│   └── dashboard/           # Проверка отчётов
└── api/                     # Backend
    ├── auth/                # Login + Register
    ├── books/               # CRUD + borrow/return
    ├── librarian/           # Issue + return + lookup + history + analytics + students + sync-sheets
    ├── reports/             # POST (ученик) + PATCH (одобрение)
    ├── profile/             # Профиль + goal
    └── comments/, favorites/, user/tracker/

lib/
├── db.js                    # Postgres pool
├── auth.js                  # JWT helpers + role detection
└── google-sheets.js         # Google Sheets API

db/schema.sql                 # Схема БД
scripts/setup-db.js           # Скрипт настройки
```

---

## 🆘 Troubleshooting

**Не могу зарегистрироваться**
→ Скорее всего не применена схема БД. Запусти `node scripts/setup-db.js`

**Ошибка `connection refused`**
→ Проверь DATABASE_URL в `.env.local`. Neon DB может быть приостановлен — зайди на [neon.tech](https://neon.tech) и разбуди его.

**Google Sheets не подключается**
→ Убедись что Service Account добавлен как Editor таблицы. PRIVATE_KEY должен быть в кавычках с `\n`.

**Сборка падает**
→ Используй `npm install --legacy-peer-deps` (конфликт recharts и React 19).

---

## 🛠 Стек

- Next.js 15 (App Router) + React 19
- Tailwind CSS v4 — Apple-style дизайн (Inter / SF Pro stack)
- Framer Motion — анимации
- Recharts — графики
- PostgreSQL (Neon) — БД
- JWT + bcryptjs — авторизация
- googleapis — Google Sheets sync
- Sonner — тосты
- Lucide — иконки

---

📐 Лицензия: Proprietary — для Divergents Leadership School