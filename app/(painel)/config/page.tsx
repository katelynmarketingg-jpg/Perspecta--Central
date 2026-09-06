import { Card, Pill, Icon } from "@/components/ui";
import { integrationStatus } from "@/lib/data";
import { getProvedorAtivoId, TODOS_PROVEDORES } from "@/lib/integrations/payments";
import SeletorPagamento from "@/components/SeletorPagamento";
import { PRECOS, CAMBIO_USD_BRL, usdToBrl } from "@/lib/precos";
import { BRL } from "@/lib/format";
import { creatorStatus } from "@/lib/integrations/creator";
import { jurisStatus } from "@/lib/integrations/juris";
import { commerceStatus } from "@/lib/integrations/commerce";
import { firebaseStatus } from "@/lib/integrations/firebase";

export const dynamic = "force-dynamic";

const VERCEL_ENV_URL = "https://vercel.com/katelynmarketingg-5736s-projects/perspecta-central/settings/environment-variables";

export default async function Config() {
  const st = integrationStatus();
  const ativo = await getProvedorAtivoId();
  const [creatorSt, jurisSt, commerceSt, firebaseSt] = await Promise.all([
    creatorStatus(), jurisStatus(), commerceStatus(), firebaseStatus(),
  ]);

  const rows = [
    { nome: "Supabase Management", desc: "Status, uso (banco/storage) e dado real de toda a Central", env: "SUPABASE_MANAGEMENT_TOKEN", ok: st.supabase, erro: undefined as string | undefined },
    { nome: "Vercel API", desc: "Último deploy, runtime errors e uso (banda) por projeto", env: "VERCEL_API_TOKEN", ok: st.vercel, erro: undefined as string | undefined },
    { nome: "Creator", desc: "Clientes, receita e criação automática de acesso", env: "CREATOR_API_URL, CREATOR_USER, CREATOR_PASS", ok: creatorSt.ok, erro: creatorSt.erro },
    { nome: "Juris", desc: "Criação automática de acesso (escritório + admin)", env: "JURIS_API_URL, JURIS_EMPRESA, JURIS_USER, JURIS_PASS", ok: jurisSt.ok, erro: jurisSt.erro },
    { nome: "Commerce", desc: "Criação automática de loja + login do cliente", env: "COMMERCE_SUPABASE_URL, COMMERCE_SUPABASE_ANON_KEY, COMMERCE_SUPABASE_SERVICE_ROLE_KEY", ok: commerceSt.ok, erro: commerceSt.erro },
    { nome: "Bistro (Firebase)", desc: "Leitura ao vivo dos estabelecimentos — ainda sem criação automática", env: "FIREBASE_SERVICE_ACCOUNT_B64, FIREBASE_DATABASE_URL", ok: firebaseSt.ok, erro: firebaseSt.erro },
  ];

  return (
    <>
      <Card title="Integrações" hint="cada chave fica na Vercel — aqui só o status ao vivo e pra onde ir"
        action={<a href={VERCEL_ENV_URL} target="_blank" rel="noreferrer" className="selectlike" style={{ textDecoration: "none" }}>Abrir variáveis na Vercel ↗</a>}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Integração</th><th>O que traz</th><th>Variável (na Vercel)</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nome}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  <td style={{ color: "var(--muted)" }}>
                    {r.desc}
                    {r.erro && <div style={{ color: "var(--crit)", fontSize: 12, marginTop: 3 }}>{r.erro}</div>}
                  </td>
                  <td className="num" style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{r.env}</td>
                  <td>{r.ok ? <Pill s="ativo" label="Conectada" /> : <Pill s={r.erro ? "com_erro" : "sem_dados"} label={r.erro ? "Erro" : "Não configurada"} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12, padding: "10px 4px 0" }}>
          O token nunca fica guardado dentro do app — colar a chave aqui numa tela exigiria armazenar segredo em banco, o que é menos seguro que a Vercel. Por isso o botão acima leva direto pra lá.
        </p>
      </Card>

      <Card title="Provedor de pagamento" hint="escolha quem processa a cobrança recorrente dos clientes">
        <SeletorPagamento ativo={ativo} provedores={TODOS_PROVEDORES.map((p) => ({ id: p.id, nome: p.nome, configurado: p.configured() }))} />
      </Card>

      <Card title="Preços de referência da infraestrutura"
        hint={`base do cálculo de custo por projeto/MB · câmbio USD→BRL ${CAMBIO_USD_BRL.toLocaleString("pt-BR")}`}>
        <div className="tablewrap">
          <table>
            <thead><tr><th>Provedor</th><th>Plano base</th><th className="r">Base / mês</th><th>Excedente</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>{PRECOS.supabase.label}</td>
                <td style={{ color: "var(--muted)" }}>{PRECOS.supabase.plano} · inclui {PRECOS.supabase.incluido.storageGb} GB storage</td>
                <td className="r num">{BRL(usdToBrl(PRECOS.supabase.baseUsd))}</td>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>storage {BRL(usdToBrl(PRECOS.supabase.excedenteUsd.storageGb))}/GB · egress {BRL(usdToBrl(PRECOS.supabase.excedenteUsd.egressGb))}/GB</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>{PRECOS.vercel.label}</td>
                <td style={{ color: "var(--muted)" }}>{PRECOS.vercel.plano} · {PRECOS.vercel.incluido.fastDataTransferGb} GB banda</td>
                <td className="r num">{BRL(usdToBrl(PRECOS.vercel.baseUsd))}</td>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>banda {BRL(usdToBrl(PRECOS.vercel.excedenteUsd.fastDataTransferGb))}/GB</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>{PRECOS.render.label}</td>
                <td style={{ color: "var(--muted)" }}>por serviço (tier fixo)</td>
                <td className="r num">{BRL(usdToBrl(PRECOS.render.tiersUsd.Standard))}</td>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{Object.entries(PRECOS.render.tiersUsd).map(([k, v]) => `${k} ${BRL(usdToBrl(v))}`).join(" · ")}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p style={{ color: "var(--muted)", fontSize: 12.5, padding: "0 4px" }}>Valores das tabelas oficiais dos provedores — <b>estimativa</b>. Ajuste aqui quando o câmbio ou os planos mudarem.</p>
      </Card>

      <div className="row2">
        <Card title="Render">
          <div className="card-b">
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              <b>Juris</b> e <b>Creator</b> rodam no Render (sem integração de uso ao vivo hoje). O custo por serviço é <b>direto</b> (o tier tem preço fixo, ver tabela acima); o uso entra <b>manualmente</b> até haver API — marcado como estimativa. <b>Bistro</b> usa Firebase.
            </p>
          </div>
        </Card>
        <Card title="Papéis & IA">
          <div className="card-b">
            <div className="cost-line"><span className="lbl">RBAC</span><span className="val">super_admin · admin · financeiro · suporte · visualizador</span></div>
            <div className="cost-line"><span className="lbl">Feature flag de IA (Claude)</span><Pill s="sem_dados" label="Desligada" /></div>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>Auditoria de ações administrativas e RBAC de verdade entram junto do Supabase Auth.</p>
          </div>
        </Card>
      </div>
    </>
  );
}
