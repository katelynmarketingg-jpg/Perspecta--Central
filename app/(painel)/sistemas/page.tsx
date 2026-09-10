import { Icon } from "@/components/ui";
import SistemaCard, { type SistemaCardData } from "@/components/SistemaCard";
import { getSistemas, getEmpresas, receitaSistema } from "@/lib/data";
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

// Banco de dados de cada sistema — vem direto de central.sistemas (real);
// só cai pro heurístico se o campo não estiver preenchido.
function bancoDe(banco: string | null | undefined, supabaseRef: string | null): { nome: string; cor: string } {
  if (banco) return { nome: banco, cor: /nenhum/i.test(banco) ? "var(--faint)" : "var(--good)" };
  if (supabaseRef) return { nome: "Supabase (Postgres)", cor: "var(--good)" };
  return { nome: "sem banco próprio", cor: "var(--faint)" };
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
  const [sistemas, empresas] = await Promise.all([getSistemas(), getEmpresas()]);
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
          const bistroLive = s.id === "bistro" && fireSt.ok;
          const status = creatorLive || bistroLive ? "operacional" : s.status;
          const source = creatorLive || bistroLive ? "live" : s.statusSource;
          const manual = s.host === "Render" && !creatorLive; // Juris continua manual; Creator não
          const contas: number | null = contasPorSistema[s.id] ?? null;
          const mrr = s.id === "creator" && mrrCreator != null ? mrrCreator : receitaSistema(empresas, s.id);
          const banco = bancoDe(s.banco, s.supabaseRef);
          const custo = custoInfra(s.host, true, s.host === "Render" ? renderCustoDoSistema(s.url) : null);
          const custoValor = custo.valor; // null = a confirmar
          const lucroValor = custoValor == null ? null : mrr - custoValor;
          const data: SistemaCardData = {
            id: s.id, cor: s.cor, inicial: nomeCurto(s.nome)[0] || "?", nome: s.nome, url: s.url,
            statusDot: dotColor(status), statusPill: status, source,
            contas, mrrText: BRL(mrr),
            hostLabel: `${s.host}${manual ? " (manual)" : creatorLive ? " (API)" : ""}`,
            repo: s.repo, supabaseRef: s.supabaseRef,
            ultimoDeploy: s.ultimoDeploy ? `${s.ultimoDeploy.estado} · ${s.ultimoDeploy.quando}` : null,
            bancoNome: banco.nome, bancoCor: banco.cor,
            custoText: custoValor === null ? "a confirmar" : custoValor === 0 ? "grátis" : BRL(custoValor),
            custoCor: custoValor === null ? "var(--warn)" : custoValor === 0 ? "var(--good)" : "var(--text)",
            lucroText: lucroValor === null ? "a confirmar" : BRL(lucroValor),
            lucroCor: lucroValor === null ? "var(--warn)" : lucroValor > 0 ? "var(--good)" : lucroValor < 0 ? "var(--crit)" : "var(--muted)",
            bugs: s.bugs.filter((b) => b.st !== "resolvido"),
          };
          return <SistemaCard key={s.id} {...data} />;
        })}
      </div>
    </>
  );
}
