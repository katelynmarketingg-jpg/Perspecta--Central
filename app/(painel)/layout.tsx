import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getPagamentos, getSistemas } from "@/lib/data";
import { listarTickets } from "@/lib/suporte";
import { listarConvites } from "@/lib/convites";
import { nomeCurto } from "@/lib/format";

// Layout só do painel administrativo (atrás do login da equipe). Páginas
// públicas — /login, /cadastro, /primeiro-acesso, /pagamento — ficam FORA
// deste grupo e não recebem o menu lateral.
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const [pagamentosList, sistemas, tickets, convites] = await Promise.all([getPagamentos(), getSistemas(), listarTickets(), listarConvites()]);
  const suporte = tickets.filter((t) => t.status !== "resolvido").length;
  const pagamentos = pagamentosList.filter((p) => p.status === "falhou" || p.status === "vencido").length;
  // Novo cliente: testes acabando em até 3 dias (hora de avisar sobre o pagamento).
  const convitesAtencao = convites.filter((c) => {
    if (c.status !== "trial" || !c.trialAte) return false;
    return Math.ceil((new Date(c.trialAte).getTime() - Date.now()) / 86400000) <= 3;
  }).length;
  const sisFiltro = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));
  return (
    <div className="app">
      <Sidebar badges={{ suporte, pagamentos, convites: convitesAtencao }} />
      <div className="main">
        <Suspense fallback={null}><Topbar sistemas={sisFiltro} /></Suspense>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
