import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ui/providers";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import ru from "@/i18n/ru.json";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: ru["app.title"],
  description: ru["app.description"],
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
        <ErrorBoundary>
          <Providers>{children}</Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
