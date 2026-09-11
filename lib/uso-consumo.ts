import { unstable_cache } from "next/cache";
import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Consumo real de cada cliente frente ao plano dele — alimentado pelos
// próprios sistemas via webhook (tipo "uso.medido", ver lib/webhooks.ts),
// do mesmo jeito que login/alerta já chegam. Sem número calculado aqui:
// só o que cada sistema mediu de verdade e mandou (valor e, quando o
// sistema souber, o limite do plano dele — sem tabela de planos duplicada
// aqui na Central).

export type UsoRegistro = {
  id: string; sistemaId: string; empresaRef: string; metrica: string;
  valor: number; limite: number | null; plano: string | null; medidoEm: string;
};

const METRICA_LABEL: Record<string, string> = {
  storage_gb: "Armazenamento (GB)", logins: "Acessos (logins)",
};
export function rotuloMetrica(m: string): string {
  return METRICA_LABEL[m] || m;
}

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.uso_consumo (
      id uuid primary key default gen_random_uuid(),
      sistema_id text not null,
      empresa_ref text not null,
      metrica text not null,
      valor numeric not null,
      limite numeric,
      plano text,
      medido_em timestamptz not null default now()
    );`);
}

function linha(x: any): UsoRegistro {
  return {
    id: String(x.id), sistemaId: String(x.sistema_id), empresaRef: String(x.empresa_ref),
    metrica: String(x.metrica), valor: Number(x.valor) || 0,
    limite: x.limite != null ? Number(x.limite) : null,
    plano: x.plano ?? null, medidoEm: x.medido_em,
  };
}

// A leitura mais recente de cada (sistema, empresa, métrica) — "o que cada
// acesso está usando agora".
async function _ultimoUsoPorEmpresa(): Promise<UsoRegistro[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(
    r,
    `select distinct on (sistema_id, empresa_ref, metrica) id, sistema_id, empresa_ref, metrica, valor, limite, plano, medido_em
     from central.uso_consumo
     order by sistema_id, empresa_ref, metrica, medido_em desc;`
  );
  return (rows || []).map(linha);
}

// Série histórica de uma métrica de uma empresa — para o gráfico de linha.
export async function historicoUso(sistemaId: string, empresaRef: string, metrica: string, maxLinhas = 30): Promise<UsoRegistro[]> {
  const r = await ref();
  if (!r) return [];
  const sid = sistemaId.replace(/'/g, "''");
  const emp = empresaRef.replace(/'/g, "''");
  const met = metrica.replace(/'/g, "''");
  const rows = await runSupabaseQuery(
    r,
    `select id, sistema_id, empresa_ref, metrica, valor, limite, plano, medido_em from central.uso_consumo
     where sistema_id = '${sid}' and empresa_ref = '${emp}' and metrica = '${met}'
     order by medido_em desc limit ${Math.max(1, Math.min(200, maxLinhas))};`
  );
  return (rows || []).map(linha).reverse();
}

export const ultimoUsoPorEmpresa = unstable_cache(_ultimoUsoPorEmpresa, ["uso-ultimo"], { revalidate: 120, tags: ["acessos-dados"] });
