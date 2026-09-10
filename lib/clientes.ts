import { unstable_cache } from "next/cache";
import { getSistemas } from "./data";
import { firebaseConfigured, getBistroEstabelecimentos } from "./integrations/firebase";
import { creatorConfigured, getCreatorOrgs, creatorMe } from "./integrations/creator";
import { commerceConfigured, listarLojasCommerce } from "./integrations/commerce";
import { jurisConfigured, listarEscritoriosJuris } from "./integrations/juris";
import { nomeCurto } from "./format";

// Leitura unificada das EMPRESAS que usam cada sistema (os clientes da
// Perspecta): tenants do Supabase (Commerce/Juris), estabelecimentos do Bistro
// e escritórios do Creator. NÃO são os "clientes dos clientes" nem registros
// internos — são as empresas que contratam cada sistema.

export type Cli = {
  nome: string; email: any; telefone: any; documento: any; valor: any;
  status: any; sistema: string; sistemaId: string; cor: string; fonte: string;
  criadoEm: string | null;
};

function pick(row: Record<string, any>, re: RegExp): any {
  for (const k of Object.keys(row)) {
    if (re.test(k) && row[k] != null && row[k] !== "") return row[k];
  }
  return null;
}

// Data de criação, quando o sistema de origem manda uma — não inventamos
// uma data para quem não tem; esse cliente simplesmente fica de fora dos
// relatórios que dependem de "quando chegou".
function pickData(row: Record<string, any>): string | null {
  const v = pick(row, /created_at|criado_em|inserted_at|data_cadastro|createdat|joined_at|signup/i);
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function normaliza(row: Record<string, any>, sistema: string, sistemaId: string, cor: string, fonte: string, nomeForcado?: string): Cli {
  return {
    nome: nomeForcado ?? String(pick(row, /^(name|nome|razao|fantasia|full_name|title|razao_social|nome_fantasia)/i) ?? pick(row, /nome|name/i) ?? row.id ?? "—"),
    email: pick(row, /email/i),
    telefone: pick(row, /phone|telefone|celular|whatsapp|fone/i),
    documento: pick(row, /cpf|cnpj|documento|tax_id/i),
    valor: pick(row, /valor|amount|preco|price|total|mensalidade|monthly|plan_price/i),
    status: pick(row, /status|situacao|situação|subscription/i),
    criadoEm: pickData(row),
    sistema, sistemaId, cor, fonte,
  };
}

async function _getClientesUnificados(): Promise<Cli[]> {
  const sistemas = await getSistemas();
  const nomeDe = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);
  const corDe = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";

  const [lojasCommerce, escritoriosJuris, bistroEst, orgsRes, me] = await Promise.all([
    commerceConfigured() ? listarLojasCommerce() : Promise.resolve(null),
    jurisConfigured() ? listarEscritoriosJuris() : Promise.resolve(null),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null }),
    creatorConfigured() ? creatorMe() : Promise.resolve(null),
  ]);

  const clientes: Cli[] = [];

  // Commerce: contas de acesso reais (Supabase Auth do projeto do Commerce).
  // Juris: escritórios via API master (Render). Cada um da SUA fonte — não do
  // Management API do schema compartilhado (que mistura Juris/Commerce).
  for (const c of lojasCommerce || []) clientes.push(normaliza({ created_at: c.criado }, nomeDe("commerce"), "commerce", corDe("commerce"), "commerce-conta", c.nome));
  for (const j of escritoriosJuris || []) clientes.push(normaliza(j as any, nomeDe("juris"), "juris", corDe("juris"), "juris-escritorio", j.nome));

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

export const getClientesUnificados = unstable_cache(_getClientesUnificados, ["clientes-unificados-v3"], { revalidate: 180 });

export async function getContagemPorSistema(): Promise<Record<string, number>> {
  const clientes = await getClientesUnificados();
  const out: Record<string, number> = {};
  for (const c of clientes) if (c.sistemaId) out[c.sistemaId] = (out[c.sistemaId] || 0) + 1;
  return out;
}

export function fontesConectadas(): number {
  return (supabaseConfigured() ? 1 : 0) + (firebaseConfigured() ? 1 : 0) + (creatorConfigured() ? 1 : 0);
}
