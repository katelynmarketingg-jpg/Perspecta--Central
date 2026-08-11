# Perspecta Central

Central de comando de todos os sistemas Perspecta (Commerce, Central, Juris, Creator, Bistro, Hub, Saúde): infraestrutura, acessos, custos/margem, cobrança e suporte — num painel interno só para a equipe.

- **Stack:** Next.js (App Router) + TypeScript · Supabase (Postgres/Auth/RLS) · deploy Vercel · PT-BR · dark mode (paleta "Perspecta Creator", terracota `#e0713a`).
- **Filosofia de dados:** cada módulo roda com **dados de exemplo (mock)** até a chave da integração ser configurada. O que é **ao vivo**, **manual** ou **sem dados** é marcado na interface — nunca fingimos que um valor manual é ao vivo.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha só o que já tiver; o resto roda em mock
npm run dev
```

Abre em `http://localhost:3000`.

## Deploy na Vercel (projeto `perspecta-central`)

1. Suba este repositório para o GitHub.
2. Na Vercel: **New Project → Import** o repositório (framework Next.js é detectado sozinho).
3. Em **Settings → Environment Variables**, cole as chaves do `.env.example` (só as que já tiver).
4. Deploy. Sem nenhuma chave, o painel sobe funcionando com dados de exemplo.

## Variáveis de ambiente

Veja `.env.example`. Regras:

- **Segredos ficam só no servidor** (Vercel/Supabase). Nada de chave no cliente além das `NEXT_PUBLIC_*` do Supabase.
- **Cartão de crédito nunca toca o banco nem o servidor**: o Mercado Pago tokeniza no navegador do cliente; o Central guarda só o token/ID.
- IA (Claude) fica **desligada** por padrão (`ENABLE_AI=false`).

| Integração | Variável | Destrava |
|---|---|---|
| Supabase Mgmt | `SUPABASE_MANAGEMENT_TOKEN` | status/uso dos projetos (Infra, Custos) |
| Vercel | `VERCEL_API_TOKEN` | último deploy + runtime errors (Infra) |
| Mercado Pago | `MERCADOPAGO_ACCESS_TOKEN` | cobrança recorrente (Pagamentos) |
| Resend | `RESEND_API_KEY` | e-mail de alertas |

> **Render (Juris, Creator):** não há integração disponível hoje — esses dados entram manualmente, marcados como estimativa.

## Banco de dados

`supabase/migrations/0001_init.sql` cria o schema (multi-tenant, RLS): sistemas, empresas, planos, assinaturas, consumo, custos, faturas + tentativas de cobrança, `login_attempts`, infra_snapshots, tickets, alertas, auditoria e incidentes. Rode no SQL editor do projeto Supabase do Central.

## Estrutura

```
app/            rotas (dashboard + 11 módulos)
components/     shell (Sidebar/Topbar) e kit de UI (cards, KPIs, charts SVG)
lib/            dados (mock + provedor), integrações, tipos, formatação, navegação
lib/integrations/  supabase.ts · vercel.ts · mercadopago.ts (mock quando sem chave)
supabase/migrations/  schema SQL
```

## Roadmap (próximas fases)

- Conectar Supabase Auth (login por convite) + RLS por papel (RBAC real).
- Wiring ao vivo: Supabase Mgmt (infra/custos), Vercel (deploys/erros).
- Cobrança recorrente Mercado Pago (preapproval) + webhooks + carência/bloqueio automático.
- CRUD persistido de planos/custos (hoje leitura).
- Coleta agendada (Vercel Cron) + alertas proativos (e-mail via Resend).
- Auditoria de ações administrativas.
