import { Icon } from "@/components/ui";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import PlanosSalvos from "@/components/PlanosSalvos";
import Cupons from "@/components/Cupons";
import { listarCustosManuais } from "@/lib/custos-manuais";
import { getSistemas } from "@/lib/data";
import { getClientesUnificados, getContagemPorSistema } from "@/lib/clientes";
import { listarCupons } from "@/lib/cupons";
import { listarPlanosCentral } from "@/lib/planos-central";
import { CAMBIO_USD_BRL } from "@/lib/precos";
import { nomeCurto } from "@/lib/format";

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

// Planos & cupons: o lado de VENDA (o que você cobra). O lado de CUSTO (o que
// você paga pra manter tudo no ar) fica em Custos & despesas — antes os dois
// dividiam a mesma página e se misturavam.
export default async function PlanosECupons() {
  const [sistemas, empresas, cupons, custosManuais, contagem, planosSalvos] = await Promise.all([
    getSistemas(), getClientesUnificados(), listarCupons(), listarCustosManuais(), getContagemPorSistema(), listarPlanosCentral(),
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
        <span>Monte um plano de cada sistema com o <b>simulador</b> — armazenamento, logins e preço viram <b>custo real por GB</b>, <b>lucro</b> e <b>markup</b>. Os <b>planos salvos</b> aqui são os que aparecem ao gerar um convite em <a href="/convites" style={{ color: "var(--accent)", fontWeight: 600 }}>Novo cliente</a>.</span>
      </div>

      <SimuladorPlanos sistemas={sisSimples} cupons={cupons} />

      <PlanosSalvos planos={planosSalvos} sistemas={sisSimples} />

      <Cupons cupons={cupons} />
    </>
  );
}
