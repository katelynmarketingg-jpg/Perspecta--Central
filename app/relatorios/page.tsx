import { Card, Kpi, Icon } from "@/components/ui";
import { RelatorioExport } from "@/components/RelatorioExport";
import { getResumoCusto } from "@/lib/gatilhos";
import { getClientesUnificados } from "@/lib/clientes";
import { BRL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const toNum = (v: any): number => {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export default async function Relatorios() {
  const [resumo, clientes] = await Promise.all([getResumoCusto(), getClientesUnificados()]);

  const receitaTotal = clientes.reduce((a, c) => a + toNum(c.valor), 0);
  const custoHoje = resumo.atualBrl;
  const custoPrev = resumo.previstoBrl;
  const lucroHoje = receitaTotal - custoHoje;
  const lucroPrev = receitaTotal - custoPrev;

  // Por sistema: receita (soma dos valores) e nº de empresas.
  const porSis = new Map<string, { cor: string; receita: number; empresas: number }>();
  for (const c of clientes) {
    const cur = porSis.get(c.sistema) || { cor: c.cor, receita: 0, empresas: 0 };
    cur.receita += toNum(c.valor); cur.empresas++; cur.cor = c.cor;
    porSis.set(c.sistema, cur);
  }
  const sistemasRank = [...porSis.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.receita - a.receita);
  const maxRec = Math.max(...sistemasRank.map((s) => s.receita), 1);

  const exportRows = sistemasRank.map((s) => ({
    Sistema: s.nome, Empresas: s.empresas, "Receita/mes": Math.round(s.receita),
  }));
  const exportCusto = resumo.itens.map((g) => ({
    Servico: g.servico, "Custo hoje": Math.round(g.custoAtualBrl), Pacote: g.pacote, "Custo previsto": Math.round(g.custoPrevistoBrl),
  }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Relatório <b>real</b> de todos os sistemas: receita, custo <b>hoje × previsto</b> e lucro. Exporte em <b>CSV</b> ou <b>PDF</b>.</span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' k="Receita / mês" v={BRL(receitaTotal)} />
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo hoje" v={custoHoje > 0 ? BRL(custoHoje) : "grátis"} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Custo previsto" v={BRL(custoPrev)} />
        <Kpi icon='<path d="M7 12l3 3 7-8"/>' k="Lucro hoje" v={BRL(lucroHoje)} />
      </div>

      <Card title="Financeiro — hoje × quando começar a pagar" hint="receita, custo e lucro nos dois cenários">
        <div className="tablewrap">
          <table>
            <thead><tr><th></th><th className="r">Receita</th><th className="r">Custo</th><th className="r">Lucro</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Hoje (infra grátis)</td>
                <td className="r num" style={{ color: "var(--good)" }}>{BRL(receitaTotal)}</td>
                <td className="r num">{custoHoje > 0 ? BRL(custoHoje) : "grátis"}</td>
                <td className="r num" style={{ fontWeight: 700, color: lucroHoje >= 0 ? "var(--good)" : "var(--crit)" }}>{BRL(lucroHoje)}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Quando pagar os pacotes</td>
                <td className="r num" style={{ color: "var(--good)" }}>{BRL(receitaTotal)}</td>
                <td className="r num" style={{ color: "var(--accent)", fontWeight: 650 }}>{BRL(custoPrev)}</td>
                <td className="r num" style={{ fontWeight: 700, color: lucroPrev >= 0 ? "var(--good)" : "var(--crit)" }}>{BRL(lucroPrev)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Custo por serviço — hoje × previsto" hint="de onde vem cada gasto"
        action={<RelatorioExport rows={exportCusto} filename="perspecta-custos" />}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Serviço</th><th className="r">Custo hoje</th><th>Pacote pago</th><th className="r">Custo previsto</th></tr></thead>
            <tbody>
              {resumo.itens.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{g.servico}</td>
                  <td className="r num" style={{ color: g.custoAtualBrl > 0 ? "var(--text)" : "var(--good)" }}>{g.custoAtualBrl > 0 ? BRL(g.custoAtualBrl) : "grátis"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{g.pacote}</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{g.custoPrevistoBrl > 0 ? BRL(g.custoPrevistoBrl) : "grátis"}</td>
                </tr>
              ))}
              {resumo.manualBrl > 0 && (
                <tr><td style={{ fontWeight: 600 }}>Custos adicionais (seus)</td><td className="r num">{BRL(resumo.manualBrl)}</td><td style={{ color: "var(--muted)", fontSize: 12.5 }}>cadastrados</td><td className="r num">{BRL(resumo.manualBrl)}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Por sistema — quem vende e quantas empresas" hint="receita e empresas por sistema"
        action={<RelatorioExport rows={exportRows} filename="perspecta-por-sistema" />}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Sistema</th><th className="r">Empresas</th><th className="r">Receita/mês</th><th>Participação</th></tr></thead>
            <tbody>
              {sistemasRank.map((s) => (
                <tr key={s.nome}>
                  <td><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{s.nome}</span></td>
                  <td className="r num">{s.empresas}</td>
                  <td className="r num" style={{ color: "var(--good)", fontWeight: 600 }}>{s.receita > 0 ? BRL(s.receita) : "—"}</td>
                  <td style={{ minWidth: 120 }}><div className="hbar-track"><div className="hbar-fill" style={{ width: (s.receita / maxRec) * 100 + "%", background: s.cor }} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>
          Receita = soma dos valores lidos em cada sistema. Onde ainda não há valor cadastrado, aparece "—".
        </div>
      </Card>
    </>
  );
}
