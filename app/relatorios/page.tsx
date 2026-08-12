import { Card, Kpi, Pill, Icon, Chart, Hbar, barChartSvg, areaChartSvg } from "@/components/ui";
import { RelatorioExport } from "@/components/RelatorioExport";
import { getSistemas, getEmpresas, receitaSistema, custoSistema, serie } from "@/lib/data";
import { planById } from "@/lib/data";
import { BRL, pct, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Relatorios() {
  const sistemas = await getSistemas();
  const empresas = getEmpresas();

  // Ranking por sistema — a ótica de empresário: quem vende melhor e quem dá mais lucro.
  const linhas = sistemas
    .map((s) => {
      const receita = receitaSistema(s.id);
      const custo = custoSistema(s.id);
      const lucro = receita - custo;
      const margem = receita > 0 ? lucro / receita : 0;
      const emps = empresas.filter((e) => e.sis === s.id && e.status !== "canc");
      const logins = emps.reduce((a, e) => a + e.adeptos, 0);
      const ticketMedio = emps.length ? receita / emps.length : 0;
      return { s, receita, custo, lucro, margem, empresas: emps.length, logins, ticketMedio };
    })
    .filter((l) => l.receita > 0 || l.custo > 0)
    .sort((a, b) => b.receita - a.receita);

  const totalReceita = linhas.reduce((a, l) => a + l.receita, 0);
  const totalCusto = linhas.reduce((a, l) => a + l.custo, 0);
  const totalLucro = totalReceita - totalCusto;
  const margemGeral = totalReceita > 0 ? totalLucro / totalReceita : 0;
  const maxReceita = Math.max(...linhas.map((l) => l.receita), 1);

  const lider = linhas[0];
  const comMargem = [...linhas].sort((a, b) => b.margem - a.margem);
  const melhorMargem = comMargem[0];
  const piorMargem = comMargem[comMargem.length - 1];

  // Top empresas por receita (ticket do plano atual).
  const topEmpresas = empresas
    .filter((e) => e.status !== "canc")
    .map((e) => ({ e, valor: planById(e.plano)?.valor || 0, sys: sistemas.find((s) => s.id === e.sis) }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 8);

  // Linhas prontas para export CSV.
  const exportRows = linhas.map((l) => ({
    Sistema: l.s.nome,
    Receita: l.receita,
    Custo: l.custo,
    Lucro: l.lucro,
    Margem: pct(l.margem),
    Empresas: l.empresas,
    Logins: l.logins,
    "Ticket medio": Math.round(l.ticketMedio),
  }));

  const growthDelta = serie.growth[serie.growth.length - 1] - serie.growth[0];

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/>' k="Receita recorrente (MRR)" v={BRL(totalReceita)} />
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo total" v={BRL(totalCusto)} />
        <Kpi icon='<path d="M7 12l3 3 7-8"/>' k="Lucro" v={BRL(totalLucro)} />
        <Kpi icon='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' k="Margem geral" v={pct(margemGeral)} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Relatório consolidado de todos os sistemas Perspecta. Receita = assinaturas ativas (MRR); custo vem das integrações quando conectadas, senão estimativa. Exporte em <b>CSV</b> ou <b>PDF</b> no topo de cada bloco.</span>
      </div>

      {/* Destaques */}
      <div className="row3">
        <Card title="Mais vende" hint="maior receita recorrente">
          <div className="card-b">
            {lider ? (
              <>
                <div className="sys-tag" style={{ fontSize: 15, fontWeight: 650 }}>
                  <span className="sd" style={{ background: lider.s.cor }} />{nomeCurto(lider.s.nome)}
                </div>
                <div className="v num" style={{ fontSize: 26, marginTop: 6, color: "var(--good)" }}>{BRL(lider.receita)}</div>
                <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>{lider.empresas} empresas · {lider.logins} logins</div>
              </>
            ) : <span style={{ color: "var(--faint)" }}>Sem dados</span>}
          </div>
        </Card>
        <Card title="Melhor margem" hint="mais lucrativo por real faturado">
          <div className="card-b">
            {melhorMargem ? (
              <>
                <div className="sys-tag" style={{ fontSize: 15, fontWeight: 650 }}>
                  <span className="sd" style={{ background: melhorMargem.s.cor }} />{nomeCurto(melhorMargem.s.nome)}
                </div>
                <div className="v num" style={{ fontSize: 26, marginTop: 6, color: "var(--accent)" }}>{pct(melhorMargem.margem)}</div>
                <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>lucro {BRL(melhorMargem.lucro)}/mês</div>
              </>
            ) : <span style={{ color: "var(--faint)" }}>Sem dados</span>}
          </div>
        </Card>
        <Card title="Atenção" hint="menor margem — revisar custo ou preço">
          <div className="card-b">
            {piorMargem ? (
              <>
                <div className="sys-tag" style={{ fontSize: 15, fontWeight: 650 }}>
                  <span className="sd" style={{ background: piorMargem.s.cor }} />{nomeCurto(piorMargem.s.nome)}
                </div>
                <div className="v num" style={{ fontSize: 26, marginTop: 6, color: piorMargem.margem < 0 ? "var(--crit)" : "var(--warn)" }}>{pct(piorMargem.margem)}</div>
                <div style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 4 }}>lucro {BRL(piorMargem.lucro)}/mês</div>
              </>
            ) : <span style={{ color: "var(--faint)" }}>Sem dados</span>}
          </div>
        </Card>
      </div>

      {/* Ranking */}
      <Card title="Ranking de sistemas — quem vende melhor"
        hint="ordenado por receita recorrente"
        action={<RelatorioExport rows={exportRows} filename="perspecta-relatorio-sistemas" />}>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>#</th><th>Sistema</th><th className="r">Receita</th><th className="r">Custo</th>
                <th className="r">Lucro</th><th className="r">Margem</th><th className="r">Empresas</th>
                <th className="r">Logins</th><th className="r">Ticket médio</th><th>Participação</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.s.id}>
                  <td className="num" style={{ color: "var(--faint)" }}>{i + 1}</td>
                  <td><span className="sys-tag"><span className="sd" style={{ background: l.s.cor }} />{nomeCurto(l.s.nome)}</span></td>
                  <td className="r num" style={{ color: "var(--good)" }}>{BRL(l.receita)}</td>
                  <td className="r num">{BRL(l.custo)}</td>
                  <td className="r num" style={{ color: l.lucro < 0 ? "var(--crit)" : "var(--text)", fontWeight: 600 }}>{BRL(l.lucro)}</td>
                  <td className="r num" style={{ color: l.margem < 0 ? "var(--crit)" : "var(--accent)", fontWeight: 650 }}>{pct(l.margem)}</td>
                  <td className="r num">{l.empresas}</td>
                  <td className="r num">{l.logins}</td>
                  <td className="r num">{BRL(l.ticketMedio)}</td>
                  <td style={{ minWidth: 120 }}>
                    <div className="hbar-track"><div className="hbar-fill" style={{ width: (l.receita / maxReceita) * 100 + "%", background: l.s.cor }} /></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Séries + top empresas */}
      <div className="row2">
        <Card title="Receita × Despesa" hint="últimos 7 meses (consolidado)">
          <Chart svg={barChartSvg(serie.meses, serie.receita, serie.despesa)} />
          <div className="card-b" style={{ display: "flex", gap: 16, fontSize: 12.5, color: "var(--muted)" }}>
            <span><span className="sd" style={{ background: "#e0713a" }} /> Receita</span>
            <span><span className="sd" style={{ background: "#e2604f" }} /> Despesa</span>
          </div>
        </Card>
        <Card title="Crescimento de clientes" hint={`+${growthDelta} no período`}>
          <Chart svg={areaChartSvg(serie.meses, serie.growth)} />
          <div className="card-b" style={{ fontSize: 12.5, color: "var(--muted)" }}>
            Total de empresas ativas por mês — tendência de aquisição.
          </div>
        </Card>
      </div>

      <div className="row2">
        <Card title="Receita por sistema" hint="participação no MRR">
          <Hbar rows={linhas.map((l) => ({
            name: nomeCurto(l.s.nome),
            color: l.s.cor,
            pctWidth: (l.receita / maxReceita) * 100,
            value: BRL(l.receita),
          }))} />
        </Card>
        <Card title="Top empresas por receita" hint="maiores tickets ativos"
          action={<RelatorioExport
            rows={topEmpresas.map((t) => ({ Empresa: t.e.nome, Sistema: t.sys?.nome || "", Plano: planById(t.e.plano)?.nome || "", Valor: t.valor, Status: t.e.status }))}
            filename="perspecta-relatorio-empresas" />}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th>Plano</th><th className="r">Valor/mês</th><th>Status</th></tr></thead>
              <tbody>
                {topEmpresas.map((t) => (
                  <tr key={t.e.id}>
                    <td style={{ fontWeight: 600 }}>{t.e.nome}</td>
                    <td>{t.sys ? <span className="sys-tag"><span className="sd" style={{ background: t.sys.cor }} />{nomeCurto(t.sys.nome)}</span> : "—"}</td>
                    <td style={{ color: "var(--muted)" }}>{planById(t.e.plano)?.nome || "—"}</td>
                    <td className="r num">{BRL(t.valor)}</td>
                    <td><Pill s={t.e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}
