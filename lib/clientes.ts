import { unstable_cache } from "next/cache";
import { getSistemas } from "./data";
import { supabaseConfigured, getContasRows } from "./integrations/supabase";
import { firebaseConfigured, getBistroEstabelecimentos } from "./integrations/firebase";
import { creatorConfigured, getCreatorOrgs, creatorMe } from "./integrations/creator";
import { nomeCurto } from "./format";

// Leitura unificada das EMPRESAS que usam cada sistema (os clientes da
// Perspecta): tenants do Supabase (Commerce/Juris), estabelecimentos do Bistro
// e escritórios do Creator. NÃO são os "clientes dos clientes" nem registros
// internos — são as empresas que contratam cada sistema.

export type Cli = {
  nome: string; email: any; telefone: any; documento: any; valor: any;
  status: any; sistema: string; sistemaId: string; cor: string; fonte: string;
};

function pick(row: Record<string, any>, re: RegExp): any {
  for (const k of Object.keys(row)) {
    if (re.test(k) && row[k] != null && row[k] !== "") return row[k];
  }
  return null;
}

function normaliza(row: Record<string, any>, sistema: string, sistemaId: string, cor: string, fonte: string, nomeForcado?: string): Cli {
  return {
    nome: nomeForcado ?? String(pick(row, /^(name|nome|razao|fantasia|full_name|title|razao_social|nome_fantasia)/i) ?? pick(row, /nome|name/i) ?? row.id ?? "—"),
    email: pick(row, /email/i),
    telefone: pick(row, /phone|telefone|celular|whatsapp|fone/i),
    documento: pick(row, /cpf|cnpj|documento|tax_id/i),
    valor: pick(row, /valor|amount|preco|price|total|mensalidade|monthly|plan_price/i),
    status: pick(row, /status|situacao|situação|subscription/i),
    sistema, sistemaId, cor, fonte,
  };
}

async function _getClientesUnificados(): Promise<Cli[]> {
  const sistemas = await getSistemas();
  const ref = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  const nomeDe = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);
  const corDe = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";

  const [contas, bistroEst, orgsRes, me] = await Promise.all([
    ref && supabaseConfigured() ? getContasRows(ref) : Promise.resolve({ commerce: [], juris: [] }),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null }),
    creatorConfigured() ? creatorMe() : Promise.resolve(null),
  ]);

  const clientes: Cli[] = [];

  // Commerce (schema commerce) e Juris (schema public)
  for (const r of contas.commerce || []) clientes.push(normaliza(r, nomeDe("commerce"), "commerce", corDe("commerce"), "commerce-tenant"));
  for (const r of contas.juris || []) clientes.push(normaliza(r, nomeDe("juris"), "juris", corDe("juris"), "juris-tenant"));

  // Bistro: estabelecimentos
  for (const e of bistroEst || []) clientes.push(normaliza(e.dados, nomeDe("bistro"), "bistro", corDe("bistro"), "bistro-estabelecimento", e.nome));

  // Creator: escritórios (todos, se conta master) ou o escritório da conta atual
  if (orgsRes.orgs && orgsRes.orgs.length) {
    for (const o of orgsRes.orgs) clientes.push(normaliza(o, nomeDe("creator"), "creator", corDe("creator"), "creator-escritorio", o.name));
  } else if (me && (me as any).escritorio) {
    clientes.push(normaliza({}, nomeDe("creator"), "creator", corDe("creator"), "creator-escritorio", (me as any).escritorio));
  }

  return clientes;
}

export const getClientesUnificados = unstable_cache(_getClientesUnificados, ["clientes-unificados-v2"], { revalidate: 30 });

export async function getContagemPorSistema(): Promise<Record<string, number>> {
  const clientes = await getClientesUnificados();
  const out: Record<string, number> = {};
  for (const c of clientes) if (c.sistemaId) out[c.sistemaId] = (out[c.sistemaId] || 0) + 1;
  return out;
}

export function fontesConectadas(): number {
  return (supabaseConfigured() ? 1 : 0) + (firebaseConfigured() ? 1 : 0) + (creatorConfigured() ? 1 : 0);
}
