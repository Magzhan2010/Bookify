import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';
import { ThemeProvider, ThemeToggle } from '../components/ThemeContext';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap"
});

export const metadata = {
  title: "Bookify — Цифровая библиотека DLS",
  description:
    "Онлайн платформа библиотеки Divergents Leadership School. Арендуй книги онлайн, веди статистику чтения, открывай новые жанры.",
  icons: {
    icon: "/lb_logo.png",
    apple: "/lb_logo.png"
  }
};

// Inline-скрипт применяет тему ДО рендера (нет flash)
const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('bookify-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = saved || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen flex flex-col antialiased bg-[var(--color-bg)] text-[var(--color-text-primary)]">
        <ThemeProvider>
          {children}
          <div className="fixed bottom-4 right-4 z-50 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-full p-2 shadow-[var(--shadow-elevated)]">
            <ThemeToggle />
          </div>
        </ThemeProvider>
        <Toaster
          position="top-center"
          closeButton
          toastOptions={{
            style: {
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-primary)',
              borderRadius: 14,
              fontFamily: 'var(--font-sans)',
              boxShadow: 'var(--shadow-elevated)'
            }
          }}
        />
      </body>
    </html>
  );
}