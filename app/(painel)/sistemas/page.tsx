import { Icon } from "@/components/ui";
import SistemaCard, { type SistemaCardData } from "@/components/SistemaCard";
import { getSistemas, getEmpresas, receitaSistema } from "@/lib/data";
import { creatorStatus, getCreatorReceita } from "@/lib/integrations/creator";
import { firebaseStatus, firebaseConfigured, getContagemContasBistro, getFirebaseSizeMb, getBistroEstabelecimentos } from "@/lib/integrations/firebase";
import { supabaseConfigured, getContagemContas, getProjectDbSizeMb } from "@/lib/integrations/supabase";
import { renderConfigured, getRenderCustos, BRL_POR_USD, type RenderCusto } from "@/lib/integrations/render";
import { listarDetalhes } from "@/lib/sistema-detalhes";
import { ultimoUsoPorEmpresa } from "@/lib/uso-consumo";
import { CAMBIO_USD_BRL } from "@/lib/precos";
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
  const [creatorSt, fireSt, creatorRec, contasSb, bistroContas, renderCustos, sharedDbMb, bistroMb, detalhes, usoAcessos, bistroEst] = await Promise.all([
    creatorStatus(),
    firebaseStatus(),
    getCreatorReceita(),
    refSb && supabaseConfigured() ? getContagemContas(refSb) : Promise.resolve({ juris: null, commerce: null, candidatas: [] as any[] }),
    firebaseConfigured() ? getContagemContasBistro() : Promise.resolve({ n: null, candidatos: [] as any[] }),
    renderConfigured() ? getRenderCustos().then((r) => r.custos) : Promise.resolve(null),
    refSb && supabaseConfigured() ? getProjectDbSizeMb(refSb) : Promise.resolve(null),
    firebaseConfigured() ? getFirebaseSizeMb() : Promise.resolve(null),
    listarDetalhes(),
    ultimoUsoPorEmpresa(),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
  ]);
  const mrrCreator = creatorRec.receita?.mrr ?? null;

  // Custo por GB padrão (sugestão) por provedor — ela ajusta por sistema depois.
  const GB_USD: Record<string, number> = { commerce: 0.125, juris: 0.125, hub: 0.125, creator: 0.25, bistro: 5, central: 0 };
  const custoPorGbPadrao = (id: string) => (GB_USD[id] ?? 0.125) * CAMBIO_USD_BRL;

  // Armazenamento POR EMPRESA de cada sistema (visão multi-empresa):
  //  - o que cada sistema reporta por empresa via uso.medido (metrica storage_gb);
  //  - Bistro ao vivo: o tamanho do nó de cada estabelecimento no Firebase.
  const breakdown: Record<string, { empresa: string; gb: number; limite: number | null }[]> = {};
  for (const u of usoAcessos.filter((x) => x.metrica === "storage_gb")) {
    (breakdown[u.sistemaId] ||= []).push({ empresa: u.empresaRef || "—", gb: Number(u.valor) || 0, limite: u.limite != null ? Number(u.limite) : null });
  }
  if (bistroEst && bistroEst.length) {
    breakdown["bistro"] = bistroEst.map((e) => ({
      empresa: e.nome,
      gb: Buffer.byteLength(JSON.stringify(e.dados ?? {}), "utf8") / (1024 * 1024 * 1024),
      limite: null,
    }));
  }
  // Uso total do sistema: soma das empresas quando há desmembramento; senão o
  // tamanho do banco (Supabase compartilhado) ou do Firebase como total.
  const usoGbDe = (id: string, supabaseRef: string | null): number | null => {
    const bd = breakdown[id];
    if (bd && bd.length) return Math.round(bd.reduce((a, x) => a + x.gb, 0) * 1000) / 1000;
    if (supabaseRef && sharedDbMb != null) return Math.round((sharedDbMb / 1024) * 100) / 100;
    if (id === "bistro" && bistroMb != null) return Math.round((bistroMb / 1024) * 100) / 100;
    return null;
  };

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
          // Armazenamento: uso real (onde dá) × limite comprado (ela define) × custo/GB.
          const det = detalhes[s.id];
          const usoGb = usoGbDe(s.id, s.supabaseRef);
          const limiteGb = det?.limiteGb ?? null;
          const custoPorGb = det?.custoPorGbBrl ?? custoPorGbPadrao(s.id);
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
            usoGb, limiteGb, custoPorGbBrl: custoPorGb, armazCompartilhadoSupabase: Boolean(s.supabaseRef),
            breakdown: (breakdown[s.id] || []).slice().sort((a, b) => b.gb - a.gb),
            tokenNome: det?.tokenNome ?? null, tokenExpira: det?.tokenExpira ?? false, tokenExpiraEm: det?.tokenExpiraEm ?? null,
            bugs: s.bugs.filter((b) => b.st !== "resolvido"),
          };
          return <SistemaCard key={s.id} {...data} />;
        })}
      </div>
    </>
  );
}
