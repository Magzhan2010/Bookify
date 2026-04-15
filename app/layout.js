import { Montserrat,Poppins } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"], 
  weight: ["400","500","600","700"]
});

export const metadata = {
  title: "Bookify",
  description: "Electronic Library",
  icons: {
    icon: "/lb_logo.png"
  }
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-poppins">
        {children}  
        <Toaster position="top-center" richColors />
      </body>
    </html>

  );
}
