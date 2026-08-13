import { Card, Kpi, Pill, Icon } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, getClientRows } from "@/lib/integrations/supabase";
import { firebaseConfigured, getFirestoreClientDocs } from "@/lib/integrations/firebase";
import { BRL, initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Pega o 1º valor de um registro cujo nome de coluna casa com o padrão.
function pick(row: Record<string, any>, re: RegExp): any {
  for (const k of Object.keys(row)) {
    if (re.test(k) && row[k] != null && row[k] !== "") return row[k];
  }
  return null;
}

type ClienteReal = { nome: string; contato: string | null; valor: any; fonte: string; sistemas: string; cor: string };

export default async function Clientes() {
  const sistemas = await getSistemas();

  const grupos: { fonte: string; sistemas: string; cor: string; clientes: ClienteReal[] }[] = [];

  // Fontes Supabase (um projeto pode ser compartilhado por vários sistemas).
  const refs = new Map<string, typeof sistemas>();
  for (const s of sistemas) {
    if (!s.supabaseRef) continue;
    refs.set(s.supabaseRef, [...(refs.get(s.supabaseRef) || []), s]);
  }
  if (supabaseConfigured()) {
    for (const [ref, sis] of refs) {
      const tabelas = await getClientRows(ref);
      const nomesSis = sis.map((x) => nomeCurto(x.nome)).join(" / ");
      const cor = sis[0]?.cor || "var(--accent)";
      for (const t of tabelas || []) {
        grupos.push({
          fonte: `Supabase · ${t.tabela}`,
          sistemas: nomesSis,
          cor,
          clientes: t.rows.map((r) => ({
            nome: String(pick(r, /^(name|nome|razao|fantasia|full_name|title|razao_social|nome_fantasia)/i) ?? pick(r, /nome|name/i) ?? r.id ?? "—"),
            contato: pick(r, /email/i) ?? pick(r, /phone|telefone|celular|whatsapp/i),
            valor: pick(r, /valor|amount|preco|price|total|mensalidade|monthly|plan/i),
            fonte: t.tabela,
            sistemas: nomesSis,
            cor,
          })),
        });
      }
    }
  }

  // Fonte Firebase (Bistro).
  if (firebaseConfigured()) {
    const bistro = sistemas.find((s) => s.host === "Firebase");
    const cor = bistro?.cor || "var(--accent)";
    const cols = await getFirestoreClientDocs();
    for (const c of cols || []) {
      grupos.push({
        fonte: `Firebase · ${c.colecao}`,
        sistemas: bistro ? nomeCurto(bistro.nome) : "Bistro",
        cor,
        clientes: c.rows.map((r) => ({
          nome: String(pick(r, /^(name|nome|razao|fantasia|full_name|title)/i) ?? pick(r, /nome|name/i) ?? r.id ?? "—"),
          contato: pick(r, /email/i) ?? pick(r, /phone|telefone|celular|whatsapp/i),
          valor: pick(r, /valor|amount|preco|price|total|mensalidade|monthly|plan/i),
          fonte: c.colecao,
          sistemas: bistro ? nomeCurto(bistro.nome) : "Bistro",
          cor,
        })),
      });
    }
  }

  const totalClientes = grupos.reduce((a, g) => a + g.clientes.length, 0);
  const fontesConectadas = (supabaseConfigured() ? 1 : 0) + (firebaseConfigured() ? 1 : 0);
  const fmtValor = (v: any) => {
    if (v == null || v === "") return "—";
    const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(".", "").replace(",", "."));
    return Number.isFinite(n) && n > 0 ? BRL(n) : String(v);
  };

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Clientes reais" v={totalClientes} />
        <Kpi icon='<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>' k="Fontes conectadas" v={fontesConectadas} />
        <Kpi icon='<path d="M3 12h4l3 8 4-16 3 8h4"/>' k="Tabelas/coleções com clientes" v={grupos.length} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Clientes lidos <b>ao vivo</b> dos bancos conectados (Supabase Commerce+Juris, Firebase Bistro). Cada bloco mostra a origem real. Sistemas ainda sem banco conectado (Creator, Hub) aparecem quando plugarmos.</span>
      </div>

      {grupos.length === 0 && (
        <Card>
          <div className="placeholder">
            <div className="pi"><Icon path='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' size={24} /></div>
            <h3>Nenhum cliente real encontrado ainda</h3>
            <p>Ou as chaves não estão conectadas, ou as tabelas de clientes têm outro formato. Veja em <b>Dados reais</b> quais tabelas existem e me diga qual é a de clientes.</p>
          </div>
        </Card>
      )}

      {grupos.map((g, gi) => (
        <Card key={gi} title={g.fonte}
          hint={`${g.clientes.length} cliente(s)`}
          action={<span className="sys-tag"><span className="sd" style={{ background: g.cor }} />{g.sistemas}</span>}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Cliente</th><th>Contato</th><th className="r">Valor</th><th>Sistema</th></tr></thead>
              <tbody>
                {g.clientes.map((c, i) => (
                  <tr key={i}>
                    <td><div className="co"><div className="ci">{initials(c.nome)}</div><div className="cn">{c.nome}</div></div></td>
                    <td style={{ color: "var(--muted)" }}>{c.contato ?? "—"}</td>
                    <td className="r num">{fmtValor(c.valor)}</td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: c.cor }} />{c.sistemas}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </>
  );
}
