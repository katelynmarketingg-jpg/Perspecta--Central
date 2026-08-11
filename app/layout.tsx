import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getTickets, getPagamentos } from "@/lib/data";

export const metadata: Metadata = {
  title: "Perspecta Central",
  description: "Central de comando de todos os sistemas Perspecta",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const suporte = getTickets().filter((t) => t.st !== "resolvido").length;
  const pagamentos = getPagamentos().filter((p) => p.status === "falhou" || p.status === "vencido").length;
  return (
    <html lang="pt-BR">
      <body>
        <div className="app">
          <Sidebar badges={{ suporte, pagamentos }} />
          <div className="main">
            <Topbar />
            <div className="content">{children}</div>
          </div>
        </div>
      </body>
    </html>
  );
}
