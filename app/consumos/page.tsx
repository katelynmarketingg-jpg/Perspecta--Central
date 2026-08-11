import { Card, Pill } from "@/components/ui";
import { getSistemas, getEmpresas, planById, sysById } from "@/lib/data";
import { fmtStorage, initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Consumos() {
  const sistemas = await getSistemas();
  const empresas = getEmpresas();

  const totals = sistemas.map((s) => {
    const se = empresas.filter((e) => e.sis === s.id);
    const used = se.reduce((a, e) => a + e.usoStorage, 0);
    const lim = se.reduce((a, e) => a + (planById(e.plano)?.storage || 0), 0);
    return { name: nomeCurto(s.nome), color: s.cor, used, lim };
  });
  const tmax = Math.max(...totals.map((t) => t.lim || t.used), 1);

  return (
    <>
      <Card title="Consolidado por sistema" hint="armazenamento usado / limite contratado">
        <div className="card-b">
          {totals.map((t, i) => {
            const u = t.lim > 0 ? t.used / t.lim : 0;
            return (
              <div className="hbar-row" key={i}>
                <div className="hbar-lab"><span className="sd" style={{ background: t.color }} />{t.name}</div>
                <div className="hbar-track"><div className="hbar-fill" style={{ width: Math.min(100, (t.used / tmax) * 100) + "%", background: u >= 0.9 ? "var(--crit)" : u >= 0.75 ? "var(--warn)" : "var(--accent)" }} /></div>
                <div className="hbar-val num">{fmtStorage(t.used)} / {fmtStorage(t.lim)}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Detalhe por empresa" hint="armazenamento, registros e logins">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Empresa</th><th>Sistema</th><th>Armazenamento</th><th>Registros</th><th>Logins</th><th>Situação</th></tr></thead>
            <tbody>
              {empresas.map((e) => {
                const p = planById(e.plano);
                const u = p ? e.usoStorage / p.storage : 0;
                const sys = sysById(e.sis);
                const sit = u >= 0.9 ? { s: "vencido", l: "No limite" } : u >= 0.75 ? { s: "pend", l: "Atenção" } : { s: "ativo", l: "Saudável" };
                return (
                  <tr key={e.id}>
                    <td><div className="co"><div className="ci">{initials(e.nome)}</div><div className="cn">{e.nome}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: sys?.cor }} />{nomeCurto(sys?.nome || "")}</span></td>
                    <td className="num">{fmtStorage(e.usoStorage)}{p ? " / " + fmtStorage(p.storage) : ""}</td>
                    <td className="num">{e.usoReg.toLocaleString("pt-BR")}{p ? " / " + p.registros.toLocaleString("pt-BR") : ""}</td>
                    <td className="num">{e.usoLogins}{p ? " / " + p.logins : ""}</td>
                    <td><Pill s={sit.s} label={sit.l} /></td>
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
