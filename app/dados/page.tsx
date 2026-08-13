import { Card, Icon, Pill } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, listSupabaseTables, runSupabaseQuery } from "@/lib/integrations/supabase";
import { nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

// Leitor de dados reais: abre o(s) projeto(s) Supabase conectado(s) e mostra as
// tabelas de verdade que existem lá — o primeiro passo para trocar mock por dados vivos.
export default async function Dados() {
  const sistemas = await getSistemas();
  // Projetos Supabase distintos em uso, com os sistemas que compartilham cada um.
  const refs = new Map<string, string[]>();
  for (const s of sistemas) {
    if (!s.supabaseRef) continue;
    refs.set(s.supabaseRef, [...(refs.get(s.supabaseRef) || []), nomeCurto(s.nome)]);
  }

  if (!supabaseConfigured()) {
    return (
      <div className="card">
        <div className="placeholder">
          <div className="pi"><Icon path='<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/>' size={24} /></div>
          <h3>Dados reais</h3>
          <p>Configure o <b>SUPABASE_MANAGEMENT_TOKEN</b> na Vercel para o Central ler as tabelas reais dos seus sistemas.</p>
        </div>
      </div>
    );
  }

  const blocos = await Promise.all(
    [...refs.entries()].map(async ([ref, sis]) => {
      const tabelas = await listSupabaseTables(ref);
      // Prévia das tabelas que têm dados (até 6 tabelas, 5 linhas cada).
      const previews = await Promise.all(
        (tabelas || [])
          .filter((t) => t.linhas > 0)
          .slice(0, 6)
          .map(async (t) => {
            const rows = await runSupabaseQuery(ref, `select to_jsonb(x) as r from "${t.tabela}" x limit 5;`);
            return { tabela: t.tabela, linhas: t.linhas, rows: (rows || []).map((o) => o.r).filter(Boolean) };
          })
      );
      return { ref, sis, tabelas, previews };
    })
  );

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Dados <b>ao vivo</b> lidos direto do Supabase (Management API). É o que existe de verdade nos bancos — a base para substituir o mock por clientes/logins reais.</span>
      </div>

      {blocos.map((b) => (
        <div key={b.ref} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="sec-title">
            <h3 style={{ fontSize: 15, margin: 0 }}>Projeto Supabase</h3>
            <span className="c" style={{ fontFamily: "var(--mono)" }}>{b.ref}</span>
            <span className="sp">{b.sis.map((n) => <Pill key={n} s="ativo" label={n} />)}</span>
          </div>

          {b.tabelas === null ? (
            <Card><div className="card-b"><span style={{ color: "var(--crit)" }}>Não consegui ler este projeto (token sem acesso ou projeto pausado).</span></div></Card>
          ) : b.tabelas.length === 0 ? (
            <Card><div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhuma tabela no schema público ainda.</span></div></Card>
          ) : (
            <>
              <Card title="Tabelas encontradas" hint={`${b.tabelas.length} tabelas · schema public`}>
                <div className="tablewrap">
                  <table>
                    <thead><tr><th>Tabela</th><th className="r">Linhas (aprox.)</th></tr></thead>
                    <tbody>
                      {b.tabelas.map((t) => (
                        <tr key={t.tabela}>
                          <td style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{t.tabela}</td>
                          <td className="r num" style={{ color: t.linhas > 0 ? "var(--good)" : "var(--faint)" }}>{t.linhas}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {b.previews.filter((p) => p.rows.length > 0).map((p) => {
                const cols = Array.from(new Set(p.rows.flatMap((r: any) => Object.keys(r)))).slice(0, 8);
                return (
                  <Card key={p.tabela} title={p.tabela} hint={`prévia · ${p.linhas} linha(s)`}>
                    <div className="tablewrap">
                      <table>
                        <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                        <tbody>
                          {p.rows.map((r: any, i: number) => (
                            <tr key={i}>
                              {cols.map((c) => {
                                const v = r[c];
                                const txt = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                                return <td key={c} style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{txt.length > 60 ? txt.slice(0, 60) + "…" : txt}</td>;
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      ))}

      {blocos.length === 0 && (
        <Card><div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhum sistema aponta para um projeto Supabase ainda.</span></div></Card>
      )}
    </>
  );
}
