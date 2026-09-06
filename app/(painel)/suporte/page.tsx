import { Icon } from "@/components/ui";
import SuporteView from "@/components/SuporteView";
import { getSistemas } from "@/lib/data";
import { listarTickets } from "@/lib/suporte";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Suporte() {
  const [sistemas, tickets] = await Promise.all([getSistemas(), listarTickets()]);
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }));
  const abertos = tickets.filter((t) => t.status !== "resolvido").length;

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Chamados <b>registrados por você</b> — problema, sugestão, erro ou dúvida — com anexo de print e histórico de atualizações. Ainda não vêm dos clientes finais de cada sistema; é o seu controle interno.
        </span>
      </div>
      <div className="sec-title"><h2 style={{ display: "none" }}>Suporte</h2><span className="c">{abertos} {abertos === 1 ? "aberto" : "abertos"} de {tickets.length}</span></div>
      <SuporteView sistemas={sisSimples} tickets={tickets} />
    </>
  );
}
