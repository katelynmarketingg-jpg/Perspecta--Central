import { Icon, Kpi } from "@/components/ui";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import Cupons from "@/components/Cupons";
import { getSistemas } from "@/lib/data";
import { getResumoCusto } from "@/lib/gatilhos";
import { getClientesUnificados, getContagemPorSistema } from "@/lib/clientes";
import { listarCustosManuais } from "@/lib/custos-manuais";
import { listarCupons } from "@/lib/cupons";
import { CAMBIO_USD_BRL } from "@/lib/precos";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Custo real por GB, por provedor onde cada sistema roda (US$/GB/mês).
const GB_USD: Record<string, number> = {
  commerce: 0.125, juris: 0.125, hub: 0.125, // Supabase
  creator: 0.25,                              // Render (disco)
  bistro: 5,                                  // Firebase (armazenamento)
  central: 0,
};

export default async function Planos() {
  const [sistemas, resumo, empresas, cupons, custosManuais, contagem] = await Promise.all([
    getSistemas(),
    getResumoCusto(),
    getClientesUnificados(),
    listarCupons(),
    listarCustosManuais(),
    getContagemPorSistema(),
  ]);

  // Custos fixos que você adiciona (ex.: Claude) são rateados por empresa:
  // os de um sistema, pelas empresas daquele sistema; os "de todos", pelo total.
  const totalEmp = empresas.length;
  const manualGlobal = custosManuais.filter((c) => !c.sistemaId).reduce((a, c) => a + c.valorBrl, 0);
  const fixoPorEmpresa = (id: string) => {
    const doSis = custosManuais.filter((c) => c.sistemaId === id).reduce((a, c) => a + c.valorBrl, 0);
    const nSis = Math.max(contagem[id] || 0, 1);
    return doSis / nSis + (totalEmp > 0 ? manualGlobal / totalEmp : 0);
  };

  const sisSimples = sistemas.map((s) => ({
    id: s.id, nome: nomeCurto(s.nome), cor: s.cor,
    gbBrl: (GB_USD[s.id] ?? 0.125) * CAMBIO_USD_BRL,
    loginBrl: 0,
    fixoBrl: fixoPorEmpresa(s.id),
  }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Monte um plano de cada sistema: preencha <b>armazenamento e logins</b> e o preço — o Central calcula o <b>custo real por GB</b> daquele sistema, o <b>lucro</b> e o <b>markup</b>, hoje e quando começar a pagar. Cálculo automático.</span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra hoje (total)" v={resumo.atualBrl > 0 ? BRL(resumo.atualBrl) : "grátis"} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Se pagássemos os pacotes" v={BRL(resumo.previstoBrl)} />
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas ativas" v={empresas.length} />
      </div>

      <SimuladorPlanos sistemas={sisSimples} cupons={cupons} />

      <Cupons cupons={cupons} />
    </>
  );
}
