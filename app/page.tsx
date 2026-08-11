import { Card, Kpi, Chart, Pill, Hbar, Icon, barChartSvg, areaChartSvg } from "@/components/ui";
import {
  getSistemas, getEmpresas, getCustos, getPagamentos, getTickets,
  planById, receitaSistema, custoSistema, serie, integrationStatus, anyLive,
} from "@/lib/data";
import { BRL, pct, fmtStorage, nomeCurto, initials } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const sistemas = await getSistemas();
  const empresas = getEmpresas();
  const custos = getCustos();
  const pagamentos = getPagamentos();
  const tickets = getTickets();
  const st = integrationStatus();

  const ativas = empresas.filter((e) => e.status === "ativo").length;
  const mrr = empresas.filter((e) => e.status !== "canc").reduce((s, e) => s + (planById(e.plano)?.valor || 0), 0);
  const custoTotal = custos.reduce((s, c) => s + c.valor, 0);
  const lucro = mrr - custoTotal;
  const adeptos = empresas.reduce((s, e) => s + e.adeptos, 0);
  const storage = empresas.reduce((s, e) => s + e.usoStorage, 0);
  const ticketsAb = tickets.filter((t) => t.st !== "resolvido").length;
  const falhas = pagamentos.filter((p) => p.status === "falhou" || p.status === "vencido").length;

  const usageRows = sistemas.map((s) => ({
    name: nomeCurto(s.nome), color: s.cor,
    val: empresas.filter((e) => e.sis === s.id).reduce((a, e) => a + e.usoStorage, 0),
  }));
  const umax = Math.max(...usageRows.map((u) => u.val), 1);

  const marginRows = sistemas.map((s) => {
    const r = receitaSistema(s.id), c = custoSistema(s.id), m = r > 0 ? (r - c) / r : 0;
    return { name: nomeCurto(s.nome), color: s.cor, pctWidth: Math.max(0, Math.min(100, m * 100)), value: pct(m) };
  });

  const anyConfigured = st.supabase || st.vercel || st.mercadopago;

  return (
    <>
      {!anyLive() && (
        <div className="banner">
          <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
          <span>
            Rodando com <b>dados de exemplo</b>. Conecte as chaves em <b>Configurações → Integrações</b> (Supabase, Vercel, Mercado Pago) para os números virarem <b>ao vivo</b>.
          </span>
        </div>
      )}

      <div className="grid-kpi">
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas ativas" v={ativas} delta="+3 no mês" dir="up" />
        <Kpi icon='<line x1="12" y1="2" x2="12" y2="22"/><path d="M17 6C17 4 15 3 12 3"/>' k="Receita mensal (MRR)" v={BRL(mrr)} delta="+8,2%" dir="up" />
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custos de operação" v={BRL(custoTotal)} delta={"margem " + pct(mrr > 0 ? lucro / mrr : 0)} dir="flat" />
        <Kpi icon='<path d="M3 3v18h18"/><path d="M7 12l3 3 7-8"/>' k="Lucro estimado" v={BRL(lucro)} delta="+9,4%" dir="up" />
        <Kpi icon='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' k="Adeptos / logins" v={adeptos.toLocaleString("pt-BR")} delta="+62" dir="up" />
        <Kpi icon='<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>' k="Armazenamento" v={fmtStorage(storage)} delta="consolidado" dir="flat" />
        <Kpi icon='<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>' k="Tickets abertos" v={ticketsAb} delta="suporte" dir="flat" />
        <Kpi icon='<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' k="Pagamentos com falha" v={falhas} delta="exigem ação" dir={falhas > 0 ? "down" : "flat"} />
      </div>

      <div className="row2">
        <Card title="Receita × Despesa" hint="últimos 7 meses">
          <div className="card-b"><Chart svg={barChartSvg(serie.meses, serie.receita, serie.despesa)} /></div>
        </Card>
        <Card title="Uso por sistema" hint="armazenamento">
          <Hbar rows={usageRows.map((u) => ({ name: u.name, color: u.color, pctWidth: (u.val / umax) * 100, value: fmtStorage(u.val) }))} />
        </Card>
      </div>

      <div className="row2">
        <Card title="Empresas recentes" hint="consumo × limite e status">
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th>Consumo</th><th>Status</th></tr></thead>
              <tbody>
                {empresas.slice(0, 6).map((e) => {
                  const p = planById(e.plano);
                  const u = p ? Math.round((e.usoStorage / p.storage) * 100) : 0;
                  const sys = sistemas.find((s) => s.id === e.sis);
                  return (
                    <tr key={e.id}>
                      <td><div className="co"><div className="ci">{initials(e.nome)}</div><div className="cn">{e.nome}</div></div></td>
                      <td><span className="sys-tag"><span className="sd" style={{ background: sys?.cor }} />{nomeCurto(sys?.nome || "")}</span></td>
                      <td><div className="usage-cell"><span className="mini-track"><span className="mini-fill" style={{ width: Math.min(100, u) + "%", background: u >= 90 ? "var(--crit)" : u >= 75 ? "var(--warn)" : "var(--accent)" }} /></span><span className="p num">{u}%</span></div></td>
                      <td><Pill s={e.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card title="Margem por sistema" hint="receita − custos">
          <Hbar rows={marginRows} />
        </Card>
      </div>

      <div className="row2b">
        <Card title="Crescimento de clientes" hint="empresas ativas">
          <div className="card-b"><Chart svg={areaChartSvg(serie.meses, serie.growth)} /></div>
        </Card>
        <Card title="Saúde dos sistemas" hint="status atual">
          <div className="card-b">
            {sistemas.map((s) => (
              <div className="hbar-row" style={{ gridTemplateColumns: "1fr auto auto", gap: 10 }} key={s.id}>
                <div className="hbar-lab"><span className="sd" style={{ background: s.cor }} />{nomeCurto(s.nome)}</div>
                <Pill s={s.status} />
                <span className="hbar-val num">{s.uptime.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
