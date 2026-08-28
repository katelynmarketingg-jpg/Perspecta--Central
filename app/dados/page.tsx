import { Card, Icon, Pill } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, listSupabaseTables, findKeyTables, supabaseStatus } from "@/lib/integrations/supabase";
import { firebaseConfigured, findFirebaseNodes, firebaseStatus } from "@/lib/integrations/firebase";
import { creatorStatus } from "@/lib/integrations/creator";
import { renderStatus } from "@/lib/integrations/render";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Dados() {
  const sistemas = await getSistemas();

  // Prova de conexão ao vivo: nº de tabelas no Supabase compartilhado.
  const refSupabase = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  // Roda tudo em paralelo para não estourar o tempo de execução.
  const [tabelas, chaves, firestore, supaSt, fireSt] = await Promise.all([
    refSupabase && supabaseConfigured() ? listSupabaseTables(refSupabase) : Promise.resolve(null),
    refSupabase && supabaseConfigured() ? findKeyTables(refSupabase) : Promise.resolve(null),
    firebaseConfigured() ? findFirebaseNodes() : Promise.resolve(null),
    refSupabase ? supabaseStatus(refSupabase) : Promise.resolve({ configurado: supabaseConfigured(), ok: false, tabelas: 0 }),
    firebaseStatus(),
  ]);
  const creatorSt = await creatorStatus();
  const renderSt = await renderStatus();
  const mascarar = (col: string) => /senha|password|token|secret|hash|salt/i.test(col);

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Aqui é só pra <b>achar onde estão os clientes e logins de cada sistema</b> dentro do banco. Pra ver onde cada sistema roda, o banco que usa e o custo, veja a aba <b>Sistemas</b>.{tabelas ? ` Supabase conectado ao vivo — ${tabelas.length} tabelas no projeto Commerce+Juris.` : ""}</span>
      </div>

      <Card title="Cada fonte de dados está conectada?" hint="Supabase, Firebase, Creator e Render">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Fonte</th><th>Status</th><th className="r">Encontrado</th><th>Detalhe</th></tr></thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Supabase (Commerce+Juris)</td>
                <td>{!supaSt.configurado ? <Pill s="sem_dados" label="sem chave" /> : supaSt.ok ? <Pill s="ativo" label="conectado" /> : <Pill s="inad" label="erro" />}</td>
                <td className="r num">{supaSt.ok ? `${supaSt.tabelas} tabelas` : "—"}</td>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{!supaSt.configurado ? "configure SUPABASE_MANAGEMENT_TOKEN" : supaSt.ok ? "lendo o banco ao vivo" : "token sem permissão de query ou projeto pausado"}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Firebase (Bistro)</td>
                <td>{!fireSt.configurado ? <Pill s="sem_dados" label="sem chave" /> : fireSt.ok ? <Pill s="ativo" label="conectado" /> : <Pill s="inad" label="erro" />}</td>
                <td className="r num">{fireSt.ok ? `${fireSt.colecoes} coleções` : "—"}</td>
                <td style={{ color: fireSt.ok ? "var(--muted)" : "var(--crit)", fontSize: 12.5 }}>{!fireSt.configurado ? "configure FIREBASE_SERVICE_ACCOUNT" : fireSt.ok ? "lendo o Realtime Database ao vivo" : (fireSt.erro || "falha ao conectar")}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Creator (API)</td>
                <td>{!creatorSt.configurado ? <Pill s="sem_dados" label="sem chave" /> : creatorSt.ok ? <Pill s="ativo" label="conectado" /> : <Pill s="inad" label="erro" />}</td>
                <td className="r num">{creatorSt.ok ? `${creatorSt.clientes} clientes` : "—"}</td>
                <td style={{ color: creatorSt.ok ? "var(--muted)" : "var(--crit)", fontSize: 12.5 }}>{!creatorSt.configurado ? "configure CREATOR_API_URL / CREATOR_USER / CREATOR_PASS" : creatorSt.ok ? "lendo a API do Creator ao vivo" : (creatorSt.erro || "falha ao conectar")}</td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Render (Creator + Juris)</td>
                <td>{!renderSt.configurado ? <Pill s="sem_dados" label="sem chave" /> : renderSt.ok ? <Pill s="ativo" label="conectado" /> : <Pill s="inad" label="erro" />}</td>
                <td className="r num">{renderSt.ok ? `${renderSt.servicos} serviços` : "—"}</td>
                <td style={{ color: renderSt.ok ? "var(--muted)" : renderSt.configurado ? "var(--crit)" : "var(--muted)", fontSize: 12.5 }}>{!renderSt.configurado ? "configure RENDER_API_KEY para ver o custo real" : renderSt.ok ? "lendo os planos e o custo ao vivo" : (renderSt.erro || "falha ao conectar")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {chaves && chaves.length > 0 && (
        <>
          <div className="sec-title" style={{ marginTop: 4 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>Onde estão os clientes e logins</h3>
            <span className="c">{chaves.length} tabelas candidatas · Supabase Commerce+Juris</span>
          </div>
          <div className="banner">
            <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
            <span>O Central varreu o banco e achou estas tabelas com cara de <b>clientes</b> ou <b>logins</b>. É aqui que estão Pedro, Karen e cia. — a partir daqui a gente liga cada uma ao seu sistema. Senhas aparecem mascaradas.</span>
          </div>
          {chaves.map((t) => {
            const cols = Array.from(new Set(t.amostra.flatMap((r: any) => Object.keys(r)))).slice(0, 7);
            const tipoLabel = t.tipo === "logins" ? "logins/usuários" : t.tipo === "ambos" ? "clientes + logins" : "clientes/empresas";
            return (
              <Card key={t.tabela} title={t.tabela}
                hint={`${t.amostra.length}+ registros`}
                action={<Pill s={t.tipo === "logins" ? "pend" : "ativo"} label={tipoLabel} />}>
                <div className="tablewrap">
                  <table>
                    <thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                    <tbody>
                      {t.amostra.map((r: any, i: number) => (
                        <tr key={i}>
                          {cols.map((c) => {
                            if (mascarar(c)) return <td key={c} style={{ color: "var(--faint)" }}>•••</td>;
                            const v = r[c];
                            const txt = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                            return <td key={c} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{txt.length > 50 ? txt.slice(0, 50) + "…" : txt}</td>;
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

      {firestore && firestore.length > 0 && (
        <>
          <div className="sec-title" style={{ marginTop: 4 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>Bistro — Realtime Database (Firebase)</h3>
            <span className="c">{firestore.length} nós · ao vivo</span>
          </div>
          <div className="banner">
            <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
            <span>Nós lidos <b>ao vivo</b> do Realtime Database do Bistro. É aqui que está a Aliança — cada nó vira candidato a clientes/logins do Bistro.</span>
          </div>
          {firestore.map((c) => {
            const cols = Array.from(new Set(c.amostra.flatMap((r: any) => Object.keys(r)))).slice(0, 7);
            return (
              <Card key={c.colecao} title={c.colecao} hint={`${c.amostra.length}+ documentos`} action={<Pill s="ativo" label="Realtime DB" />}>
                <div className="tablewrap">
                  <table>
                    <thead><tr>{cols.map((col) => <th key={col}>{col}</th>)}</tr></thead>
                    <tbody>
                      {c.amostra.map((r: any, i: number) => (
                        <tr key={i}>
                          {cols.map((col) => {
                            if (mascarar(col)) return <td key={col} style={{ color: "var(--faint)" }}>•••</td>;
                            const v = r[col];
                            const txt = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
                            return <td key={col} style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{txt.length > 50 ? txt.slice(0, 50) + "…" : txt}</td>;
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

    </>
  );
}
