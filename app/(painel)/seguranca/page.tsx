import { Card, Icon, Pill } from "@/components/ui";
import { getSistemas, getEmpresas, getPagamentos, empById, sysById, planById } from "@/lib/data";
import { listarAlertasReais, detectarAcessoMultiploDispositivo, resumoLoginsPorSistema } from "@/lib/seguranca";
import { nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

const SEV_ICO: Record<string, string> = {
  "acesso.suspeito": '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
  "limite.atingido": '<path d="M22 12A10 10 0 1 1 12 2v10z"/>',
};

export default async function Seguranca() {
  const [sistemas, empresas, pagamentos, alertasReais, multiDispositivo, resumoLogins] = await Promise.all([
    getSistemas(), getEmpresas(), getPagamentos(), listarAlertasReais(), detectarAcessoMultiploDispositivo(), resumoLoginsPorSistema(),
  ]);
  const nomeDoSistema = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);
  const corDoSistema = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";

  const alerts: { sev: string; t: string; d: string; tm: string; ico: string }[] = [];
  pagamentos.forEach((p) => {
    if (p.status === "vencido" || p.status === "falhou") {
      const e = empById(empresas, p.emp)!;
      alerts.push({ sev: "crit", t: (p.status === "vencido" ? "Inadimplência" : "Pagamento falhou") + " — " + e.nome, d: p.motivo || "", tm: p.data, ico: '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' });
    }
  });
  empresas.forEach((e) => {
    const p = planById(e.plano);
    if (p && e.usoStorage / p.storage >= 0.9 && e.status !== "canc") {
      alerts.push({ sev: "warn", t: "Limite de armazenamento — " + Math.round((e.usoStorage / p.storage) * 100) + "%", d: e.nome + " · " + sysById(e.sis)?.nome, tm: "hoje", ico: '<path d="M22 12A10 10 0 1 1 12 2v10z"/>' });
    }
  });
  alertasReais.forEach((a) => {
    alerts.push({
      sev: a.severidade === "alta" ? "crit" : a.severidade === "baixa" ? "info" : "warn",
      t: a.titulo + (a.sistemaId ? ` — ${nomeDoSistema(a.sistemaId)}` : ""),
      d: a.tipo, tm: new Date(a.criadoEm).toLocaleString("pt-BR"),
      ico: SEV_ICO[a.tipo] || '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    });
  });
  multiDispositivo.forEach((m) => {
    alerts.push({
      sev: "warn",
      t: `Login de ${m.ipsDistintos} IPs diferentes em 24h — ${m.usuarioEmail || m.empresaRef || "usuário"}`,
      d: `${nomeDoSistema(m.sistemaId)} · ${m.tentativas} acessos`,
      tm: new Date(m.ultimoAcesso).toLocaleString("pt-BR"),
      ico: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>',
    });
  });
  alerts.sort((a, b) => (a.sev === "crit" ? -1 : b.sev === "crit" ? 1 : 0));

  const bugsAll: { sisId: string; cor: string; sisNome: string; t: string; sev: string; d: string; st: string }[] = [];
  sistemas.forEach((s) => s.bugs.forEach((b) => bugsAll.push({ sisId: s.id, cor: s.cor, sisNome: nomeCurto(s.nome), ...b })));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          <b>Alertas reais</b>: inadimplência e limite vêm dos dados dos convites; acesso suspeito e "mais de um dispositivo" vêm dos webhooks que os sistemas já mandam (Creator e Commerce, por enquanto). Sem eventos ainda de um sistema, ele simplesmente não aparece aqui — não é erro.
        </span>
      </div>

      {resumoLogins.length > 0 && (
        <Card title="Logins nas últimas 24h" hint="por sistema, de quem já manda o evento login.novo">
          <div className="tablewrap">
            <table>
              <thead><tr><th>Sistema</th><th className="r">Sucesso</th><th className="r">Falha</th></tr></thead>
              <tbody>
                {resumoLogins.map((r) => (
                  <tr key={r.sistemaId}>
                    <td><span className="sys-tag"><span className="sd" style={{ background: corDoSistema(r.sistemaId) }} />{nomeDoSistema(r.sistemaId)}</span></td>
                    <td className="r num" style={{ color: "var(--good)" }}>{r.sucessos24h}</td>
                    <td className="r num" style={{ color: r.falhas24h > 0 ? "var(--crit)" : "var(--muted)" }}>{r.falhas24h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="row2">
        <Card title="Central de alertas" hint={alerts.length + " eventos"}>
          {alerts.map((a, i) => (
            <div className={"alert " + a.sev} key={i}>
              <div className="aic"><Icon path={a.ico} size={16} /></div>
              <div><div className="at">{a.t}</div><div className="ad">{a.d}</div></div>
              <div className="tm">{a.tm}</div>
            </div>
          ))}
          {alerts.length === 0 && <div className="card-b"><span style={{ color: "var(--muted)" }}>Sem alertas.</span></div>}
        </Card>
        <Card title="Bugs em todos os sistemas" hint={bugsAll.length + " registrados"}>
          {bugsAll.map((b, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "13px 16px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", flex: "none", background: b.sev === "alta" ? "var(--crit)" : b.sev === "media" ? "var(--warn)" : "var(--info)" }} />
              <div style={{ flex: 1 }}><div style={{ fontWeight: 600, fontSize: 13 }}>{b.t}</div><div style={{ fontSize: 12, color: "var(--faint)" }}><span className="sys-tag"><span className="sd" style={{ background: b.cor }} />{b.sisNome}</span> · {b.d}</div></div>
              <span className={"pill " + (b.st === "aberto" ? "warn" : "good")}>{b.st}</span>
            </div>
          ))}
          {bugsAll.length === 0 && <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhum bug.</span></div>}
        </Card>
      </div>
    </>
  );
}
