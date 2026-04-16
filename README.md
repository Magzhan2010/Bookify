# 📚 Bookify | Smart Library Management System

[![Next.js](https://shields.io)](https://nextjs.org)
[![Tailwind CSS](https://shields.io)](https://tailwindcss.com)
[![PostgreSQL](https://shields.io)](https://postgresql.org)
[![Claude AI](https://shields.io)](https://anthropic.com)

**Bookify** — это интеллектуальная платформа для Divergents School, превращающая пассивное чтение в осознанный навык через систему глубокой отчетности и AI-анализ.

[Демо (Vercel)](#) • [Документация API](#) • [Сообщить об ошибке](https://github.com)

---

## 🎯 Проблема и Решение

**Проблема:** Студенты часто читают книги "для галочки", забывая до 90% ключевой информации в течение недели.  
**Решение:** Замкнутый цикл обучения: **Выбор книги ➔ Чтение ➔ Структурированный отчет ➔ AI-валидация ➔ Ревью учителя.**

---

## ✨ Ключевые особенности

-   **🧠 AI-Рецензент:** Интеграция с Claude API для анализа глубины понимания, поиска инсайтов и оценки планов действий.
-   **🚀 Premium UX:** Плавные анимации на Framer Motion, бесконечный скролл (Intersection Observer) и мгновенный поиск.
-   **📊 Dashboard Модератора:** Управление отчетами в один клик и детальная аналитика прогресса студентов.
-   **💳 Kaspi Pay:** Поддержка системы донатов и оплаты через мобильный Web-view.
-   **🔐 Безопасность:** Ролевая модель доступа (RBAC) на базе JWT и защита серверных роутов.

---

## 🛠 Технологический стек


| Слой | Технологии |
| :--- | :--- |
| **Frontend** | Next.js 15 (App Router), Tailwind CSS, Framer Motion, Lucide Icons |
| **Backend** | Node.js, Express, Prisma ORM |
| **Database** | PostgreSQL (Neon Serverless) |
| **AI/LLM** | Anthropic Claude API |
| **Deployment** | Vercel |

---

## 🏗 Архитектура состояний (FSM)

Проект использует строгую логику переходов состояний для каждой книги на полке студента:

```mermaid
graph LR
    A[Planned] -->|Начать чтение| B(Reading)
    B -->|Сдать отчет| C{Pending}
    C -->|AI/Учитель отклонил| B
    C -->|Учитель одобрил| D[Finished]
