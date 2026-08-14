import * as mock from "./mock";
import type { Sistema, Plano, Empresa } from "./types";
import { unstable_cache } from "next/cache";
import { supabaseConfigured, getProjectHealth, getProjectDbSizeMb } from "./integrations/supabase";
import { vercelConfigured, getLastDeploy } from "./integrations/vercel";
import { mercadoPagoConfigured } from "./integrations/mercadopago";

// Provedor de dados central. Hoje serve dados mock; conforme cada integração
// recebe chave, os campos correspondentes passam a vir "ao vivo".

export const planById = (id: string): Plano | undefined => mock.planos.find((p) => p.id === id);
export const sysById = (id: string): Sistema | undefined => mock.sistemas.find((s) => s.id === id);
export const empById = (id: string): Empresa | undefined => mock.empresas.find((e) => e.id === id);

export const getPlanos = () => mock.planos;
export const getEmpresas = () => mock.empresas;
export const getCustos = () => mock.custos;
export const getPagamentos = () => mock.pagamentos;
export const getLoginAttempts = () => mock.loginAttempts;
export const getTickets = () => mock.tickets;
export const serie = mock.serie;

// Enriquecer sistemas com status ao vivo quando as integrações estiverem configuradas.
// Cacheado por 60s: usado em toda página, evita refazer as chamadas externas a cada navegação.
async function _getSistemas(): Promise<Sistema[]> {
  return Promise.all(
    mock.sistemas.map(async (s) => {
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

export const getSistemas = unstable_cache(_getSistemas, ["sistemas-enriched"], { revalidate: 60 });

// Receita mensal (MRR) de um sistema a partir das assinaturas ativas.
export function receitaSistema(sid: string): number {
  return mock.empresas
    .filter((e) => e.sis === sid && e.status !== "canc")
    .reduce((sum, e) => sum + (planById(e.plano)?.valor || 0), 0);
}

export function custoSistema(sid: string): number {
  return mock.custos.filter((c) => c.sis === sid).reduce((s, c) => s + c.valor, 0);
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
