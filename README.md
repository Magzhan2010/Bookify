
Bookify Logo
Bookify: Divergents School Library
Transforming passive reading into an active skill through structured reporting and AI feedback.

Next.js PostgreSQL TailwindCSS Vercel

Live Demo · Report Bug

🧠 The Problem & Solution (Product Logic)
Most students read books passively. They read 100 pages, close the book, and forget 90% of the content in a week. Traditional "just read it" approaches don't work because there is no accountability.

Bookify solves this using a strict 3-step state machine:

Planned: User adds a book to their list.
Reading: User clicks "Start Reading" (locks the book to their profile).
Finished: User submits a structured report (processed by Claude AI). A teacher reviews and approves it.
No book is considered "Read" until the report is verified by a real person.

✨ Key Features
🔒 Role-Based Access Control: Secure JWT authentication separating student, teacher, and admin roles.
📊 Teacher Console: Fast-paced dashboard with instant search, status filters, and a "fast-approve" button to check reports without opening modals.
🤖 AI Integration: Student reports are analyzed by Claude AI. Both the student and teacher can view the detailed AI score and breakdown.
🔄 Dynamic Status Tracking: Books on the main shelf show real-time status badges ("Reading", "Finished") based on the user's personal progress, without complex SQL joins.
📜 Infinite Scroll: High-performance pagination on the book catalog to ensure the app remains fast even with 1000+ books.
💸 Smart UX: Spinner loading states on all buttons (spam protection), toast notifications, and mobile-first responsive design.
❤️ Kaspi Integration: Seamless donation page with a smart redirect to the Kaspi Pay app for mobile users.
🛠️ Tech Stack
Frontend:

Next.js 16 (App Router)
React Hooks (useState, useEffect, useRef, useContext)
TailwindCSS (Dark premium theme)
Framer Motion (Staggered animations, page transitions)
Sonner (Toast notifications)
Backend & Database:

Next.js API Routes (Serverless functions)
PostgreSQL (Relational Database)
pg (Node-postgres driver)
JWT (JSON Web Tokens for stateless auth)
Anthropic API (Claude AI integration)
DevOps:

Neon (Serverless PostgreSQL Hosting)
Vercel (Frontend & Backend Deployment)
GitHub Actions (CI/CD)
🏗️ Architecture & Logic Flow
Authentication: User logs in -> Server generates a JWT containing id, name, role -> Frontend stores it in localStorage and protects routes.
Book Borrowing: User requests a book -> Server creates a borrow record with active status and sets a 14-day deadline.
Reporting: User submits answers -> Server calls Claude AI to generate a score and feedback -> Saves to reports table with pending status.
Verification: Teacher opens dashboard -> Views pending reports -> Clicks "Approve" -> Server updates borrow status to approved and moves the book to the user's "Finished" shelf.
🚀 Getting Started (Local Setup)
Clone the repository:
git clone https://github.com/Magzhan2010/Bookify.gitcd Bookify
Install dependencies:
bash

npm install
Setup Environment Variables:
Create a .env file in the root directory:
env

DATABASE_URL="postgresql://user:password@localhost:5432/bookify"
JWT_SECRET="your_super_secret_string"
ANTHROPIC_API_KEY="your_claude_api_key"
Setup Database:
Create a PostgreSQL database named bookify and run the schema/migration files (or use the SQL dump provided in the repository).
Run the development server:
bash

npm run dev
Open http://localhost:3000 to view it in the browser.
📸 Screenshots
(Вот сюда потом вставь 3-4 красивых скриншота: Лендинг, Каталог с бейджами, Дашборд учителя, Профиль ученика)

Home Page / Landing
Landing Page

Main Library Catalog with Status Badges
Library

Teacher Dashboard with Fast Approve
Dashboard

🤝 Acknowledgements
Inspired by the "Steve Jobs" design philosophy — interface should be so intuitive that it needs no instructions.
Special thanks to the Divergents School community for testing and feedback.
Built with immense amounts of coffee and F12 DevTools.
