import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getTickets, getPagamentos, getSistemas } from "@/lib/data";
import { nomeCurto } from "@/lib/format";

// Layout só do painel administrativo (atrás do login da equipe). Páginas
// públicas — /login, /cadastro, /primeiro-acesso, /pagamento — ficam FORA
// deste grupo e não recebem o menu lateral.
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const [pagamentosList, sistemas] = await Promise.all([getPagamentos(), getSistemas()]);
  const suporte = getTickets().filter((t) => t.st !== "resolvido").length;
  const pagamentos = pagamentosList.filter((p) => p.status === "falhou" || p.status === "vencido").length;
  const sisFiltro = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));
  return (
    <div className="app">
      <Sidebar badges={{ suporte, pagamentos }} />
      <div className="main">
        <Suspense fallback={null}><Topbar sistemas={sisFiltro} /></Suspense>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
