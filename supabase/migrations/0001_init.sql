-- =============================================================================
-- Perspecta Central — schema inicial (Supabase / Postgres)
-- Multi-tenant, RLS habilitado. Rode no SQL editor do projeto Supabase do Central.
-- =============================================================================

create extension if not exists "pgcrypto";

-- Papéis de acesso (RBAC) ---------------------------------------------------
create type role_master as enum ('super_admin','admin','financeiro','suporte','visualizador');
create type sistema_status as enum ('operacional','degradado','com_erro','sem_dados');
create type empresa_status as enum ('ativo','inad','pend','canc');
create type pagamento_status as enum ('pago','falhou','vencido','pendente');
create type login_resultado as enum ('sucesso','falha');
create type dado_source as enum ('live','manual','mock');

-- Usuários do Central (equipe) ---------------------------------------------
create table usuarios_master (
  id uuid primary key default auth.uid(),
  nome text not null,
  email text unique not null,
  role role_master not null default 'visualizador',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catálogo de sistemas ------------------------------------------------------
create table sistemas (
  id text primary key,
  nome text not null,
  cor text,
  url text,
  repo_github text,
  host text check (host in ('Vercel','Render')),
  supabase_ref text,
  vercel_project text,
  render_service text,
  status sistema_status not null default 'sem_dados',
  status_source dado_source not null default 'mock',
  uptime numeric,
  versao text,
  -- segredos ficam em variáveis de ambiente, NÃO aqui
  created_at timestamptz not null default now()
);

-- Planos --------------------------------------------------------------------
create table planos (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id) on delete cascade,
  nome text not null,
  valor_mensal numeric not null,
  limite_storage_mb bigint,
  limite_logins int,
  limite_registros bigint,
  recursos jsonb default '[]',
  ativo boolean default true
);

-- Empresas (tenants) --------------------------------------------------------
create table empresas (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id),
  external_ref text,                 -- id interno da empresa no sistema de origem
  nome text not null,
  cnpj text,
  email text,
  status empresa_status not null default 'ativo',
  mercadopago_customer_id text,      -- referência no MP, nunca o cartão
  carencia_dias int default 7,
  carencia_ate date,                 -- fim da carência quando um pagamento falha
  created_at timestamptz not null default now()
);

create table assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  plano_id uuid not null references planos(id),
  sistema_id text not null references sistemas(id),
  ciclo text default 'mensal',
  valor numeric not null,
  status text default 'ativa',
  mercadopago_preapproval_id text,
  proximo_vencimento date,
  created_at timestamptz not null default now()
);

-- Consumo materializado -----------------------------------------------------
create table consumo_atual (
  empresa_id uuid primary key references empresas(id) on delete cascade,
  storage_usado_mb bigint default 0,
  registros_usados bigint default 0,
  logins_ativos int default 0,
  coletado_em timestamptz default now()
);

-- Custos (por sistema ou geral) — real (Supabase) ou manual -----------------
create table custos (
  id uuid primary key default gen_random_uuid(),
  sistema_id text references sistemas(id) on delete set null, -- null = geral
  nome text not null,
  valor_mensal numeric not null,
  fonte text,                        -- Supabase | Vercel | Render | Anthropic | Outro
  source dado_source not null default 'manual',
  mes date default date_trunc('month', now()),
  created_at timestamptz not null default now()
);

-- Pagamentos e faturas ------------------------------------------------------
create table faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references empresas(id) on delete cascade,
  valor numeric not null,
  periodo_ref text,                  -- ex.: "2026-08"
  status pagamento_status not null default 'pendente',
  metodo text,
  vencimento date,
  criado_em timestamptz not null default now()
);

create table cobranca_tentativas (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references faturas(id) on delete cascade,
  tentada_em timestamptz not null default now(),
  resultado text not null,           -- aprovado | recusado | sem_saldo | erro ...
  motivo text
);

-- Acessos: tentativas de login por empresa/usuário --------------------------
-- Cada sistema grava suas tentativas; o Central lê (via Supabase ou API do sistema).
create table login_attempts (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id),
  empresa_id uuid references empresas(id) on delete set null,
  empresa_ref text,                  -- caso o mapeamento ainda não exista
  usuario_external_id text,
  usuario_email text,
  resultado login_resultado not null,
  motivo text,                       -- senha_incorreta | bloqueado | token_expirado ...
  ip inet,
  device_fingerprint text,
  quando timestamptz not null default now()
);
create index on login_attempts (empresa_id, quando desc);
create index on login_attempts (sistema_id, quando desc);

-- Infra snapshots (coleta agendada) -----------------------------------------
create table infra_snapshots (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id),
  fonte text,                        -- supabase | vercel
  status sistema_status,
  payload jsonb,
  coletado_em timestamptz not null default now()
);

-- Suporte -------------------------------------------------------------------
create table tickets_suporte (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id),
  empresa_id uuid references empresas(id) on delete set null,
  usuario_external_id text,
  assunto text,
  status text default 'aberto',
  prioridade text default 'media',
  external_ticket_ref text,
  criado_em timestamptz not null default now()
);
create table mensagens_ticket (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references tickets_suporte(id) on delete cascade,
  autor_tipo text,                   -- cliente | equipe
  corpo text,
  enviado_ao_sistema boolean default false,
  criado_em timestamptz not null default now()
);

-- Alertas + auditoria -------------------------------------------------------
create table alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  severidade text,
  sistema_id text references sistemas(id),
  empresa_id uuid references empresas(id) on delete set null,
  titulo text,
  detalhe jsonb,
  status text default 'aberto',
  criado_em timestamptz not null default now()
);
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  usuario_master_id uuid references usuarios_master(id),
  acao text,
  entidade text,
  entidade_id text,
  diff jsonb,
  ip inet,
  criado_em timestamptz not null default now()
);

-- Bugs / incidentes por sistema --------------------------------------------
create table incidentes (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references sistemas(id) on delete cascade,
  titulo text not null,
  severidade text,                   -- alta | media | baixa
  status text default 'aberto',
  detectado_em timestamptz not null default now()
);

-- =============================================================================
-- RLS: por padrão, só usuários autenticados do Central (usuarios_master) leem.
-- Escrita fica restrita conforme o papel — refinar por tabela na fase de auth.
-- =============================================================================
alter table usuarios_master enable row level security;
alter table sistemas enable row level security;
alter table planos enable row level security;
alter table empresas enable row level security;
alter table assinaturas enable row level security;
alter table consumo_atual enable row level security;
alter table custos enable row level security;
alter table faturas enable row level security;
alter table cobranca_tentativas enable row level security;
alter table login_attempts enable row level security;
alter table infra_snapshots enable row level security;
alter table tickets_suporte enable row level security;
alter table mensagens_ticket enable row level security;
alter table alertas enable row level security;
alter table audit_log enable row level security;
alter table incidentes enable row level security;

-- Helper: o usuário atual é membro ativo da equipe do Central?
create or replace function is_master() returns boolean language sql stable as $$
  select exists (select 1 from usuarios_master u where u.id = auth.uid() and u.ativo);
$$;

-- Política de leitura genérica (aplicar a todas as tabelas de dados)
do $$
declare t text;
begin
  foreach t in array array[
    'sistemas','planos','empresas','assinaturas','consumo_atual','custos','faturas',
    'cobranca_tentativas','login_attempts','infra_snapshots','tickets_suporte',
    'mensagens_ticket','alertas','audit_log','incidentes'
  ] loop
    execute format('create policy %I_read on %I for select using (is_master());', t, t);
  end loop;
end $$;

create policy usuarios_master_self on usuarios_master for select using (id = auth.uid() or is_master());
