import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Convite de primeiro acesso: o Central gera um link único pra um cliente novo.
// O cliente abre o link, aceita os termos daquele sistema, ganha o teste grátis
// e, quando o teste acabar, usa o MESMO link (via /pagamento/[token]) pra
// colocar a forma de pagamento — sem precisar o Central intervir de novo.
// Fica salvo no schema `central` do Supabase compartilhado.

export type StatusConvite = "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";

export type Convite = {
  id: string;
  token: string;
  sistemaId: string;
  planoId: string;
  empresaNome: string;
  email: string;
  whatsapp: string | null;
  trialDias: number;
  status: StatusConvite;
  criadoEm: string;
  termosAceitosEm: string | null;
  trialAte: string | null;
  ativadoEm: string | null;
};

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.convites (
      id uuid primary key default gen_random_uuid(),
      token text not null unique,
      sistema_id text not null,
      plano_id text not null,
      empresa_nome text not null,
      email text not null,
      whatsapp text,
      trial_dias int not null default 14,
      status text not null default 'pendente',
      criado_em timestamptz not null default now(),
      termos_aceitos_em timestamptz,
      trial_ate timestamptz,
      ativado_em timestamptz
    );`);
}

function fromRow(x: any): Convite {
  return {
    id: String(x.id), token: String(x.token), sistemaId: String(x.sistema_id), planoId: String(x.plano_id),
    empresaNome: String(x.empresa_nome), email: String(x.email), whatsapp: x.whatsapp ?? null,
    trialDias: Number(x.trial_dias) || 14, status: x.status as StatusConvite,
    criadoEm: x.criado_em, termosAceitosEm: x.termos_aceitos_em, trialAte: x.trial_ate, ativadoEm: x.ativado_em,
  };
}

// Se o trial venceu e ninguém colocou pagamento ainda, o status vira
// "aguardando_pagamento" — calculado na leitura (não depende de cron).
function comStatusDerivado(c: Convite): Convite {
  if (c.status === "trial" && c.trialAte && new Date(c.trialAte).getTime() < Date.now()) {
    return { ...c, status: "aguardando_pagamento" };
  }
  return c;
}

function tok(): string {
  return (globalThis.crypto?.randomUUID?.() || `${Date.now()}${Math.random()}`).replace(/-/g, "");
}

export async function listarConvites(): Promise<Convite[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(r, `select * from central.convites order by criado_em desc;`);
  return (rows || []).map(fromRow).map(comStatusDerivado);
}

export async function getConvitePorToken(token: string): Promise<Convite | null> {
  const r = await ref();
  if (!r) return null;
  await ensure(r);
  const tokSafe = token.replace(/[^a-z0-9]/gi, "");
  if (!tokSafe) return null;
  const rows = await runSupabaseQuery(r, `select * from central.convites where token = '${tokSafe}';`);
  if (!rows || !rows[0]) return null;
  return comStatusDerivado(fromRow(rows[0]));
}

export async function criarConvite(p: {
  sistemaId: string; planoId: string; empresaNome: string; email: string; whatsapp?: string | null; trialDias?: number;
}): Promise<{ ok: boolean; token?: string; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!p.sistemaId || !p.planoId || !p.empresaNome?.trim() || !p.email?.trim()) {
    return { ok: false, erro: "Preencha sistema, plano, empresa e e-mail." };
  }
  await ensure(r);
  const token = tok();
  const esc = (s: string) => s.replace(/'/g, "''");
  const sisSafe = p.sistemaId.replace(/[^a-z0-9_-]/gi, "");
  const planoSafe = p.planoId.replace(/[^a-z0-9_-]/gi, "");
  const dias = Math.max(1, Number(p.trialDias) || 14);
  const whatsSafe = p.whatsapp ? `'${esc(p.whatsapp)}'` : "null";
  const res = await runSupabaseQuery(r, `
    insert into central.convites (token, sistema_id, plano_id, empresa_nome, email, whatsapp, trial_dias, status)
    values ('${token}', '${sisSafe}', '${planoSafe}', '${esc(p.empresaNome.trim())}', '${esc(p.email.trim())}', ${whatsSafe}, ${dias}, 'pendente');`);
  return res !== null ? { ok: true, token } : { ok: false, erro: "Não foi possível gerar o convite." };
}

export async function aceitarTermos(token: string): Promise<{ ok: boolean; erro?: string; trialAte?: string; trialDias?: number }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const c = await getConvitePorToken(token);
  if (!c) return { ok: false, erro: "Convite não encontrado." };
  if (c.status !== "pendente") return { ok: false, erro: "Este convite já foi usado." };
  const tokSafe = token.replace(/[^a-z0-9]/gi, "");
  const res = await runSupabaseQuery(r, `
    update central.convites
    set status = 'trial', termos_aceitos_em = now(), trial_ate = now() + interval '${c.trialDias} days'
    where token = '${tokSafe}'
    returning trial_ate;`);
  if (!res || !res[0]) return { ok: false, erro: "Não foi possível confirmar." };
  return { ok: true, trialAte: res[0].trial_ate, trialDias: c.trialDias };
}

export async function confirmarPagamento(token: string): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  const c = await getConvitePorToken(token);
  if (!c) return { ok: false, erro: "Convite não encontrado." };
  if (c.status !== "trial" && c.status !== "aguardando_pagamento") return { ok: false, erro: "Este convite não está aguardando pagamento." };
  const tokSafe = token.replace(/[^a-z0-9]/gi, "");
  const res = await runSupabaseQuery(r, `update central.convites set status = 'ativo', ativado_em = now() where token = '${tokSafe}';`);
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível confirmar o pagamento." };
}

export async function cancelarConvite(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `update central.convites set status = 'cancelado' where id = '${idSafe}';`);
  return { ok: res !== null };
}
