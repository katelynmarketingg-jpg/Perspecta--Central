import { Card, Pill, Icon } from "@/components/ui";
import { integrationStatus } from "@/lib/data";
import { PRECOS, CAMBIO_USD_BRL, usdToBrl } from "@/lib/precos";
import { BRL } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Config() {
  const st = integrationStatus();
  const rows = [
    { nome: "Supabase Management", on: st.supabase, desc: "Status, uso (banco/storage) e custo estimado por projeto", env: "SUPABASE_MANAGEMENT_TOKEN" },
    { nome: "Vercel API", on: st.vercel, desc: "Último deploy, runtime errors e uso (banda) por projeto", env: "VERCEL_API_TOKEN" },
    { nome: "Mercado Pago", on: st.mercadopago, desc: "Cobrança recorrente por cartão tokenizado", env: "MERCADOPAGO_ACCESS_TOKEN" },
  ];

  return (
    <>
      <Card title="Integrações" hint="conecte as chaves na Vercel (variáveis de ambiente)">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Integração</th><th>O que traz</th><th>Variável</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.nome}>
                  <td style={{ fontWeight: 600 }}>{r.nome}</td>
                  <td style={{ color: "var(--muted)" }}>{r.desc}</td>
                  <td className="num" style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{r.env}</td>
                  <td>{r.on ? <Pill s="ativo" label="Conectada" /> : <Pill s="sem_dados" label="Não configurada" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
