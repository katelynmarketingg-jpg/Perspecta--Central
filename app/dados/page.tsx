import { Card, Icon, Pill } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, listSupabaseTables } from "@/lib/integrations/supabase";
import { nomeCurto, BRL } from "@/lib/format";

export const dynamic = "force-dynamic";

// Banco de dados de cada sistema (derivado do host e do supabaseRef).
function bancoDe(host: string, supabaseRef: string | null): { nome: string; nota: string; cor: string } {
  if (supabaseRef) return { nome: "Supabase", nota: "Postgres · plano Free · compartilhado Commerce+Juris", cor: "var(--good)" };
  if (host === "Firebase") return { nome: "Firestore", nota: "Firebase · plano Spark", cor: "var(--warn)" };
  return { nome: "sem banco próprio", nota: "ainda usa dados de exemplo", cor: "var(--faint)" };
}

// Custo real de infra hoje. Tudo em plano gratuito, exceto Render (a confirmar o tier).
function custoInfra(host: string, publicado: boolean): { valor: number | null; nota: string } {
  if (!publicado) return { valor: 0, nota: "não publicado" };
  if (host === "Vercel") return { valor: 0, nota: "Vercel Hobby · grátis" };
  if (host === "Firebase") return { valor: 0, nota: "Firebase Spark · grátis" };
  if (host === "Render") return { valor: null, nota: "Render · confirmar tier" };
  return { valor: 0, nota: "—" };
}

export default async function Dados() {
  const sistemas = await getSistemas();

  // Prova de conexão ao vivo: nº de tabelas no Supabase compartilhado.
  const refSupabase = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  const tabelas = refSupabase && supabaseConfigured() ? await listSupabaseTables(refSupabase) : null;

  const linhas = sistemas.map((s) => {
    const publicado = !s.url.includes("não publicado");
    return {
      s,
      publicado,
      banco: bancoDe(s.host, s.supabaseRef),
      custo: custoInfra(s.host, publicado),
    };
  });
  const custoTotal = linhas.reduce((a, l) => a + (l.custo.valor ?? 0), 0);
  const temRender = linhas.some((l) => l.custo.valor === null);

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Mapa real: <b>onde cada sistema roda</b>, <b>qual banco</b> usa e o <b>custo de infra</b>.{tabelas ? ` Supabase conectado ao vivo — ${tabelas.length} tabelas no projeto Commerce+Juris.` : ""}</span>
      </div>

      <Card title="Infraestrutura & custo por sistema" hint="hospedagem · banco · custo real">
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Sistema</th>
                <th>Onde roda</th>
                <th>Banco de dados</th>
                <th className="r">Custo infra / mês</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map(({ s, publicado, banco, custo }) => (
                <tr key={s.id}>
                  <td><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{nomeCurto(s.nome)}</span></td>
                  <td>
                    {publicado ? (
                      <span><b style={{ color: "var(--text)" }}>{s.host}</b><span style={{ display: "block", fontSize: 11.5, color: "var(--faint)", fontFamily: "var(--mono)" }}>{s.url}</span></span>
                    ) : (
                      <Pill s="sem_dados" label="não publicado" />
                    )}
                  </td>
                  <td>
                    <span style={{ color: banco.cor, fontWeight: 600 }}>{banco.nome}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{banco.nota}</span>
                  </td>
                  <td className="r">
                    <span className="num" style={{ fontWeight: 650, color: custo.valor === null ? "var(--warn)" : custo.valor === 0 ? "var(--good)" : "var(--text)" }}>
                      {custo.valor === null ? "a confirmar" : custo.valor === 0 ? "grátis" : BRL(custo.valor)}
                    </span>
                    <span style={{ display: "block", fontSize: 11.5, color: "var(--faint)" }}>{custo.nota}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Resumo do custo de infraestrutura" hint="quanto você gasta pra manter tudo no ar">
        <div className="card-b">
          <div className="cost-line"><span className="lbl">Custo de infra hoje (planos gratuitos)</span><span className="val num" style={{ color: "var(--good)" }}>{BRL(custoTotal)}{temRender ? " + Render" : ""}</span></div>
          <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>
            Sua infraestrutura está quase toda em <b>planos gratuitos</b> — Supabase Free, Vercel Hobby e Firebase Spark. Ou seja, hoje manter os sistemas no ar custa <b>≈ R$ 0</b>. O único que pode ter custo é o <b>Render</b> (onde roda o Juris). Conforme o uso crescer e os planos virarem pagos, os valores reais aparecem aqui automaticamente.
          </p>
        </div>
      </Card>
    </>
  );
}
