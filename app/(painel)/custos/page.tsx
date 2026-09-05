import { Card, Kpi, Icon, Pill } from "@/components/ui";
import CustosManuais from "@/components/CustosManuais";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import PlanosSalvos from "@/components/PlanosSalvos";
import Cupons from "@/components/Cupons";
import { CustoChart } from "@/components/CustoChart";
import { getResumoCusto } from "@/lib/gatilhos";
import { listarCustosManuais } from "@/lib/custos-manuais";
import { getSistemas } from "@/lib/data";
import { getClientesUnificados, getContagemPorSistema } from "@/lib/clientes";
import { listarCupons } from "@/lib/cupons";
import { listarPlanosCentral } from "@/lib/planos-central";
import { CAMBIO_USD_BRL } from "@/lib/precos";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ROTULO: Record<string, string> = {
  ok: "grátis", perto: "quase no limite", passou: "já paga", pago: "pago", medir: "grátis",
};

// Custo real por GB, por provedor onde cada sistema roda (US$/GB/mês).
const GB_USD: Record<string, number> = {
  commerce: 0.125, juris: 0.125, hub: 0.125, // Supabase
  creator: 0.25,                              // Render (disco)
  bistro: 5,                                  // Firebase (armazenamento)
  central: 0,
};

export default async function CustosEPlanos() {
  const [{ atualBrl, previstoBrl, itens, manualBrl }, sistemas, empresas, cupons, custosManuais, contagem, planosSalvos] = await Promise.all([
    getResumoCusto(),
    getSistemas(),
    getClientesUnificados(),
    listarCupons(),
    listarCustosManuais(),
    getContagemPorSistema(),
    listarPlanosCentral(),
  ]);
  const diff = previstoBrl - atualBrl;

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
        <span>Monte um plano de cada sistema com o <b>simulador</b> — armazenamento, logins e preço viram <b>custo real por GB</b>, <b>lucro</b> e <b>markup</b>, hoje e quando começar a pagar. Mais abaixo, o <b>custo de infra hoje × previsto</b> de tudo que roda por trás.</span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra hoje" v={atualBrl > 0 ? BRL(atualBrl) : "grátis"} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Custo previsto (pacotes pagos)" v={BRL(previstoBrl)} />
        <Kpi icon='<path d="M12 5v14M5 12h14"/>' k="Aumento quando pagar tudo" v={BRL(diff)} />
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas ativas" v={empresas.length} />
      </div>

      <SimuladorPlanos sistemas={sisSimples} cupons={cupons} />

      <PlanosSalvos planos={planosSalvos} sistemas={sisSimples} />

      <Cupons cupons={cupons} />

      <Card title="Custo por serviço — hoje × previsto" hint="quando o grátis acabar, entra o pacote pago">
        <div className="card-b">
          <CustoChart itens={itens.map((g) => ({ servico: g.servico, hoje: g.custoAtualBrl, previsto: g.custoPrevistoBrl }))} />
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Serviço</th><th>Situação</th><th className="r">Custo hoje</th><th>Pacote pago</th><th className="r">Custo previsto</th></tr>
            </thead>
            <tbody>
              {itens.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{g.servico}</td>
                  <td><Pill s={g.estado === "passou" || g.estado === "pago" ? "ativo" : g.estado === "perto" ? "warn" : "muted"} label={ROTULO[g.estado]} /></td>
                  <td className="r num" style={{ color: g.custoAtualBrl > 0 ? "var(--text)" : "var(--good)", fontWeight: 650 }}>{g.custoAtualBrl > 0 ? BRL(g.custoAtualBrl) : "grátis"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{g.pacote}</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{g.custoPrevistoBrl > 0 ? BRL(g.custoPrevistoBrl) : "grátis"}</td>
                </tr>
              ))}
              {manualBrl > 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>Custos adicionais (seus)</td>
                  <td><Pill s="ativo" label="pago" /></td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>cadastrados por você</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid var(--border-strong)" }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td />
                <td className="r num" style={{ fontWeight: 700 }}>{atualBrl > 0 ? BRL(atualBrl) : "grátis"}</td>
                <td />
                <td className="r num" style={{ fontWeight: 700, color: "var(--accent)" }}>{BRL(previstoBrl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--faint)" }}>
          "Previsto" assume todos os pacotes pagos ativos (Supabase Pro, Vercel Pro, etc.). Câmbio e preços conferidos em {itens[0]?.conferido || "—"} — fontes nas linhas da aba <b>Consumos</b>. Ajuste o câmbio em lib/precos se precisar.
        </div>
      </Card>

      <CustosManuais sistemas={sisSimples} custos={custosManuais} />
    </>
  );
}
