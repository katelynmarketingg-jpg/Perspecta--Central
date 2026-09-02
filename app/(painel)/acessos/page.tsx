import { Icon, Kpi, Card, Pill } from "@/components/ui";
import AcessosCreator from "@/components/AcessosCreator";
import AcessosConvite from "@/components/AcessosConvite";
import { getSistemas, getPlanos } from "@/lib/data";
import { listarConvites } from "@/lib/convites";
import { creatorMe, getCreatorOrgs, getCreatorReceita, creatorConfigured, creatorStatus } from "@/lib/integrations/creator";
import { supabaseConfigured, getContasRows, nomeEmpresaRow } from "@/lib/integrations/supabase";
import { firebaseConfigured, getBistroEstabelecimentos } from "@/lib/integrations/firebase";
import { jurisConfigured, jurisStatus } from "@/lib/integrations/juris";
import { commerceConfigured, commerceStatus } from "@/lib/integrations/commerce";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type Emp = { nome: string; sistema: string; cor: string; gerenciavel: boolean };

export default async function Acessos() {
  const sistemas = await getSistemas();
  const refSb = sistemas.find((s) => s.supabaseRef)?.supabaseRef || null;
  const corDe = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";
  const nomeDe = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);

  const [me, orgsRes, recRes, contasRows, bistroEst, convites, creatorSt, jurisSt, commerceSt] = await Promise.all([
    creatorConfigured() ? creatorMe() : Promise.resolve({ ok: false, superadmin: false, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorReceita() : Promise.resolve({ receita: null }),
    refSb && supabaseConfigured() ? getContasRows(refSb) : Promise.resolve({ commerce: [], juris: [] }),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
    listarConvites(),
    creatorConfigured() ? creatorStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
    jurisConfigured() ? jurisStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
    commerceConfigured() ? commerceStatus() : Promise.resolve({ configurado: false, ok: false, erro: "sem chave" }),
  ]);
  const diag = [
    { sis: "Creator", st: creatorSt },
    { sis: "Juris", st: jurisSt },
    { sis: "Commerce", st: commerceSt },
  ];
  const planos = getPlanos();
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }));
  const cor = corDe("creator");
  const r = recRes.receita;

  // Empresas que usam cada sistema (visão Perspecta).
  const empresas: Emp[] = [];
  for (const o of orgsRes.orgs || []) empresas.push({ nome: o.name, sistema: nomeDe("creator"), cor: corDe("creator"), gerenciavel: true });
  for (const e of bistroEst || []) empresas.push({ nome: e.nome, sistema: nomeDe("bistro"), cor: corDe("bistro"), gerenciavel: false });
  for (const c of contasRows.commerce || []) empresas.push({ nome: nomeEmpresaRow(c), sistema: nomeDe("commerce"), cor: corDe("commerce"), gerenciavel: false });
  for (const j of contasRows.juris || []) empresas.push({ nome: nomeEmpresaRow(j), sistema: nomeDe("juris"), cor: corDe("juris"), gerenciavel: false });

  const porSistema = new Map<string, number>();
  for (const e of empresas) porSistema.set(e.sistema, (porSistema.get(e.sistema) || 0) + 1);

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          <b>Empresas que usam cada sistema</b> (a visão da Perspecta, dona) e os <b>logins</b> de cada uma. Hoje dá pra <b>gerenciar</b> os do Creator; os outros aparecem para consulta e ganham gestão em seguida.
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

      <Card title="Empresas por sistema" hint={`${empresas.length} no total · lidas ao vivo`}>
        {empresas.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Nenhuma empresa listada ainda. {!me.superadmin && "No Creator, conecte a conta master para ver todos os escritórios."}
          </div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th>Logins</th></tr></thead>
              <tbody>
                {empresas.map((e, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{e.nome}</td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: e.cor }} />{e.sistema}</span></td>
                    <td>{e.gerenciavel ? <Pill s="ativo" label="gerenciar abaixo" /> : <Pill s="muted" label="em breve" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="sec-title" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Convites de primeiro acesso — todos os sistemas</h3>
      </div>
      <AcessosConvite sistemas={sisSimples} planos={planos} convites={convites} />

      <div className="sec-title" style={{ marginTop: 18 }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>Gerenciar acessos — Perspecta Creator</h3>
      </div>
      <AcessosCreator me={me} orgs={orgsRes.orgs} orgsErro={orgsRes.erro} cor={cor} />
    </>
  );
}
