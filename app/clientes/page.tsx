import { Card, Kpi, Pill } from "@/components/ui";
import { getEmpresas, planById, sysById } from "@/lib/data";
import { initials, nomeCurto, fmtStorage } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Clientes() {
  const empresas = getEmpresas();
  const by = (s: string) => empresas.filter((e) => e.status === s).length;

  return (
    <>
      <div className="grid-kpi">
        <Kpi k="Ativas" v={by("ativo")} delta="+3" dir="up" />
        <Kpi k="Inadimplentes" v={by("inad")} delta="ação necessária" dir="down" />
        <Kpi k="Pendentes" v={by("pend")} delta="aguardando 1º pgto" dir="flat" />
        <Kpi k="Total" v={empresas.length} delta="7 sistemas" dir="flat" />
      </div>
      <Card title="Todas as empresas" hint="consumo, plano e vencimento">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Empresa</th><th>Sistema</th><th>Plano</th><th>Adeptos</th><th>Armazenamento</th><th>Status</th><th>Vencimento</th></tr></thead>
            <tbody>
              {empresas.map((e) => {
                const p = planById(e.plano);
                const u = p ? Math.round((e.usoStorage / p.storage) * 100) : 0;
                const sys = sysById(e.sis);
                return (
                  <tr key={e.id}>
                    <td><div className="co"><div className="ci">{initials(e.nome)}</div><div><div className="cn">{e.nome}</div><div className="ce">{e.email}</div></div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: sys?.cor }} />{nomeCurto(sys?.nome || "")}</span></td>
                    <td>{p?.nome || "—"}</td>
                    <td className="num">{e.adeptos}</td>
                    <td><div className="usage-cell"><span className="mini-track"><span className="mini-fill" style={{ width: Math.min(100, u) + "%", background: u >= 90 ? "var(--crit)" : u >= 75 ? "var(--warn)" : "var(--accent)" }} /></span><span className="p num">{u}%</span></div></td>
                    <td><Pill s={e.status} /></td>
                    <td className="num">{e.venc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
