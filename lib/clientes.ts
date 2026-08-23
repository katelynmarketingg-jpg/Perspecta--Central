import { unstable_cache } from "next/cache";
import { getSistemas } from "./data";
import { supabaseConfigured, getClientRows } from "./integrations/supabase";
import { firebaseConfigured, getFirebaseClientDocs } from "./integrations/firebase";
import { creatorConfigured, getCreatorClients } from "./integrations/creator";
import { nomeCurto } from "./format";

// Leitura unificada dos clientes de todas as fontes conectadas (Supabase
// Commerce+Juris, Firebase/Bistro, Creator API). Usado na página de Clientes e
// para contar clientes por sistema nos cards de Infraestrutura.

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

function normaliza(row: Record<string, any>, sistema: string, sistemaId: string, cor: string, fonte: string): Cli {
  return {
    nome: String(pick(row, /^(name|nome|razao|fantasia|full_name|title|razao_social|nome_fantasia)/i) ?? pick(row, /nome|name/i) ?? row.id ?? "—"),
    email: pick(row, /email/i),
    telefone: pick(row, /phone|telefone|celular|whatsapp|fone/i),
    documento: pick(row, /cpf|cnpj|documento|tax_id/i),
    valor: pick(row, /valor|amount|preco|price|total|mensalidade|monthly/i),
    status: pick(row, /status|situacao|situação/i),
    sistema: String(pick(row, /^(sistema|system|app|produto|plataforma)$/i) ?? sistema),
    sistemaId,
    cor,
    fonte,
  };
}

const JURIS = /advog|jur[íi]dic|advocacia|processo|\boab\b|direito|criminal|escrit[óo]rio|c[áa]lculo|peticao|petição|karen/i;

async function _getClientesUnificados(): Promise<Cli[]> {
  const sistemas = await getSistemas();

  const refs = new Map<string, typeof sistemas>();
  for (const s of sistemas) {
    if (!s.supabaseRef) continue;
    refs.set(s.supabaseRef, [...(refs.get(s.supabaseRef) || []), s]);
  }
  const bistro = sistemas.find((s) => s.host === "Firebase");

  const [supa, fire, creatorRows] = await Promise.all([
    supabaseConfigured()
      ? Promise.all([...refs.entries()].map(async ([ref, sis]) => ({ sis, tabelas: await getClientRows(ref) })))
      : Promise.resolve([]),
    firebaseConfigured() ? getFirebaseClientDocs() : Promise.resolve(null),
    creatorConfigured() ? getCreatorClients() : Promise.resolve(null),
  ]);

  // Classifica um registro do banco compartilhado Commerce/Juris pelo conteúdo.
  function classifica(row: Record<string, any>, fonte: string, sisList: typeof sistemas): { nome: string; id: string; cor: string } {
    const juris = sisList.find((s) => s.id === "juris");
    const commerce = sisList.find((s) => s.id === "commerce");
    const texto = (fonte + " " + Object.values(row).filter((v) => typeof v === "string").join(" ")).toLowerCase();
    if (juris && JURIS.test(texto)) return { nome: nomeCurto(juris.nome), id: juris.id, cor: juris.cor };
    const alvo = commerce || juris || sisList[0];
    return { nome: alvo ? nomeCurto(alvo.nome) : "—", id: alvo?.id || "", cor: alvo?.cor || "var(--accent)" };
  }

  const clientes: Cli[] = [];
  for (const { sis, tabelas } of supa) {
    const compartilhado = sis.length > 1;
    const nomeSis = sis.map((x) => nomeCurto(x.nome)).join(" / ");
    const idSis = sis[0]?.id || "";
    const cor = sis[0]?.cor || "var(--accent)";
    for (const t of tabelas || [])
      for (const r of t.rows) {
        const c = compartilhado ? classifica(r, t.tabela, sis) : { nome: nomeSis, id: idSis, cor };
        clientes.push(normaliza(r, c.nome, c.id, c.cor, t.tabela));
      }
  }
  for (const c of fire || []) {
    const nomeSis = bistro ? nomeCurto(bistro.nome) : "Bistro";
    const cor = bistro?.cor || "var(--accent)";
    for (const r of c.rows) clientes.push(normaliza(r, nomeSis, bistro?.id || "bistro", cor, c.colecao));
  }
  const creatorSis = sistemas.find((s) => s.id === "creator");
  const creatorNome = creatorSis ? nomeCurto(creatorSis.nome) : "Creator";
  const creatorCor = creatorSis?.cor || "var(--accent)";
  for (const r of creatorRows || []) clientes.push(normaliza(r, creatorNome, "creator", creatorCor, "creator-api"));

  return clientes;
}

// Cacheado 30s: as fontes por baixo já têm cache próprio; isto evita refazer a
// classificação e a montagem a cada navegação.
export const getClientesUnificados = unstable_cache(_getClientesUnificados, ["clientes-unificados"], { revalidate: 30 });

// Quantos clientes reais cada sistema tem (por id de sistema).
export async function getContagemPorSistema(): Promise<Record<string, number>> {
  const clientes = await getClientesUnificados();
  const out: Record<string, number> = {};
  for (const c of clientes) if (c.sistemaId) out[c.sistemaId] = (out[c.sistemaId] || 0) + 1;
  return out;
}

export function fontesConectadas(): number {
  return (supabaseConfigured() ? 1 : 0) + (firebaseConfigured() ? 1 : 0) + (creatorConfigured() ? 1 : 0);
}
