import { Card, Pill, Icon } from "@/components/ui";
import { integrationStatus } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function Config() {
  const st = integrationStatus();
  const rows = [
    { nome: "Supabase Management", on: st.supabase, desc: "Status/uso/advisories dos projetos", env: "SUPABASE_MANAGEMENT_TOKEN" },
    { nome: "Vercel API", on: st.vercel, desc: "Último deploy + runtime errors", env: "VERCEL_API_TOKEN" },
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

      <div className="row2">
        <Card title="Render">
          <div className="card-b">
            <p style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>
              O Render (Juris, Creator) <b>não tem integração disponível</b> hoje. Os dados desses sistemas entram <b>manualmente</b> até existir uma forma melhor — marcados como estimativa na interface.
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
