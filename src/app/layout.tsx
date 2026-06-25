import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ui/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Учёт смен",
  description: "Telegram Mini App для учёта рабочего времени",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const themeScript = `
(function() {
  var t = localStorage.getItem('theme');
  if (t !== 'dark' && t !== 'light') t = 'dark';
  document.documentElement.classList.add(t);
  var l = localStorage.getItem('locale');
  if (l !== 'ru' && l !== 'ro') l = 'ru';
  document.documentElement.setAttribute('lang', l);
})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
