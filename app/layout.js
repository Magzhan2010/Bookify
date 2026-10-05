import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

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

export default function RootLayout({ children }) {
  return (
    <html
      lang="ru"
      className={inter.variable}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col bg-white text-[#1d1d1f] antialiased">
        {children}
        <Toaster
          position="top-center"
          closeButton
          toastOptions={{
            style: {
              background: '#1d1d1f',
              border: 'none',
              color: '#fff',
              borderRadius: 14,
              fontFamily: 'var(--font-inter)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
            }
          }}
        />
      </body>
    </html>
  );
}