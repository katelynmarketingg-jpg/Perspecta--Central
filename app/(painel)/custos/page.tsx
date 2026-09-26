import { Card, Kpi, Icon, Pill, Fonte } from "@/components/ui";
import CustosManuais from "@/components/CustosManuais";
import DespesasView from "@/components/Despesas";
import { getResumoCusto } from "@/lib/gatilhos";
import { listarCustosManuais } from "@/lib/custos-manuais";
import { getSistemas } from "@/lib/data";
import { getClientesUnificados } from "@/lib/clientes";
import { listarDespesas, situacaoDespesa } from "@/lib/despesas";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ROTULO: Record<string, string> = {
  ok: "grátis", perto: "quase no limite", passou: "já paga", pago: "pago", medir: "grátis",
};

export default async function CustosEDespesas() {
  const [{ atualBrl, previstoBrl, itens, manualBrl }, sistemas, empresas, custosManuais, despesas] = await Promise.all([
    getResumoCusto(),
    getSistemas(),
    getClientesUnificados(),
    listarCustosManuais(),
    listarDespesas(),
  ]);
  const diff = previstoBrl - atualBrl;

  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));
  const despesasComSituacao = despesas.map((d) => ({ ...d, situacao: situacaoDespesa(d) }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Tudo que <b>sai</b> do caixa: o <b>custo de infra hoje × previsto</b> (quando o grátis acabar), os <b>custos fixos</b> que você cadastra (ex.: Claude) e as <b>despesas</b> com vencimento. Para montar preço de venda, use <a href="/planos" style={{ color: "var(--accent)", fontWeight: 600 }}>Planos & cupons</a>.</span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra hoje" v={atualBrl > 0 ? BRL(atualBrl) : "grátis"} tag={<Fonte tipo="misto" />} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Custo previsto (pacotes pagos)" v={BRL(previstoBrl)} tag={<Fonte tipo="estimativa" />} />
        <Kpi icon='<path d="M12 5v14M5 12h14"/>' k="Aumento quando pagar tudo" v={BRL(diff)} tag={<Fonte tipo="estimativa" />} />
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas ativas" v={empresas.length} tag={<Fonte tipo="vivo" />} />
      </div>

      <Card title="Custo por serviço — hoje × previsto" hint="quando o grátis acabar, entra o pacote pago">
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Serviço</th><th>Fonte</th><th>Situação</th><th className="r">Custo hoje</th><th>Pacote pago</th><th className="r">Custo previsto</th></tr>
            </thead>
            <tbody>
              {itens.map((g, i) => {
                const vivo = /render/i.test(g.servico); // Render é medido ao vivo; os demais vêm da tabela de preço
                return (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{g.servico}</td>
                  <td><Fonte tipo={vivo ? "vivo" : "estimativa"} /></td>
                  <td><Pill s={g.estado === "passou" || g.estado === "pago" ? "ativo" : g.estado === "perto" ? "warn" : "muted"} label={ROTULO[g.estado]} /></td>
                  <td className="r num" style={{ color: g.custoAtualBrl > 0 ? "var(--text)" : "var(--good)", fontWeight: 650 }}>{g.custoAtualBrl > 0 ? BRL(g.custoAtualBrl) : "grátis"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{g.pacote}</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{g.custoPrevistoBrl > 0 ? BRL(g.custoPrevistoBrl) : "grátis"}</td>
                </tr>
                );
              })}
              {manualBrl > 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>Custos adicionais (seus)</td>
                  <td><Fonte tipo="vivo" /></td>
                  <td><Pill s="ativo" label="pago" /></td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>cadastrados por você</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid var(--border-strong)" }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td />
                <td />
                <td className="r num" style={{ fontWeight: 700 }}>{atualBrl > 0 ? BRL(atualBrl) : "grátis"}</td>
                <td />
                <td className="r num" style={{ fontWeight: 700, color: "var(--accent)" }}>{BRL(previstoBrl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--faint)" }}>
          "Previsto" assume todos os pacotes pagos ativos (Supabase Pro, Vercel Pro, etc.). Câmbio e preços conferidos em {itens[0]?.conferido || "—"} — fontes nas linhas de <a href="/consumos" style={{ color: "var(--accent)" }}>Uso & limites</a>. Ajuste o câmbio em lib/precos se precisar.
        </div>
      </Card>

      <CustosManuais sistemas={sisSimples} custos={custosManuais} />

      <DespesasView sistemas={sisSimples} despesas={despesasComSituacao} />
    </>
  );
}
