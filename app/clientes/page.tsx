import { Card, Kpi, Icon } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, getClientRows } from "@/lib/integrations/supabase";
import { firebaseConfigured, getFirestoreClientDocs } from "@/lib/integrations/firebase";
import { BRL, initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Pega o 1º valor de um registro cujo nome de coluna casa com o padrão.
function pick(row: Record<string, any>, re: RegExp): any {
  for (const k of Object.keys(row)) {
    if (re.test(k) && row[k] != null && row[k] !== "") return row[k];
  }
  return null;
}

type Cli = {
  nome: string; email: any; telefone: any; documento: any; valor: any;
  status: any; sistema: string; cor: string; fonte: string;
};

function normaliza(row: Record<string, any>, sistemaPadrao: string, cor: string, fonte: string): Cli {
  return {
    nome: String(pick(row, /^(name|nome|razao|fantasia|full_name|title|razao_social|nome_fantasia)/i) ?? pick(row, /nome|name/i) ?? row.id ?? "—"),
    email: pick(row, /email/i),
    telefone: pick(row, /phone|telefone|celular|whatsapp|fone/i),
    documento: pick(row, /cpf|cnpj|documento|tax_id/i),
    valor: pick(row, /valor|amount|preco|price|total|mensalidade|monthly/i),
    status: pick(row, /status|situacao|situação/i),
    sistema: String(pick(row, /^(sistema|system|app|produto|plataforma)$/i) ?? sistemaPadrao),
    cor,
    fonte,
  };
}

export default async function Clientes() {
  const sistemas = await getSistemas();

  const refs = new Map<string, typeof sistemas>();
  for (const s of sistemas) {
    if (!s.supabaseRef) continue;
    refs.set(s.supabaseRef, [...(refs.get(s.supabaseRef) || []), s]);
  }
  const bistro = sistemas.find((s) => s.host === "Firebase");

  // Lê todas as fontes em paralelo.
  const [supa, fire] = await Promise.all([
    supabaseConfigured()
      ? Promise.all([...refs.entries()].map(async ([ref, sis]) => ({ sis, tabelas: await getClientRows(ref) })))
      : Promise.resolve([]),
    firebaseConfigured() ? getFirestoreClientDocs() : Promise.resolve(null),
  ]);

  const clientes: Cli[] = [];
  for (const { sis, tabelas } of supa) {
    const nomeSis = sis.map((x) => nomeCurto(x.nome)).join(" / ");
    const cor = sis[0]?.cor || "var(--accent)";
    for (const t of tabelas || []) for (const r of t.rows) clientes.push(normaliza(r, nomeSis, cor, t.tabela));
  }
  for (const c of fire || []) {
    const nomeSis = bistro ? nomeCurto(bistro.nome) : "Bistro";
    const cor = bistro?.cor || "var(--accent)";
    for (const r of c.rows) clientes.push(normaliza(r, nomeSis, cor, c.colecao));
  }

  // Só mostra as colunas opcionais que têm ao menos um dado.
  const tem = (f: keyof Cli) => clientes.some((c) => c[f] != null && c[f] !== "");
  const colTel = tem("telefone"), colDoc = tem("documento"), colValor = tem("valor"), colStatus = tem("status");

  const fmtValor = (v: any) => {
    if (v == null || v === "") return "—";
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? BRL(n) : String(v);
  };
  const fontes = (supabaseConfigured() ? 1 : 0) + (firebaseConfigured() ? 1 : 0);

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Clientes reais" v={clientes.length} />
        <Kpi icon='<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>' k="Fontes conectadas" v={fontes} />
        <Kpi icon='<path d="M12 2l3 6 6 .5-4.5 4 1.5 6-6-3.5L6 18.5 7.5 12.5 3 8.5 9 8z"/>' k="Sistemas com clientes" v={new Set(clientes.map((c) => c.sistema)).size} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Clientes lidos <b>ao vivo</b> dos bancos conectados (Supabase, Firebase). Creator e Hub aparecem quando plugarmos o banco deles.</span>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <div className="placeholder">
            <div className="pi"><Icon path='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' size={24} /></div>
            <h3>Nenhum cliente encontrado ainda</h3>
            <p>Veja em <b>Dados reais</b> quais tabelas existem e me diga qual é a de clientes.</p>
          </div>
        </Card>
      ) : (
        <Card title="Todos os clientes" hint={`${clientes.length} · ao vivo`}>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Sistema</th>
                  <th>Contato</th>
                  {colTel && <th>Telefone</th>}
                  {colDoc && <th>Documento</th>}
                  {colValor && <th className="r">Valor</th>}
                  {colStatus && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {clientes.map((c, i) => (
                  <tr key={i}>
                    <td><div className="co"><div className="ci">{initials(c.nome)}</div><div className="cn">{c.nome}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: c.cor }} />{c.sistema}</span></td>
                    <td style={{ color: "var(--muted)" }}>{c.email ?? "—"}</td>
                    {colTel && <td className="num">{c.telefone ?? "—"}</td>}
                    {colDoc && <td className="num">{c.documento ?? "—"}</td>}
                    {colValor && <td className="r num">{fmtValor(c.valor)}</td>}
                    {colStatus && <td style={{ color: "var(--muted)" }}>{c.status ?? "—"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
