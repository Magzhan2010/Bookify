# 📚 Bookify — Цифровая библиотека DLS

Платформа библиотеки Divergents Leadership School. Вместо бумажных журналов и Google Sheets — красивая, анимированная система выдачи книг с полной статистикой.

![Stack](https://img.shields.io/badge/Next.js-15-black)
![DB](https://img.shields.io/badge/PostgreSQL-Neon-blue)
![Stack](https://img.shields.io/badge/TailwindCSS-v4-38bdf8)
![Stack](https://img.shields.io/badge/Framer_Motion-11-ff69b4)

---

## 🎯 Что внутри

### Для учеников
- 📚 **Каталог 250+ книг** с фильтром по жанру, мгновенным поиском, бесконечным скроллом
- 🔖 **Бронирование в 1 клик** — книга у тебя на 14 дней
- ✍️ **Отчёт о прочитанном** — 5 вопросов для глубокого усвоения
- 📊 **Личный профиль** — статистика, цель на год, графики по месяцам и жанрам
- ❤️ **Избранное** — сохраняй книги, которые хочешь прочитать
- 💬 **Комментарии** — делись мнением с подписчиками

### Для библиотекаря
- 🎫 **Выдать книгу** — поиск ученика → выбор книги → подтверждение (30 сек)
- 📥 **Принять возврат** — список активных выдач → 1 клик
- 🔍 **"У кого сейчас книга?"** — мгновенный поиск по названию или ученику
- 👥 **Управление учениками** — CRUD, фильтры по классам, статистика по каждому
- 📈 **Аналитика** — топ читатели, должники, графики активности, распределение по жанрам
- 📜 **История операций** — полный audit log с фильтрами по датам/ученикам/книгам
- 🔄 **Импорт из Google Sheets** — синхронизация каталога в 1 клик

### Для админа
- Все права библиотекаря
- ➕ **Добавление книг** через форму или импорт из Google Sheets
- 📑 **Управление отчётами** — одобрять/отклонять работы учеников

---

## 🛠 Технологии

- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS v4
- **Анимации:** Framer Motion 11, кастомные keyframes
- **Графики:** Recharts
- **Backend:** Next.js API Routes (serverless)
- **БД:** PostgreSQL (Neon)
- **Auth:** JWT + bcryptjs
- **Иконки:** Lucide React
- **Тосты:** Sonner
- **Интеграция:** Google Sheets API (googleapis)

---

## 🚀 Запуск

1. Установи зависимости:
   ```bash
   npm install --legacy-peer-deps
   ```

2. Скопируй `.env.example` в `.env.local` и заполни:
   - `DATABASE_URL` — connection string Postgres
   - `JWT_SECRET` — случайная строка для токенов
   - `GOOGLE_SHEETS_ID` — ID таблицы (для импорта книг)
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` — для Google Sheets API

3. Примени схему БД (`db/schema.sql`) к своей Postgres-базе.

4. Запусти:
   ```bash
   npm run dev
   ```

Открой http://localhost:3000

---

## 🔐 Роли пользователей

Роль определяется по email-паттерну при регистрации:

| Email содержит              | Роль          |
|----------------------------|---------------|
| `@admin.school`            | admin         |
| `@librarian.school` или `@lib.school` | librarian     |
| `@teacher.school`           | teacher       |
| всё остальное              | student       |

---

## 🔄 Импорт книг из Google Sheets

Подготовь таблицу с такой структурой (лист `books`):

| title | author | genre | year | description | cover_url | file_url | total_copies |
|-------|--------|-------|------|-------------|-----------|----------|--------------|
| Мастер и Маргарита | Булгаков | Классика | 1967 | Философский роман... | https://... | https://... | 2 |

1. Зайди в Google Cloud Console → создай Service Account
2. Дай ему доступ к таблице (email как Editor)
3. Скачай JSON-ключ
4. Вставь `client_email` в `GOOGLE_SERVICE_ACCOUNT_EMAIL`
5. Вставь `private_key` в `GOOGLE_PRIVATE_KEY` (с переносами `\n`)
6. В навбаре → Библиотека → Импорт из Sheets → жми "Синхронизировать"

---

## 📁 Структура проекта

```
app/
├── page.js                       # Лендинг
├── login/, register/             # Авторизация
├── library/                      # Каталог (ученик)
├── books/[id]/                   # Карточка книги + комментарии + взять
├── profile/                      # Профиль ученика + статистика + графики
├── report/[borrowId]/            # Сдача отчёта о прочитанном
├── librarian/                    # Панель библиотекаря
│   ├── page.jsx                  # Дашборд (аналитика + недавние + должники)
│   ├── issue/                    # Выдать книгу (3-шаговый wizard)
│   ├── returns/                  # Принять возврат (список + 1 клик)
│   ├── lookup/                   # Поиск "у кого книга"
│   ├── students/                 # Управление учениками
│   ├── history/                  # История операций (audit log)
│   ├── analytics/                # Полная аналитика + графики
│   └── sync/                     # Синхронизация с Google Sheets
├── admin/                        # Панель админа
│   ├── page.jsx                  # Управление книгами
│   └── dashboard/                # Проверка отчётов учеников
├── donate/                       # Страница доната (Kaspi)
└── api/                          # Backend (Next.js API Routes)
    ├── auth/                     # Login + Register
    ├── books/                    # CRUD + search + borrow + return
    ├── librarian/                # Issue + return + lookup + history + analytics + students + sync
    ├── reports/                  # POST (ученик) + PATCH (одобрение)
    ├── profile/                  # GET профиль + POST цель чтения
    ├── comments/                 # GET + POST + PATCH (pin)
    └── favorites/, user/tracker/

lib/
├── db.js                         # Подключение к Postgres
├── auth.js                       # JWT helpers + role detection
└── google-sheets.js              # Импорт книг из Sheets

db/
└── schema.sql                    # Схема БД (применить к Postgres)

.env.example                      # Шаблон переменных окружения
```

---

## 📊 Схема базы данных

**Основные таблицы:**
- `users` — ученики, библиотекари, учителя, админы
- `books` — каталог (с total_copies и available_copies для нескольких экземпляров)
- `borrows` — каждый заём (active / submitted / returned / approved / overdue / lost)
- `reports` — отчёты о прочитанном
- `comments` — комментарии к книгам
- `favorites` — избранное
- `book_tracker` — личный трекер чтения
- `reading_goals` — цель на год

**Views:**
- `v_active_loans` — все активные выдачи с данными ученика и книги
- `v_student_stats` — статистика по каждому ученику

Полная схема в `db/schema.sql`.

---

## ✨ Дизайн-фишки

- 🎨 Тёплая библиотечная палитра: золотой акцент, бирюза, коралл
- 🌊 Mesh-gradient blur-фоны с анимацией
- 🎭 Framer Motion: появления stagger, layout-анимации карточек, spring-кнопки
- 🔥 Recharts: красивые графики активности, жанров, прогресса
- 📱 Mobile-first: sidebar в drawer на мобильных
- 🦴 Skeleton-loaders, плавные переходы между страницами
- ⚡ Без TL;DR — премиальный feel через детали

---

## 📜 Лицензия

Proprietary — для Divergents Leadership School