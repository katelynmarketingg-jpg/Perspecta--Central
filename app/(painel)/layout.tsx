import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import { getTickets, getPagamentos } from "@/lib/data";

// Layout só do painel administrativo (atrás do login da equipe). Páginas
// públicas — /login, /cadastro, /primeiro-acesso, /pagamento — ficam FORA
// deste grupo e não recebem o menu lateral.
export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const pagamentosList = await getPagamentos();
  const suporte = getTickets().filter((t) => t.st !== "resolvido").length;
  const pagamentos = pagamentosList.filter((p) => p.status === "falhou" || p.status === "vencido").length;
  return (
    <div className="app">
      <Sidebar badges={{ suporte, pagamentos }} />
      <div className="main">
        <Topbar />
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
