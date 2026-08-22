-- =============================================================================
-- Perspecta Central — schema inicial (Supabase / Postgres)
--
-- IMPORTANTE: tudo vive no schema `central`, NUNCA em `public`.
-- O projeto Supabase ndzdhseravwdcdfuroda é COMPARTILHADO:
--   public   = Perspecta Juris
--   commerce = Perspecta Commerce
--   central  = este painel
-- Criar tabelas sem prefixo jogaria o Central dentro do schema do Juris.
-- =============================================================================

create extension if not exists "pgcrypto";
create schema if not exists central;

-- Papéis de acesso (RBAC) ---------------------------------------------------
do $$ begin
  create type central.role_master as enum ('super_admin','admin','financeiro','suporte','visualizador');
  create type central.sistema_status as enum ('operacional','degradado','com_erro','sem_dados');
  create type central.empresa_status as enum ('ativo','inad','pend','canc');
  create type central.pagamento_status as enum ('pago','falhou','vencido','pendente');
  create type central.login_resultado as enum ('sucesso','falha');
  -- 'mock' existe para que dado inventado NUNCA se passe por real na tela.
  create type central.dado_source as enum ('live','manual','mock');
exception when duplicate_object then null; end $$;

-- Usuários do Central (equipe) ---------------------------------------------
create table if not exists central.usuarios_master (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  role central.role_master not null default 'visualizador',
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- Catálogo de sistemas ------------------------------------------------------
create table if not exists central.sistemas (
  id text primary key,
  nome text not null,
  cor text,
  url text,
  repo_github text,
  host text,
  supabase_ref text,
  supabase_schema text,
  vercel_project text,
  render_service text,
  banco text,                        -- descrição legível: Supabase, SQLite, Firebase, nenhum
  status central.sistema_status not null default 'sem_dados',
  status_source central.dado_source not null default 'mock',
  uptime numeric,
  versao text,
  observacao text,
  -- segredos ficam em variáveis de ambiente, NÃO aqui
  created_at timestamptz not null default now()
);

-- O que já está ligado de cada sistema (a aba "Sistemas") -------------------
-- Metade é testável pela própria Central; metade é checklist manual.
create table if not exists central.integracoes (
  sistema_id text not null references central.sistemas(id) on delete cascade,
  capacidade text not null,          -- leitura_clientes | medicao_uso | criar_login | revogar_login | preco_plano
  estado text not null default 'falta', -- ok | pendente | parcial | falta | nao_se_aplica
  automatico boolean not null default false, -- true = a Central testa sozinha
  falta_o_que text,                  -- em linguagem de gente
  observacao text,
  verificado_em timestamptz not null default now(),
  primary key (sistema_id, capacidade)
);

-- Histórico de medições — série temporal, NÃO sobrescreve -------------------
-- Sem duas medições não existe projeção de "quando isso vira conta".
create table if not exists central.medicoes (
  id uuid primary key default gen_random_uuid(),
  medido_em date not null default current_date,
  fonte text not null,               -- supabase | firebase | render | vercel | r2 | manual
  sistema_id text references central.sistemas(id) on delete set null,
  metrica text not null,             -- banco_bytes | storage_bytes | logins | clientes | ...
  valor numeric not null,
  unidade text,                      -- bytes | contagem | brl | usd
  limite numeric,                    -- limite do plano gratuito, quando existir
  origem central.dado_source not null default 'live',
  detalhe jsonb,
  created_at timestamptz not null default now()
);
create index if not exists medicoes_serie on central.medicoes (metrica, medido_em desc);

-- Planos --------------------------------------------------------------------
create table if not exists central.planos (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id) on delete cascade,
  nome text not null,
  valor_mensal numeric,
  valor_anual numeric,
  limite_storage_mb bigint,
  limite_logins int,
  limite_registros bigint,
  recursos jsonb default '[]',
  origem central.dado_source not null default 'manual',
  ativo boolean default true
);

