import { Card, Icon, Pill } from "@/components/ui";
import { getSistemas } from "@/lib/data";
import { supabaseConfigured, listSupabaseTables, findKeyTables, supabaseStatus, getContagemContas } from "@/lib/integrations/supabase";
import { firebaseConfigured, findFirebaseNodes, firebaseStatus, getContagemContasBistro } from "@/lib/integrations/firebase";
import { getCreatorReceita } from "@/lib/integrations/creator";
import { creatorStatus } from "@/lib/integrations/creator";
import { renderConfigured, renderStatus, getRenderCustos, BRL_POR_USD, type RenderCusto } from "@/lib/integrations/render";
import { nomeCurto, BRL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Banco de dados de cada sistema (derivado do host e do supabaseRef).
function bancoDe(host: string, supabaseRef: string | null): { nome: string; nota: string; cor: string } {
  if (supabaseRef) return { nome: "Supabase", nota: "Postgres · plano Free · compartilhado Commerce+Juris", cor: "var(--good)" };
  if (host === "Firebase") return { nome: "Realtime Database", nota: "Firebase · plano Spark", cor: "var(--warn)" };
  return { nome: "sem banco próprio", nota: "ainda usa dados de exemplo", cor: "var(--faint)" };
}

// Custo real de infra hoje. Vercel/Firebase no grátis; Render lido ao vivo pela API.
function custoInfra(host: string, publicado: boolean, rc?: RenderCusto | null): { valor: number | null; nota: string } {
  if (!publicado) return { valor: 0, nota: "não publicado" };
  if (host === "Vercel") return { valor: 0, nota: "Vercel Hobby · grátis" };
  if (host === "Firebase") return { valor: 0, nota: "Firebase Spark · grátis" };
  if (host === "Render") {
    if (rc && rc.totalUsd != null) return { valor: rc.totalUsd * BRL_POR_USD, nota: `US$ ${rc.totalUsd.toFixed(2)}/mês · ${rc.detalhe}` };
    if (rc) return { valor: null, nota: `Render · ${rc.detalhe}` };
    return { valor: null, nota: "Render · confirmar tier" };
  }
  return { valor: 0, nota: "—" };
}

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
  const renderCustos = renderConfigured() ? (await getRenderCustos()).custos : null;
  // Conferência das "contas" (empresas que pagam) por sistema e de onde vem o número.
  const [contasSb, bistroContas, creatorRec] = await Promise.all([
    refSupabase && supabaseConfigured() ? getContagemContas(refSupabase) : Promise.resolve({ juris: null, commerce: null, candidatas: [] as any[], jurisTabela: undefined, commerceTabela: undefined }),
    firebaseConfigured() ? getContagemContasBistro() : Promise.resolve({ n: null, candidatos: [] as any[], no: undefined }),
    getCreatorReceita(),
  ]);
  const contasConf = [
    { sis: "Commerce", n: contasSb.commerce, fonte: contasSb.commerceTabela ? `Supabase · ${contasSb.commerceTabela}` : "tabela não encontrada" },
    { sis: "Juris", n: contasSb.juris, fonte: contasSb.jurisTabela ? `Supabase · ${contasSb.jurisTabela}` : "tabela não encontrada" },
    { sis: "Creator", n: creatorRec.receita?.total ?? null, fonte: "Creator API · escritórios" },
    { sis: "Bistro", n: bistroContas.n, fonte: bistroContas.no ? `Firebase · nó "${bistroContas.no}"` : "nó não encontrado" },
  ];
  const mascarar = (col: string) => /senha|password|token|secret|hash|salt/i.test(col);

  // Acha o custo Render de um serviço pelo host (ex.: saas-agency-k9ft.onrender.com).
  function renderCustoDoSistema(url: string): RenderCusto | null {
    if (!renderCustos) return null;
    const host = url.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase();
    return renderCustos.find((c) => c.servico.host?.toLowerCase() === host)
      || renderCustos.find((c) => c.servico.nome && host.includes(c.servico.nome.toLowerCase()))
      || null;
  }

  const linhas = sistemas.map((s) => {
    const publicado = !s.url.includes("não publicado");
    return {
      s,
      publicado,
      banco: bancoDe(s.host, s.supabaseRef),
      custo: custoInfra(s.host, publicado, s.host === "Render" ? renderCustoDoSistema(s.url) : null),
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

      <Card title="Diagnóstico de conexão" hint="cada integração conectou de verdade?">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Integração</th><th>Status</th><th className="r">Encontrado</th><th>Detalhe</th></tr></thead>
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

      <Card title="Contas por sistema" hint="quantas empresas pagam/usam · de onde vem o número">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Sistema</th><th className="r">Contas</th><th>Fonte do número</th></tr></thead>
            <tbody>
              {contasConf.map((c) => (
                <tr key={c.sis}>
                  <td style={{ fontWeight: 600 }}>{c.sis}</td>
                  <td className="r num" style={{ fontWeight: 650, color: c.n == null ? "var(--warn)" : "var(--text)" }}>{c.n == null ? "a mapear" : c.n}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{c.fonte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--faint)" }}>
          Se algum número não bater com a realidade, me diga o certo — eu aponto a tabela/nó correto.
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
