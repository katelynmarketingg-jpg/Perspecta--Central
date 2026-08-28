import { Icon, Kpi } from "@/components/ui";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import { getSistemas } from "@/lib/data";
import { getResumoCusto } from "@/lib/gatilhos";
import { getClientesUnificados } from "@/lib/clientes";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Planos() {
  const [sistemas, resumo, empresas] = await Promise.all([
    getSistemas(),
    getResumoCusto(),
    getClientesUnificados(),
  ]);
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));
  const n = Math.max(empresas.length, 1);
  const rateioPagando = resumo.previstoBrl / n;

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Monte um plano: <b>sistema</b> + <b>insumos</b> + <b>preço de venda</b> → o Central calcula <b>lucro e margem</b>. Veja em dois cenários: <b>hoje</b> (infra grátis) e <b>se já pagássemos</b> os pacotes.</span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra hoje" v={resumo.atualBrl > 0 ? BRL(resumo.atualBrl) : "grátis"} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Se pagássemos os pacotes" v={BRL(resumo.previstoBrl)} />
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas ativas" v={empresas.length} />
        <Kpi icon='<path d="M12 2v20M2 12h20"/>' k="Rateio previsto / empresa" v={BRL(rateioPagando)} />
      </div>

      <SimuladorPlanos sistemas={sisSimples} rateioPagando={rateioPagando} />
    </>
  );
}