-- Empresas (clientes) -------------------------------------------------------
create table if not exists central.empresas (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id),
  external_ref text,                 -- id da empresa no sistema de origem
  nome text not null,
  cnpj text,
  email text,
  status central.empresa_status not null default 'ativo',
  carencia_dias int default 7,
  carencia_ate date,
  created_at timestamptz not null default now()
);

create table if not exists central.assinaturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references central.empresas(id) on delete cascade,
  plano_id uuid not null references central.planos(id),
  sistema_id text not null references central.sistemas(id),
  ciclo text default 'mensal',
  valor numeric not null,            -- o preço REALMENTE cobrado (pode ter desconto)
  status text default 'ativa',
  proximo_vencimento date,
  created_at timestamptz not null default now()
);

-- Consumo atual (materializado; o histórico fica em medicoes) ---------------
create table if not exists central.consumo_atual (
  empresa_id uuid primary key references central.empresas(id) on delete cascade,
  storage_usado_mb bigint default 0,
  registros_usados bigint default 0,
  logins_ativos int default 0,
  coletado_em timestamptz default now()
);

-- Custos --------------------------------------------------------------------
-- rateio: sistema | diluido | geral  → define como entra no relatório
create table if not exists central.custos (
  id uuid primary key default gen_random_uuid(),
  sistema_id text references central.sistemas(id) on delete set null,
  nome text not null,
  valor numeric not null,
  moeda text not null default 'USD',
  cotacao numeric,                   -- USD→BRL usada, para o histórico não mentir
  periodicidade text default 'mensal', -- mensal | anual | avulso
  rateio text not null default 'sistema',
  criterio_rateio text,              -- partes iguais | por clientes | ...
  fonte text,                        -- Supabase | Vercel | Render | Anthropic | Pessoas | Outro
  inicio date,
  fim date,
  source central.dado_source not null default 'manual',
  created_at timestamptz not null default now()
);

-- Gatilhos: quando o plano gratuito vira conta ------------------------------
create table if not exists central.gatilhos_custo (
  id uuid primary key default gen_random_uuid(),
  fonte text not null,               -- Supabase | Vercel | Firebase | Render | R2
  metrica text not null,             -- banco_bytes | egress | uso_comercial | ...
  limite_gratuito numeric,
  unidade text,
  custo_ao_estourar numeric,
  moeda text default 'USD',
  observacao text,
  url_fonte text not null,           -- de onde saiu o número
  confirmado_em date,                -- quando foi conferido na fonte
  created_at timestamptz not null default now()
);

-- Provisionamento: log de cada criação/revogação de login -------------------
create table if not exists central.provisionamentos (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id),
  empresa_id uuid references central.empresas(id) on delete set null,
  acao text not null,                -- criar | revogar | suspender | reset_senha
  alvo text,                         -- email/login do destinatário
  resultado text not null,           -- sucesso | erro
  erro text,
  payload jsonb,
  quando timestamptz not null default now()
);

-- Faturas e cobrança --------------------------------------------------------
create table if not exists central.faturas (
  id uuid primary key default gen_random_uuid(),
  empresa_id uuid not null references central.empresas(id) on delete cascade,
  valor numeric not null,
  periodo_ref text,
  status central.pagamento_status not null default 'pendente',
  metodo text,
  vencimento date,
  criado_em timestamptz not null default now()
);

create table if not exists central.cobranca_tentativas (
  id uuid primary key default gen_random_uuid(),
  fatura_id uuid not null references central.faturas(id) on delete cascade,
  tentada_em timestamptz not null default now(),
  resultado text not null,
  motivo text
);

-- Acessos -------------------------------------------------------------------
create table if not exists central.login_attempts (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id),
  empresa_id uuid references central.empresas(id) on delete set null,
  empresa_ref text,
  usuario_external_id text,
  usuario_email text,
  resultado central.login_resultado not null,
  motivo text,
  ip inet,
  device_fingerprint text,
  quando timestamptz not null default now()
);
create index if not exists login_attempts_empresa on central.login_attempts (empresa_id, quando desc);
create index if not exists login_attempts_sistema on central.login_attempts (sistema_id, quando desc);

