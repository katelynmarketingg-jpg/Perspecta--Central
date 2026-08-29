import { Card, Pill, SourceTag, Icon } from "@/components/ui";
import { getSistemas, receitaSistema } from "@/lib/data";
import { creatorStatus, getCreatorReceita } from "@/lib/integrations/creator";
import { firebaseStatus, firebaseConfigured, getContagemContasBistro } from "@/lib/integrations/firebase";
import { supabaseConfigured, getContagemContas } from "@/lib/integrations/supabase";
import { renderConfigured, getRenderCustos, BRL_POR_USD, type RenderCusto } from "@/lib/integrations/render";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const dotColor = (s: string) =>
  s === "operacional" ? "var(--good)" : s === "degradado" ? "var(--warn)" : s === "com_erro" ? "var(--crit)" : "var(--faint)";

// Banco de dados de cada sistema (derivado do host e do supabaseRef).
function bancoDe(host: string, supabaseRef: string | null): { nome: string; nota: string; cor: string } {
  if (supabaseRef) return { nome: "Supabase", nota: "Postgres · plano Free · compartilhado Commerce+Juris", cor: "var(--good)" };
  if (host === "Firebase") return { nome: "Realtime Database", nota: "Firebase · plano Spark", cor: "var(--warn)" };
  return { nome: "sem banco próprio", nota: "ainda usa dados de exemplo", cor: "var(--faint)" };
}

// Custo real de infra hoje. Vercel/Firebase no grátis; Render lido ao vivo pela API.
function custoInfra(host: string, publicado: boolean, rc?: RenderCusto | null): { valor: number | null; nota: string } {
  if (!publicado) return { valor: 0, nota: "não publicado" };
  if (host === "Vercel") return { valor: 0, nota: "Vercel Hobby · grátis" };
  if (host === "Firebase") return { valor: 0, nota: "Firebase Spark · grátis" };
  if (host === "Render") {
    if (rc && rc.totalUsd != null) return { valor: rc.totalUsd * BRL_POR_USD, nota: `US$ ${rc.totalUsd.toFixed(2)}/mês · ${rc.detalhe}` };
    if (rc) return { valor: null, nota: `Render · ${rc.detalhe}` };
    return { valor: null, nota: "Render · confirmar tier" };
  }
  return { valor: 0, nota: "—" };
}

export default async function Infra() {
  const sistemas = await getSistemas();
  const refSb = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  const [creatorSt, fireSt, creatorRec, contasSb, bistroContas, renderCustos] = await Promise.all([
    creatorStatus(),
    firebaseStatus(),
    getCreatorReceita(),
    refSb && supabaseConfigured() ? getContagemContas(refSb) : Promise.resolve({ juris: null, commerce: null, candidatas: [] as any[] }),
    firebaseConfigured() ? getContagemContasBistro() : Promise.resolve({ n: null, candidatos: [] as any[] }),
    renderConfigured() ? getRenderCustos().then((r) => r.custos) : Promise.resolve(null),
  ]);
  const mrrCreator = creatorRec.receita?.mrr ?? null;

  // "Contas" (empresas que pagam/usam) por sistema, de fontes reais.
  const contasPorSistema: Record<string, number | null> = {
    creator: creatorRec.receita?.total ?? null,
    juris: contasSb.juris,
    commerce: contasSb.commerce,
    bistro: bistroContas.n,
  };

  // Acha o custo Render de um serviço pelo host (ex.: saas-agency-k9ft.onrender.com).
  function renderCustoDoSistema(url: string): RenderCusto | null {
    if (!renderCustos) return null;
    const host = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    return renderCustos.find((c) => c.servico.host?.toLowerCase() === host)
      || renderCustos.find((c) => c.servico.nome && host.includes(c.servico.nome.toLowerCase()))
      || null;
  }
  const custoTotal = sistemas.reduce((sum, s) => {
    const c = custoInfra(s.host, true, s.host === "Render" ? renderCustoDoSistema(s.url) : null);
    return sum + (c.valor ?? 0);
  }, 0);
  const temRenderAConfirmar = sistemas.some((s) => s.host === "Render" && custoInfra(s.host, true, renderCustoDoSistema(s.url)).valor === null);

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Status <b>ao vivo</b>: Supabase e Vercel pelas chaves, o <b>Creator</b> pela API própria e o <b>Bistro</b> pelo Firebase. Só o <b>Juris</b> (Render) ainda é <b>manual</b> até termos uma forma de medir o Render. Custo total de infra hoje: <b>{BRL(custoTotal)}{temRenderAConfirmar ? " + Render (a confirmar)" : ""}</b>.
        </span>
      </div>

      <div className="sys-grid">
        {sistemas.map((s) => {
          // Creator conecta pela API própria; Bistro pelo Firebase — refletir "ao vivo".
          const creatorLive = s.id === "creator" && creatorSt.ok;
          const bistroLive = s.host === "Firebase" && fireSt.ok;
          const status = creatorLive || bistroLive ? "operacional" : s.status;
          const source = creatorLive || bistroLive ? "live" : s.statusSource;
          const manual = s.host === "Render" && !creatorLive; // Juris continua manual; Creator não
          // "Contas" = empresas que pagam/usam o sistema (fontes reais por sistema).
          const contas: number | null = contasPorSistema[s.id] ?? null;
          const mrr = s.id === "creator" && mrrCreator != null ? mrrCreator : receitaSistema(s.id);
          const openBugs = s.bugs.filter((b) => b.st !== "resolvido").length;
          const banco = bancoDe(s.host, s.supabaseRef);
          const custo = custoInfra(s.host, true, s.host === "Render" ? renderCustoDoSistema(s.url) : null);
          return (
            <div className="card sys-card" key={s.id}>
              <div className="sys-top">
                <div className="sys-logo" style={{ background: `linear-gradient(135deg,${s.cor},${s.cor}cc)` }}>{nomeCurto(s.nome)[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="sys-name">{s.nome}</div>
                  <div className="sys-url">{s.url}</div>
                </div>
                <span className="health-dot" style={{ background: dotColor(s.status) }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pill s={status} /><SourceTag source={source} />
              </div>

              <div className="sys-stats" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
                <div className="sys-stat"><div className="n num">{contas == null ? "—" : contas}</div><div className="l">Empresas</div></div>
                <div className="sys-stat"><div className="n num">{BRL(mrr)}</div><div className="l">Receita / mês</div></div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Hospedagem</span><b style={{ color: "var(--text)" }}>{s.host}{manual ? " (manual)" : creatorLive ? " (API)" : ""}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Repositório</span><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.repo}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Supabase</span><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.supabaseRef || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Último deploy</span><span>{s.ultimoDeploy ? `${s.ultimoDeploy.estado} · ${s.ultimoDeploy.quando}` : "sem dados"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Banco de dados</span><span style={{ color: banco.cor, fontWeight: 600 }}>{banco.nome}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Custo infra / mês</span><span className="num" style={{ fontWeight: 650, color: custo.valor === null ? "var(--warn)" : custo.valor === 0 ? "var(--good)" : "var(--text)" }}>{custo.valor === null ? "a confirmar" : custo.valor === 0 ? "grátis" : BRL(custo.valor)}</span></div>
              </div>

              {openBugs > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.bugs.filter((b) => b.st !== "resolvido").map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flex: "none", background: b.sev === "alta" ? "var(--crit)" : b.sev === "media" ? "var(--warn)" : "var(--info)" }} />
                      <div><div style={{ color: "var(--text)", fontWeight: 600 }}>{b.t}</div><div style={{ color: "var(--faint)" }}>{b.d} · {b.st}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
