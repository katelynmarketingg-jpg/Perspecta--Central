import { Card, Kpi, Pill, Icon } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { getCreatorReceita, creatorStatus } from "@/lib/integrations/creator";
import { supabaseConfigured, getContagemContas } from "@/lib/integrations/supabase";
import { firebaseConfigured, firebaseStatus, getContagemContasBistro } from "@/lib/integrations/firebase";
import { renderConfigured, getRenderCustos } from "@/lib/integrations/render";
import { getGatilhos } from "@/lib/gatilhos";
import { listarConvites } from "@/lib/convites";
import { CAMBIO_USD_BRL } from "@/lib/precos";
import { BRL, pct, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const dotColor = (s: string) =>
  s === "operacional" ? "var(--good)" : s === "degradado" ? "var(--warn)" : s === "com_erro" ? "var(--crit)" : "var(--faint)";

export default async function Dashboard() {
  const sistemas = await getSistemas();
  const refSb = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;

  const [creatorRec, contasSb, bistroContas, renderRes, gatilhos, creatorSt, fireSt, convites] = await Promise.all([
    getCreatorReceita(),
    refSb && supabaseConfigured() ? getContagemContas(refSb) : Promise.resolve({ juris: null, commerce: null } as any),
    firebaseConfigured() ? getContagemContasBistro() : Promise.resolve({ n: null } as any),
    renderConfigured() ? getRenderCustos() : Promise.resolve({ custos: null } as any),
    getGatilhos(),
    creatorStatus(),
    firebaseStatus(),
    listarConvites(),
  ]);

  const contasPorSistema: Record<string, number | null> = {
    creator: creatorRec.receita?.total ?? null,
    juris: contasSb.juris ?? null,
    commerce: contasSb.commerce ?? null,
    bistro: bistroContas.n ?? null,
  };
  const totalContas = Object.values(contasPorSistema).reduce((a: number, n) => a + (n ?? 0), 0);

  const mrr = creatorRec.receita?.mrr ?? 0; // só o Creator tem receita ao vivo por ora
  const previsto = creatorRec.receita?.previsto ?? 0;
  const renderUsd = (renderRes.custos || []).reduce((a: number, c: any) => a + (c.totalUsd || 0), 0);
  const custoInfra = renderUsd * CAMBIO_USD_BRL; // Vercel/Supabase/Firebase grátis hoje
  const lucro = mrr - custoInfra;

  const alertas = gatilhos.filter((g) => g.estado === "perto" || g.estado === "passou");
  const conectados = [creatorSt.ok, fireSt.ok, supabaseConfigured(), renderConfigured()].filter(Boolean).length;

  // Convites que precisam de você agora: teste acabou sem pagamento, ou teste
  // acabando nos próximos 3 dias — pra você já ir avisando o cliente.
  const diasRestantes = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);
  const aguardandoPagamento = convites.filter((c) => c.status === "aguardando_pagamento");
  const trialAcabando = convites.filter((c) => {
    if (c.status !== "trial") return false;
    const d = diasRestantes(c.trialAte);
    return d != null && d <= 3;
  });
  const precisaAtencao = [...aguardandoPagamento, ...trialAcabando];

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Visão geral <b>ao vivo</b> de todos os sistemas Perspecta: contas, receita, custo de infra e lucro. Clique num bloco para ver o detalhe.</span>
      </div>

      <div className="grid-kpi">
        <a href="/sistemas" style={{ textDecoration: "none" }}><Kpi icon='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' k="Contas (empresas)" v={totalContas} /></a>
        <a href="/acessos" style={{ textDecoration: "none" }}><Kpi icon='<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' k="Receita / mês" v={BRL(mrr)} /></a>
        <a href="/consumos" style={{ textDecoration: "none" }}><Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra / mês" v={custoInfra > 0 ? BRL(custoInfra) : "grátis"} /></a>
        <a href="/custos" style={{ textDecoration: "none" }}><Kpi icon='<path d="M3 3v18h18"/><path d="M7 12l3 3 7-8"/>' k="Lucro / mês" v={BRL(lucro)} /></a>
        <a href="/acessos" style={{ textDecoration: "none" }}><Kpi icon='<circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 2"/>' k="Convites precisando de você" v={precisaAtencao.length} delta={precisaAtencao.length > 0 ? "resolver agora" : "tudo em dia"} dir={precisaAtencao.length > 0 ? "down" : "flat"} /></a>
      </div>

      {precisaAtencao.length > 0 && (
        <Card title="Precisa da sua atenção" hint="testes acabando ou já acabados sem pagamento" action={<a href="/acessos" className="selectlike" style={{ textDecoration: "none" }}>Resolver em Acessos</a>}>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {aguardandoPagamento.map((c) => {
              const s = sistemas.find((x) => x.id === c.sistemaId);
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 5, flex: "none", background: "var(--crit)" }} />
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.empresaNome}</div><div style={{ fontSize: 12.5, color: "var(--muted)" }}>Teste do {nomeCurto(s?.nome || c.sistemaId)} acabou e ainda não tem pagamento — mande o link de pagamento.</div></div>
                </div>
              );
            })}
            {trialAcabando.map((c) => {
              const s = sistemas.find((x) => x.id === c.sistemaId);
              const d = diasRestantes(c.trialAte);
              return (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 5, flex: "none", background: "var(--warn)" }} />
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{c.empresaNome}</div><div style={{ fontSize: 12.5, color: "var(--muted)" }}>Teste do {nomeCurto(s?.nome || c.sistemaId)} acaba em {d === 0 ? "hoje" : `${d} dia${d === 1 ? "" : "s"}`} — vale já avisar sobre o pagamento.</div></div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <div className="row2">
        <Card title="Onde está cada sistema" hint="hospedagem · status ao vivo · contas" action={<a href="/sistemas" className="selectlike" style={{ textDecoration: "none" }}>Ver tudo</a>}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Sistema</th><th>Onde roda</th><th>Status</th><th className="r">Contas</th><th className="r">Receita</th></tr></thead>
              <tbody>
                {sistemas.map((s) => {
                  const live = (s.id === "creator" && creatorSt.ok) || (s.host === "Firebase" && fireSt.ok);
                  const status = live ? "operacional" : s.status;
                  const c = contasPorSistema[s.id];
                  return (
                    <tr key={s.id}>
                      <td><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{nomeCurto(s.nome)}</span></td>
                      <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{s.host}</td>
                      <td><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor(status) }} /><span style={{ fontSize: 12.5 }}>{status === "operacional" ? "operacional" : status}</span></span></td>
                      <td className="r num">{c == null ? "—" : c}</td>
                      <td className="r num">{s.id === "creator" ? BRL(mrr) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Alertas de custo" hint="o que está perto de virar conta" action={<a href="/consumos" className="selectlike" style={{ textDecoration: "none" }}>Ver limites</a>}>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {alertas.length === 0 ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--good)", fontSize: 13.5 }}>
                <Icon path='<path d="M20 6 9 17l-5-5"/>' /> Tudo dentro do plano grátis. Nada virando conta agora.
              </div>
            ) : alertas.map((g, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", marginTop: 5, flex: "none", background: g.estado === "passou" ? "var(--crit)" : "var(--warn)" }} />
                <div><div style={{ fontWeight: 600, fontSize: 13 }}>{g.servico}</div><div style={{ fontSize: 12.5, color: "var(--muted)" }}>{g.mensagem}</div></div>
              </div>
            ))}
            {previsto > mrr && (
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 12.5, color: "var(--muted)" }}>
                Receita <b>prevista</b> se os testes virarem pagantes: <b style={{ color: "var(--text)" }}>{BRL(previsto)}</b>/mês.
              </div>
            )}
          </div>
        </Card>
      </div>

      <div style={{ fontSize: 12, color: "var(--faint)", padding: "4px 2px" }}>
        {conectados} integrações ao vivo · margem atual {mrr > 0 ? pct(lucro / mrr) : "—"} · receita por sistema além do Creator entra quando mapearmos as tabelas financeiras de cada um.
      </div>
    </>
  );
}
