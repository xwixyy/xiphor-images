import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Xiphor Images",
  description: "Простой хостинг изображений",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#120d1f",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