-- Snapshots de infra --------------------------------------------------------
create table if not exists central.infra_snapshots (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id),
  fonte text,
  status central.sistema_status,
  payload jsonb,
  coletado_em timestamptz not null default now()
);

-- Suporte -------------------------------------------------------------------
create table if not exists central.tickets_suporte (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id),
  empresa_id uuid references central.empresas(id) on delete set null,
  usuario_external_id text,
  assunto text,
  status text default 'aberto',
  prioridade text default 'media',
  external_ticket_ref text,
  criado_em timestamptz not null default now()
);
create table if not exists central.mensagens_ticket (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references central.tickets_suporte(id) on delete cascade,
  autor_tipo text,
  corpo text,
  enviado_ao_sistema boolean default false,
  criado_em timestamptz not null default now()
);

-- Tarefas (kanban) ----------------------------------------------------------
create table if not exists central.tarefas (
  id uuid primary key default gen_random_uuid(),
  sistema_id text references central.sistemas(id) on delete set null,
  titulo text not null,
  descricao text,
  coluna text not null default 'backlog', -- backlog | a_fazer | fazendo | revisao | feito
  prioridade text default 'media',
  ordem int default 0,
  depende_de_mim boolean default false,   -- true = ação da dona, não do time
  onde_clicar text,
  created_at timestamptz not null default now(),
  concluida_em timestamptz
);
create index if not exists tarefas_coluna on central.tarefas (coluna, ordem);

-- Alertas + auditoria -------------------------------------------------------
create table if not exists central.alertas (
  id uuid primary key default gen_random_uuid(),
  tipo text,
  severidade text,
  sistema_id text references central.sistemas(id),
  empresa_id uuid references central.empresas(id) on delete set null,
  titulo text,
  detalhe jsonb,
  status text default 'aberto',
  criado_em timestamptz not null default now()
);
create table if not exists central.audit_log (
  id uuid primary key default gen_random_uuid(),
  usuario_master_id uuid references central.usuarios_master(id),
  acao text,
  entidade text,
  entidade_id text,
  diff jsonb,
  ip inet,
  criado_em timestamptz not null default now()
);

create table if not exists central.incidentes (
  id uuid primary key default gen_random_uuid(),
  sistema_id text not null references central.sistemas(id) on delete cascade,
  titulo text not null,
  severidade text,
  status text default 'aberto',
  detectado_em timestamptz not null default now()
);

-- =============================================================================
-- RLS
-- A Central acessa este schema pela Management API (superusuário), que ignora
-- RLS. As políticas abaixo são a rede de segurança para o dia em que o acesso
-- passar a ser por chave anônima: sem elas, qualquer chave leria tudo.
--
-- ATENÇÃO ao search_path da função: declarar `set search_path = central, public`
-- é obrigatório. Uma função sem isso resolve nomes no schema errado — foi
-- exatamente o defeito que quebrou o RLS do Commerce.
-- =============================================================================
create or replace function central.is_master() returns boolean
  language sql stable
  security definer
  set search_path = central, public
as $$
  select exists (
    select 1 from central.usuarios_master u
    where u.email = nullif(current_setting('request.jwt.claims', true), '')::json->>'email'
      and u.ativo
  );
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'sistemas','integracoes','medicoes','planos','empresas','assinaturas','consumo_atual',
    'custos','gatilhos_custo','provisionamentos','faturas','cobranca_tentativas',
    'login_attempts','infra_snapshots','tickets_suporte','mensagens_ticket','tarefas',
    'alertas','audit_log','incidentes','usuarios_master'
  ] loop
    execute format('alter table central.%I enable row level security;', t);
    execute format('drop policy if exists %I_read on central.%I;', t, t);
    execute format('create policy %I_read on central.%I for select using (central.is_master());', t, t);
  end loop;
end $$;
