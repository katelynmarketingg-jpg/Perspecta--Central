import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Perspecta Central",
  description: "Central de comando de todos os sistemas Perspecta",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
