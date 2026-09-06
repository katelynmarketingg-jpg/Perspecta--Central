import { runSupabaseQuery, supabaseConfigured } from "./integrations/supabase";

// Despesas que a Perspecta cadastra à mão (assinaturas, serviços, compras
// parceladas...). Ficam salvas no schema `central` do Supabase compartilhado,
// junto dos custos manuais — mesmo padrão de tabela "self-provisionada".

export type TipoDespesa = "fixa" | "periodica" | "unica" | "parcelada";

export type Despesa = {
  id: string; nome: string; tipo: TipoDespesa; valorBrl: number;
  periodicidadeMeses: number | null; parcelasTotal: number | null;
  dataInicio: string; sistemaId: string | null; ativo: boolean; criadoEm?: string;
};

const TIPOS: TipoDespesa[] = ["fixa", "periodica", "unica", "parcelada"];

async function ref(): Promise<string | null> {
  if (!supabaseConfigured()) return null;
  const sistemas = await (await import("./data")).getSistemas();
  return sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
}

async function ensure(r: string) {
  await runSupabaseQuery(r, `
    create schema if not exists central;
    create table if not exists central.despesas (
      id uuid primary key default gen_random_uuid(),
      nome text not null,
      tipo text not null default 'fixa',
      valor_brl numeric not null default 0,
      periodicidade_meses int,
      parcelas_total int,
      data_inicio date not null default current_date,
      sistema_id text,
      ativo boolean not null default true,
      criado_em timestamptz not null default now()
    );`);
}

export async function listarDespesas(): Promise<Despesa[]> {
  const r = await ref();
  if (!r) return [];
  await ensure(r);
  const rows = await runSupabaseQuery(
    r,
    `select id, nome, tipo, valor_brl, periodicidade_meses, parcelas_total, data_inicio, sistema_id, ativo, criado_em
     from central.despesas order by ativo desc, criado_em desc;`
  );
  return (rows || []).map((x: any) => ({
    id: String(x.id), nome: String(x.nome), tipo: (x.tipo || "fixa") as TipoDespesa,
    valorBrl: Number(x.valor_brl) || 0,
    periodicidadeMeses: x.periodicidade_meses != null ? Number(x.periodicidade_meses) : null,
    parcelasTotal: x.parcelas_total != null ? Number(x.parcelas_total) : null,
    dataInicio: String(x.data_inicio), sistemaId: x.sistema_id ?? null, ativo: !!x.ativo, criadoEm: x.criado_em,
  }));
}

export async function addDespesa(input: {
  nome: string; tipo: TipoDespesa; valorBrl: number;
  periodicidadeMeses: number | null; parcelasTotal: number | null;
  dataInicio: string; sistemaId: string | null;
}): Promise<{ ok: boolean; erro?: string }> {
  const r = await ref();
  if (!r) return { ok: false, erro: "Supabase não configurado." };
  if (!input.nome?.trim()) return { ok: false, erro: "Informe o nome da despesa." };
  if (!TIPOS.includes(input.tipo)) return { ok: false, erro: "Tipo inválido." };
  if (!(Number(input.valorBrl) > 0)) return { ok: false, erro: "Informe um valor maior que zero." };
  if (input.tipo === "periodica" && !(Number(input.periodicidadeMeses) >= 1)) return { ok: false, erro: "Informe a cada quantos meses ela se repete." };
  if (input.tipo === "parcelada" && !(Number(input.parcelasTotal) >= 2)) return { ok: false, erro: "Informe o total de parcelas (2 ou mais)." };
  await ensure(r);
  const nomeSafe = input.nome.trim().slice(0, 120).replace(/'/g, "''");
  const val = Number(input.valorBrl) || 0;
  const sisSafe = input.sistemaId ? `'${input.sistemaId.replace(/[^a-z0-9_-]/gi, "")}'` : "null";
  const perSafe = input.tipo === "periodica" ? String(Number(input.periodicidadeMeses)) : "null";
  const parcSafe = input.tipo === "parcelada" ? String(Number(input.parcelasTotal)) : "null";
  const dataSafe = /^\d{4}-\d{2}-\d{2}$/.test(input.dataInicio) ? `'${input.dataInicio}'` : "current_date";
  const res = await runSupabaseQuery(
    r,
    `insert into central.despesas (nome, tipo, valor_brl, periodicidade_meses, parcelas_total, data_inicio, sistema_id)
     values ('${nomeSafe}', '${input.tipo}', ${val}, ${perSafe}, ${parcSafe}, ${dataSafe}, ${sisSafe});`
  );
  return res !== null ? { ok: true } : { ok: false, erro: "Não foi possível salvar." };
}

export async function definirAtivoDespesa(id: string, ativo: boolean): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `update central.despesas set ativo = ${ativo ? "true" : "false"} where id = '${idSafe}';`);
  return { ok: res !== null };
}

