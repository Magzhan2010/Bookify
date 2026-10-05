import { Fraunces, Montserrat, Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  style: ["normal"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
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
      className={`${fraunces.variable} ${montserrat.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen flex flex-col antialiased">
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          theme="dark"
          toastOptions={{
            style: {
              background: '#11141f',
              border: '1px solid rgba(232, 185, 78, 0.2)',
              color: '#fff',
              fontFamily: 'var(--font-poppins)',
            }
          }}
        />
      </body>
    </html>
  );
}