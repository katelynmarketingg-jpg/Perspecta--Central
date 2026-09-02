import * as mock from "./mock";
import type { Sistema, Plano, Empresa, Custo, Pagamento } from "./types";
import { unstable_cache } from "next/cache";
import { supabaseConfigured, getProjectHealth, getProjectDbSizeMb, runSupabaseQuery } from "./integrations/supabase";
import { vercelConfigured, getLastDeploy } from "./integrations/vercel";
import { mercadoPagoConfigured } from "./integrations/mercadopago";

// Provedor de dados central. Sistemas, custos e empresas vêm do banco real
// (schema `central` do Supabase compartilhado) quando configurado; caem para
// os dados de exemplo (mock.ts) só quando não há chave nenhuma.

export const planById = (id: string): Plano | undefined => mock.planos.find((p) => p.id === id);
export const sysById = (id: string): Sistema | undefined => mock.sistemas.find((s) => s.id === id);
export const empById = (lista: Empresa[], id: string): Empresa | undefined => lista.find((e) => e.id === id);

export const getPlanos = () => mock.planos;
export const getTickets = () => mock.tickets;
export const getLoginAttempts = () => mock.loginAttempts;
export const serie = mock.serie;

// Acha o projeto Supabase compartilhado a partir do catálogo de sistemas
// (evita import circular: convites.ts/custos-manuais.ts fazem o mesmo por `import()` dinâmico).
async function refCentral(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

// --- Sistemas ---------------------------------------------------------------

async function _getSistemasBase(): Promise<Sistema[]> {
  if (!supabaseConfigured()) return mock.sistemas;
  // Usa o ref fixo do projeto compartilhado (não pode chamar getSistemas() aqui: seria recursivo).
  const ref = mock.sistemas.find((s) => s.supabaseRef)?.supabaseRef;
  if (!ref) return mock.sistemas;
  const rows = await runSupabaseQuery(
    ref,
    `select s.id, s.nome, s.cor, s.url, s.repo_github, s.host, s.supabase_ref, s.banco,
            s.status, s.status_source, s.uptime, s.versao,
            coalesce(json_agg(json_build_object('t', i.titulo, 'sev', i.severidade, 'st', i.status, 'd', to_char(i.detectado_em, 'YYYY-MM-DD')))
                     filter (where i.id is not null), '[]') as bugs
     from central.sistemas s
     left join central.incidentes i on i.sistema_id = s.id and i.status <> 'resolvido'
     group by s.id
     order by s.id;`
  );
  if (!rows || rows.length === 0) return mock.sistemas;
  return rows.map((r: any) => ({
    id: String(r.id), nome: String(r.nome), cor: r.cor || "#8a7e6e", url: r.url || "",
    repo: r.repo_github || "", host: (r.host === "Render" ? "Render" : "Vercel") as Sistema["host"],
    supabaseRef: r.supabase_ref ?? null, banco: r.banco ?? null,
    status: (r.status || "sem_dados") as Sistema["status"], statusSource: (r.status_source || "manual") as Sistema["statusSource"],
    uptime: Number(r.uptime) || 0, versao: r.versao || "",
    ultimoDeploy: null, bugs: Array.isArray(r.bugs) ? r.bugs : [],
  }));
}

// Enriquecer sistemas com status ao vivo quando as integrações estiverem configuradas.
// Cacheado por 60s: usado em toda página, evita refazer as chamadas externas a cada navegação.
async function _getSistemas(): Promise<Sistema[]> {
  const base = await _getSistemasBase();
  return Promise.all(
    base.map(async (s) => {
      let status = s.status;
      let statusSource = s.statusSource;
      let ultimoDeploy = s.ultimoDeploy;
      let storageLiveMb = s.storageLiveMb;

      if (s.supabaseRef && supabaseConfigured()) {
        const h = await getProjectHealth(s.supabaseRef);
        if (h) { status = h.status; statusSource = "live"; }
        const mb = await getProjectDbSizeMb(s.supabaseRef);
        if (mb != null) storageLiveMb = mb;
      }
      if (s.host === "Vercel" && vercelConfigured()) {
        const d = await getLastDeploy(s.repo);
        if (d) {
          ultimoDeploy = d;
          if (d.estado === "erro") { status = "com_erro"; statusSource = "live"; }
          else if (statusSource !== "live") { status = "operacional"; statusSource = "live"; }
        }
      }
      return { ...s, status, statusSource, ultimoDeploy, storageLiveMb };
    })
  );
}

export const getSistemas = unstable_cache(_getSistemas, ["sistemas-enriched-v2"], { revalidate: 60 });

// --- Empresas & pagamentos (derivados dos convites reais) -------------------
// Enquanto não existe uma tabela de assinaturas totalmente ligada (central.empresas
// exige plano_id vindo de central.planos, que ainda não tem o catálogo migrado),
// as empresas "de verdade" do Central são os convites que já passaram do
// primeiro acesso — é o único lugar onde uma empresa vira cliente de fato hoje.

function diasEntre(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

async function _getEmpresas(): Promise<Empresa[]> {
  const { listarConvites } = await import("./convites");
  const convites = await listarConvites();
  return convites
    .filter((c) => c.status !== "pendente")
    .map((c) => {
      const status: Empresa["status"] =
        c.status === "ativo" ? "ativo" : c.status === "aguardando_pagamento" ? "inad" : c.status === "cancelado" ? "canc" : "pend";
      const carenciaDias = 7;
      let carenciaRestante: number | null = null;
      if (c.status === "aguardando_pagamento" && c.trialAte) {
        carenciaRestante = Math.max(0, carenciaDias - diasEntre(new Date(c.trialAte), new Date()));
      }
      return {
        id: c.id, nome: c.empresaNome, email: c.email, sis: c.sistemaId, plano: c.planoId,
        adeptos: 1, status, venc: c.trialAte ? new Date(c.trialAte).toLocaleDateString("pt-BR") : "",
        usoStorage: 0, usoReg: 0, usoLogins: c.loginCriadoEm ? 1 : 0,
        carenciaDias, carenciaRestante,
      } as Empresa;
    });
}
export const getEmpresas = unstable_cache(_getEmpresas, ["empresas-de-convites"], { revalidate: 30 });

async function _getPagamentos(): Promise<Pagamento[]> {
  const { listarConvites } = await import("./convites");
  const convites = await listarConvites();
  const out: Pagamento[] = [];
  for (const c of convites) {
    const plano = planById(c.planoId);
    const valor = plano?.valor || 0;
    if (c.status === "ativo" && c.ativadoEm) {
      out.push({ id: c.id + "_pago", emp: c.id, valor, status: "pago", metodo: "Cartão (Mercado Pago)", data: new Date(c.ativadoEm).toLocaleDateString("pt-BR") });
    } else if (c.status === "aguardando_pagamento" && c.trialAte) {
      out.push({ id: c.id + "_venc", emp: c.id, valor, status: "vencido", metodo: "—", data: new Date(c.trialAte).toLocaleDateString("pt-BR"), motivo: "Teste grátis acabou sem forma de pagamento cadastrada" });
    }
  }
  return out;
}
export const getPagamentos = unstable_cache(_getPagamentos, ["pagamentos-de-convites"], { revalidate: 30 });

// --- Custos (reais do banco + manuais cadastrados) --------------------------

async function _getCustos(): Promise<Custo[]> {
  const ref = await refCentral();
  if (!ref) return mock.custos;
  const rows = await runSupabaseQuery(ref, `select sistema_id, nome, valor, fonte, source from central.custos order by sistema_id nulls first;`);
  if (!rows) return mock.custos;
  const FONTES = ["Supabase", "Vercel", "Render", "Anthropic", "Outro"] as const;
  return rows.map((r: any) => ({
    sis: r.sistema_id ?? null, nome: String(r.nome), valor: Number(r.valor) || 0,
    fonte: (FONTES.includes(r.fonte) ? r.fonte : "Outro") as Custo["fonte"],
    source: (r.source || "manual") as Custo["source"],
  }));
}
export const getCustos = unstable_cache(_getCustos, ["custos-reais"], { revalidate: 60 });

// Receita mensal (MRR) de um sistema a partir das assinaturas ativas.
export function receitaSistema(empresas: Empresa[], sid: string): number {
  return empresas
    .filter((e) => e.sis === sid && e.status !== "canc")
    .reduce((sum, e) => sum + (planById(e.plano)?.valor || 0), 0);
}

export function custoSistema(custos: Custo[], sid: string): number {
  return custos.filter((c) => c.sis === sid).reduce((s, c) => s + c.valor, 0);
}

export function integrationStatus() {
  return {
    supabase: supabaseConfigured(),
    vercel: vercelConfigured(),
    mercadopago: mercadoPagoConfigured(),
  };
}

// Alguma integração de dados "ao vivo" configurada?
export function anyLive(): boolean {
  return supabaseConfigured() || vercelConfigured();
}