export async function removerDespesa(id: string): Promise<{ ok: boolean }> {
  const r = await ref();
  if (!r) return { ok: false };
  const idSafe = id.replace(/[^a-f0-9-]/gi, "");
  const res = await runSupabaseQuery(r, `delete from central.despesas where id = '${idSafe}';`);
  return { ok: res !== null };
}

export type SituacaoDespesa = {
  valorEsteMes: number;
  status: "cobrando" | "aguardando" | "futura" | "concluida" | "encerrada";
  detalhe: string;
};

// Quanto essa despesa custa NESTE mês civil e por quê — cálculo simples por
// diferença de meses desde o início, na mesma granularidade do resto do
// custo da Central (sem hora/dia exatos).
export function situacaoDespesa(d: Despesa, hoje = new Date()): SituacaoDespesa {
  if (!d.ativo) return { valorEsteMes: 0, status: "encerrada", detalhe: "encerrada" };
  const inicio = new Date(d.dataInicio + "T00:00:00");
  const mesesDesde = (hoje.getFullYear() - inicio.getFullYear()) * 12 + (hoje.getMonth() - inicio.getMonth());

  if (d.tipo === "fixa") {
    if (mesesDesde < 0) return { valorEsteMes: 0, status: "futura", detalhe: `começa em ${d.dataInicio}` };
    return { valorEsteMes: d.valorBrl, status: "cobrando", detalhe: "todo mês" };
  }
  if (d.tipo === "periodica") {
    const p = d.periodicidadeMeses || 1;
    if (mesesDesde < 0) return { valorEsteMes: 0, status: "futura", detalhe: `começa em ${d.dataInicio}` };
    const devida = mesesDesde % p === 0;
    if (devida) return { valorEsteMes: d.valorBrl, status: "cobrando", detalhe: `a cada ${p} meses` };
    return { valorEsteMes: 0, status: "aguardando", detalhe: `próxima em ${p - (mesesDesde % p)} mês(es)` };
  }
  if (d.tipo === "unica") {
    if (mesesDesde < 0) return { valorEsteMes: 0, status: "futura", detalhe: `em ${d.dataInicio}` };
    if (mesesDesde === 0) return { valorEsteMes: d.valorBrl, status: "cobrando", detalhe: "pagamento único" };
    return { valorEsteMes: 0, status: "concluida", detalhe: `pago em ${d.dataInicio}` };
  }
  // parcelada
  const total = d.parcelasTotal || 1;
  if (mesesDesde < 0) return { valorEsteMes: 0, status: "futura", detalhe: `1ª parcela em ${d.dataInicio}` };
  const parcelaAtual = mesesDesde + 1;
  if (parcelaAtual > total) return { valorEsteMes: 0, status: "concluida", detalhe: `${total}/${total} pagas` };
  return { valorEsteMes: d.valorBrl, status: "cobrando", detalhe: `parcela ${parcelaAtual}/${total}` };
}
