import { Icon, Kpi, Card, Pill } from "@/components/ui";
import AcessosCreator from "@/components/AcessosCreator";
import AcessosSistema from "@/components/AcessosSistema";
import { HistoricoLogins, type LoginRow } from "@/components/HistoricoLogins";
import { getSistemas } from "@/lib/data";
import { creatorMe, getCreatorOrgs, getCreatorReceita, creatorConfigured, creatorStatus } from "@/lib/integrations/creator";
import { firebaseConfigured, getBistroEstabelecimentos } from "@/lib/integrations/firebase";
import { jurisConfigured, jurisStatus, listarEscritoriosJuris } from "@/lib/integrations/juris";
import { commerceConfigured, commerceStatus, listarLojasCommerce } from "@/lib/integrations/commerce";
import { listarLoginsRecentes } from "@/lib/seguranca";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Emp = { nome: string; sistemaId: string; sistema: string; cor: string; gerenciavel: boolean };

export default async function Acessos({ searchParams }: { searchParams?: { sistema?: string } }) {
  const filtro = searchParams?.sistema || "";
  const mostrar = (id: string) => !filtro || filtro === id;
  const sistemas = await getSistemas();
  const corDe = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";
  const nomeDe = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);

  const [me, orgsRes, recRes, lojasCommerce, escritoriosJuris, bistroEst, creatorSt, jurisSt, commerceSt, loginsReais] = await Promise.all([
    creatorConfigured() ? creatorMe() : Promise.resolve({ ok: false, superadmin: false, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorReceita() : Promise.resolve({ receita: null }),
    commerceConfigured() ? listarLojasCommerce() : Promise.resolve(null),
    jurisConfigured() ? listarEscritoriosJuris() : Promise.resolve(null),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
    creatorConfigured() ? creatorStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
    jurisConfigured() ? jurisStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
    commerceConfigured() ? commerceStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
    listarLoginsRecentes(150),
  ]);
  const linhasLogin: LoginRow[] = loginsReais.map((l) => ({
    sistemaId: l.sistemaId, sistemaNome: nomeDe(l.sistemaId), cor: corDe(l.sistemaId),
    empresaRef: l.empresaRef, usuarioEmail: l.usuarioEmail, ip: l.ip,
    resultado: l.resultado, motivo: l.motivo, quando: l.quando,
  }));
  const diag = [
    { sis: "Creator", st: creatorSt },
    { sis: "Juris", st: jurisSt },
    { sis: "Commerce", st: commerceSt },
  ];
  const cor = corDe("creator");
  const r = recRes.receita;

  // Empresas que usam cada sistema (visão Perspecta) — cada uma lida da sua
  // fonte real: Creator (API), Bistro (Firebase), Commerce (Supabase próprio),
  // Juris (API do Render).
  const todasEmpresas: Emp[] = [];
  for (const o of orgsRes.orgs || []) todasEmpresas.push({ nome: o.name, sistemaId: "creator", sistema: nomeDe("creator"), cor: corDe("creator"), gerenciavel: true });
  for (const e of bistroEst || []) todasEmpresas.push({ nome: e.nome, sistemaId: "bistro", sistema: nomeDe("bistro"), cor: corDe("bistro"), gerenciavel: false });
  for (const c of lojasCommerce || []) todasEmpresas.push({ nome: c.nome, sistemaId: "commerce", sistema: nomeDe("commerce"), cor: corDe("commerce"), gerenciavel: false });
  for (const j of escritoriosJuris || []) todasEmpresas.push({ nome: j.nome, sistemaId: "juris", sistema: nomeDe("juris"), cor: corDe("juris"), gerenciavel: false });
  const empresas = todasEmpresas.filter((e) => mostrar(e.sistemaId));

  const porSistema = new Map<string, number>();
  for (const e of empresas) porSistema.set(e.sistema, (porSistema.get(e.sistema) || 0) + 1);

  // Diagnóstico por fonte: null = não conseguiu ler; array = leu (pode ser 0).
  const fontes = [
    { id: "creator", sis: "Creator", cor: corDe("creator"), leu: orgsRes.orgs !== null, n: (orgsRes.orgs || []).length, erro: orgsRes.erro },
    { id: "juris", sis: "Juris", cor: corDe("juris"), leu: escritoriosJuris !== null, n: (escritoriosJuris || []).length, erro: jurisSt.erro },
    { id: "commerce", sis: "Commerce", cor: corDe("commerce"), leu: lojasCommerce !== null, n: (lojasCommerce || []).length, erro: commerceSt.erro },
    { id: "bistro", sis: "Bistro", cor: corDe("bistro"), leu: bistroEst !== null, n: (bistroEst || []).length, erro: firebaseConfigured() ? undefined : "sem chave" },
  ];

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          A <b>operação</b> dos logins: criar acesso direto em cada sistema, gerenciar os logins do Creator e ver o histórico de entradas. Cliente novo, com teste grátis e cobrança? Use <a href="/convites?novo=1" style={{ color: "var(--accent)", fontWeight: 600 }}>Novo cliente</a> — lá o próprio cliente cria o login no 1º acesso.
        </span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' k="Empresas (todos os sistemas)" v={empresas.length} />
        {r
          ? <><Kpi icon='<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' k="Receita/mês (Creator)" v={BRL(r.mrr)} />
              <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Pagantes (Creator)" v={r.pagantes} />
              <Kpi icon='<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' k="Em teste (Creator)" v={r.emTeste} /></>
          : <Kpi icon='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' k="Creator" v={me.superadmin ? "master" : "conta comum"} />}
      </div>

      <Card title="Criar acesso — diagnóstico por sistema" hint="se cada sistema está pronto para criar login automático">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Sistema</th><th>Status</th><th>Detalhe / o que falta</th></tr></thead>
            <tbody>
              {diag.map((d) => (
                <tr key={d.sis}>
                  <td style={{ fontWeight: 600 }}>{d.sis}</td>
                  <td>{!d.st.configurado ? <Pill s="sem_dados" label="sem chave" /> : d.st.ok ? <Pill s="ativo" label="pronto" /> : <Pill s="inad" label="erro" />}</td>
                  <td style={{ color: d.st.ok ? "var(--muted)" : "var(--crit)", fontSize: 12.5 }}>
                    {!d.st.configurado ? "faltam as variáveis desse sistema no Vercel" : d.st.ok ? "conecta e pode criar acesso" : (d.st.erro || "falha ao conectar")}
                  </td>
                </tr>
              ))}
              <tr><td style={{ fontWeight: 600 }}>Bistro</td><td><Pill s={firebaseConfigured() ? "ativo" : "sem_dados"} label={firebaseConfigured() ? "lê ao vivo" : "sem chave"} /></td><td style={{ color: "var(--muted)", fontSize: 12.5 }}>criação automática ainda não; hoje só leitura</td></tr>
            </tbody>
          </table>
        </div>
      </Card>

      {mostrar("creator") && (
        <>
          <div className="sec-title" style={{ marginTop: 18 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}>Gerenciar acessos — Perspecta Creator</h3>
          </div>
          <AcessosCreator me={me} orgs={orgsRes.orgs} orgsErro={orgsRes.erro} cor={cor} />
        </>
      )}

      {(mostrar("juris") || mostrar("commerce")) && (
        <div className="sec-title" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 15, margin: 0 }}>Criar acesso direto — Juris e Commerce</h3>
        </div>
      )}
      {mostrar("juris") && (
        <AcessosSistema
          kind="juris" titulo="Perspecta Juris" cor={corDe("juris")}
          pronto={jurisSt.configurado && jurisSt.ok}
          motivoBloqueio={!jurisSt.configurado ? "Faltam as variáveis JURIS_* no Vercel." : jurisSt.erro}
        />
      )}
      {mostrar("commerce") && (
        <AcessosSistema
          kind="commerce" titulo="Perspecta Commerce" cor={corDe("commerce")}
          pronto={commerceSt.configurado && commerceSt.ok}
          motivoBloqueio={!commerceSt.configurado ? "Faltam as variáveis COMMERCE_SUPABASE_* no Vercel." : commerceSt.erro}
        />
      )}

      <div className="sec-title" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Contas e histórico de logins</h3>
      </div>
      <Card title="Contas por sistema" hint={`${empresas.length} no total · lidas ao vivo · clique pra filtrar`}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {filtro && (
            <a href="/acessos" style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 999, padding: "5px 12px", fontSize: 12.5, textDecoration: "none", color: "var(--text)" }}>
              ← Todos
            </a>
          )}
          {fontes.map((f) => {
            const ativo = filtro === f.id;
            return (
              <a key={f.sis} href={ativo ? "/acessos" : `/acessos?sistema=${f.id}`} title={f.erro || "clique para filtrar"}
                style={{ display: "inline-flex", alignItems: "center", gap: 7, background: ativo ? f.cor : "var(--panel-2)", border: `1px solid ${ativo ? f.cor : "var(--border)"}`, borderRadius: 999, padding: "5px 12px", fontSize: 12.5, textDecoration: "none", color: ativo ? "#fff" : "var(--text)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: ativo ? "#fff" : f.cor }} />
                <b>{f.sis}</b>
                {f.leu ? <span style={{ color: ativo ? "rgba(255,255,255,.85)" : "var(--muted)" }}>{f.n} {f.n === 1 ? "conta" : "contas"}</span>
                       : <span style={{ color: ativo ? "#fff" : "var(--crit)" }}>não conectou</span>}
              </a>
            );
          })}
        </div>
        <div style={{ marginTop: 12, fontSize: 12.5, color: "var(--muted)" }}>
          A lista completa das empresas (contato, plano, valor, status) fica em <a href="/clientes" style={{ color: "var(--accent)", fontWeight: 600 }}>Clientes →</a>. Aqui é a <b>operação</b>: criar acesso e ver os logins.
        </div>
      </Card>

      <Card title="Histórico de logins" hint="todo login, de quem já manda o evento — sucesso e falha">
        {linhasLogin.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Ainda sem nenhum login registrado — aparece aqui assim que um sistema mandar o primeiro evento.</div>
        ) : (
          <HistoricoLogins linhas={linhasLogin} />
        )}
      </Card>

    </>
  );
}
