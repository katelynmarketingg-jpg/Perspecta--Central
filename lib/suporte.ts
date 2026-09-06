import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Chamados de suporte — registro interno da Perspecta (não vem dos clientes
// finais de cada sistema ainda). Self-provisionado no schema `central`, mesmo
// padrão de central.custos_manuais e central.despesas. Anexo (print) fica
// como data URI dentro da própria mensagem — sem precisar de um bucket de
// Storage à parte.

export type Categoria = "problema" | "sugestao" | "erro" | "duvida";
export type Prioridade = "alta" | "media" | "baixa";
export type StatusTicket = "aberto" | "andamento" | "resolvido";

export type Mensagem = {
  id: string; ticketId: string; autor: string; texto: string;
  anexoBase64: string | null; anexoNome: string | null; criadoEm: string;
};

export type Ticket = {
  id: string; assunto: string; categoria: Categoria; prioridade: Prioridade; status: StatusTicket;
  sistemaId: string | null; empresaRef: string | null; criadoEm: string; atualizadoEm: string;
  mensagens: Mensagem[];
};

const CATEGORIAS: Categoria[] = ["problema", "sugestao", "erro", "duvida"];
const PRIORIDADES: Prioridade[] = ["alta", "media", "baixa"];
const STATUSES: StatusTicket[] = ["aberto", "andamento", "resolvido"];

// ~1.4MB em base64 ≈ 1MB de arquivo original — dá pra um print de tela sem pesar a tabela.
const MAX_ANEXO_LEN = 1_400_000;

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.tickets_suporte (
      id uuid primary key default gen_random_uuid(),
      assunto text not null,
      categoria text not null default 'problema',
      prioridade text not null default 'media',
      status text not null default 'aberto',
      sistema_id text,
      empresa_ref text,
      criado_em timestamptz not null default now(),
      atualizado_em timestamptz not null default now()
    );
    create table if not exists central.mensagens_ticket (
      id uuid primary key default gen_random_uuid(),
      ticket_id uuid not null,
      autor text not null default 'Você',
      texto text not null default '',
      anexo_base64 text,
      anexo_nome text,
      criado_em timestamptz not null default now()
    );`);
}

function esc(s: string, max = 2000): string {
  return s.trim().slice(0, max).replace(/'/g, "''");
}
function idSafe(id: string): string {
  return id.replace(/[^a-f0-9-]/gi, "");
}

export async function listarTickets(): Promise<Ticket[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const [tickets, mensagens] = await Promise.all([
    runSupabaseQuery(r, `select id, assunto, categoria, prioridade, status, sistema_id, empresa_ref, criado_em, atualizado_em from central.tickets_suporte order by atualizado_em desc;`),
    runSupabaseQuery(r, `select id, ticket_id, autor, texto, anexo_base64, anexo_nome, criado_em from central.mensagens_ticket order by criado_em;`),
  ]);
  const porTicket = new Map<string, Mensagem[]>();
  for (const m of mensagens || []) {
    const tid = String(m.ticket_id);
    const lista = porTicket.get(tid) || [];
    lista.push({
      id: String(m.id), ticketId: tid, autor: m.autor || "Você", texto: m.texto || "",
      anexoBase64: m.anexo_base64 ?? null, anexoNome: m.anexo_nome ?? null, criadoEm: m.criado_em,
    });
    porTicket.set(tid, lista);
  }
  return (tickets || []).map((t: any) => ({
    id: String(t.id), assunto: String(t.assunto), categoria: (t.categoria || "problema") as Categoria,
    prioridade: (t.prioridade || "media") as Prioridade, status: (t.status || "aberto") as StatusTicket,
    sistemaId: t.sistema_id ?? null, empresaRef: t.empresa_ref ?? null,
    criadoEm: t.criado_em, atualizadoEm: t.atualizado_em,
    mensagens: porTicket.get(String(t.id)) || [],
  }));
}

export async function criarTicket(input: {
  assunto: string; categoria: Categoria; prioridade: Prioridade;
  sistemaId: string | null; empresaRef: string | null; mensagem: string;
  anexoBase64?: string | null; anexoNome?: string | null;
}): Promise<{ ok: boolean; erro?: string; id?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!input.assunto?.trim()) return { ok: false, erro: "Informe o assunto." };
  if (!input.mensagem?.trim()) return { ok: false, erro: "Descreva o problema, a sugestão ou a dúvida." };
  if (!CATEGORIAS.includes(input.categoria)) return { ok: false, erro: "Categoria inválida." };
  if (!PRIORIDADES.includes(input.prioridade)) return { ok: false, erro: "Prioridade inválida." };
  if (input.anexoBase64 && input.anexoBase64.length > MAX_ANEXO_LEN) return { ok: false, erro: "Anexo grande demais (limite ~1MB)." };
  await ensure(r);
  const sisSafe = input.sistemaId ? `'${input.sistemaId.replace(/[^a-z0-9_-]/gi, "")}'` : "null";
  const empSafe = input.empresaRef ? `'${esc(input.empresaRef, 200)}'` : "null";
  const rows = await runSupabaseQuery(
    r,
    `insert into central.tickets_suporte (assunto, categoria, prioridade, sistema_id, empresa_ref)
     values ('${esc(input.assunto, 200)}', '${input.categoria}', '${input.prioridade}', ${sisSafe}, ${empSafe})
     returning id;`
  );
  const id = rows?.[0]?.id ? String(rows[0].id) : null;
  if (!id) return { ok: false, erro: "Não foi possível criar o chamado." };
  const anexoSafe = input.anexoBase64 ? `'${input.anexoBase64.replace(/'/g, "''")}'` : "null";
  const anexoNomeSafe = input.anexoNome ? `'${esc(input.anexoNome, 200)}'` : "null";
  await runSupabaseQuery(
    r,
    `insert into central.mensagens_ticket (ticket_id, autor, texto, anexo_base64, anexo_nome)
     values ('${id}', 'Você', '${esc(input.mensagem, 4000)}', ${anexoSafe}, ${anexoNomeSafe});`
  );
  return { ok: true, id };
}

export async function adicionarMensagem(ticketId: string, input: {
  autor: string; texto: string; anexoBase64?: string | null; anexoNome?: string | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!input.texto?.trim() && !input.anexoBase64) return { ok: false, erro: "Escreva algo ou anexe um print." };
  if (input.anexoBase64 && input.anexoBase64.length > MAX_ANEXO_LEN) return { ok: false, erro: "Anexo grande demais (limite ~1MB)." };
  const id = idSafe(ticketId);
  const anexoSafe = input.anexoBase64 ? `'${input.anexoBase64.replace(/'/g, "''")}'` : "null";
  const anexoNomeSafe = input.anexoNome ? `'${esc(input.anexoNome, 200)}'` : "null";
  const res = await runSupabaseQuery(
    r,
    `insert into central.mensagens_ticket (ticket_id, autor, texto, anexo_base64, anexo_nome)
     values ('${id}', '${esc(input.autor || "Você", 60)}', '${esc(input.texto || "", 4000)}', ${anexoSafe}, ${anexoNomeSafe});
     update central.tickets_suporte set atualizado_em = now() where id = '${id}';`
  );
  return { ok: res !== null };
}

export async function atualizarStatusTicket(id: string, status: StatusTicket): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  if (!STATUSES.includes(status)) return { ok: false };
  const idS = idSafe(id);
  const res = await runSupabaseQuery(r, `update central.tickets_suporte set status = '${status}', atualizado_em = now() where id = '${idS}';`);
  return { ok: res !== null };
}
