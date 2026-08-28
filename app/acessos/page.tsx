import { Icon, Kpi, Card, Pill } from "@/components/ui";
import AcessosCreator from "@/components/AcessosCreator";
import { getSistemas } from "@/lib/data";
import { creatorMe, getCreatorOrgs, getCreatorReceita, creatorConfigured } from "@/lib/integrations/creator";
import { supabaseConfigured, getContasRows } from "@/lib/integrations/supabase";
import { firebaseConfigured, getBistroEstabelecimentos } from "@/lib/integrations/firebase";
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

  const [me, orgsRes, recRes, contasRows, bistroEst] = await Promise.all([
    creatorConfigured() ? creatorMe() : Promise.resolve({ ok: false, superadmin: false, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorReceita() : Promise.resolve({ receita: null }),
    refSb && supabaseConfigured() ? getContasRows(refSb) : Promise.resolve({ commerce: [], juris: [] }),
    firebaseConfigured() ? getBistroEstabelecimentos() : Promise.resolve(null),
  ]);
  const cor = corDe("creator");
  const r = recRes.receita;

  // Empresas que usam cada sistema (visão Perspecta).
  const empresas: Emp[] = [];
  for (const o of orgsRes.orgs || []) empresas.push({ nome: o.name, sistema: nomeDe("creator"), cor: corDe("creator"), gerenciavel: true });
  for (const e of bistroEst || []) empresas.push({ nome: e.nome, sistema: nomeDe("bistro"), cor: corDe("bistro"), gerenciavel: false });
  for (const c of contasRows.commerce || []) empresas.push({ nome: c.nome, sistema: nomeDe("commerce"), cor: corDe("commerce"), gerenciavel: false });
  for (const j of contasRows.juris || []) empresas.push({ nome: j.nome, sistema: nomeDe("juris"), cor: corDe("juris"), gerenciavel: false });

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
        <h3 style={{ fontSize: 15, margin: 0 }}>Gerenciar acessos — Perspecta Creator</h3>
      </div>
      <AcessosCreator me={me} orgs={orgsRes.orgs} orgsErro={orgsRes.erro} cor={cor} />
    </>
  );
}
