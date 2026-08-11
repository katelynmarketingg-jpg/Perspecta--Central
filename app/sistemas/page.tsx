import { Card, Pill, SourceTag, Icon } from "@/components/ui";
import { getSistemas, getEmpresas, receitaSistema } from "@/lib/data";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

const dotColor = (s: string) =>
  s === "operacional" ? "var(--good)" : s === "degradado" ? "var(--warn)" : s === "com_erro" ? "var(--crit)" : "var(--faint)";

export default async function Infra() {
  const sistemas = await getSistemas();
  const empresas = getEmpresas();

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Status vem <b>ao vivo</b> do Supabase e da Vercel quando as chaves estão configuradas. O <b>Render</b> (Juris, Creator) ainda não tem integração — esses ficam <b>manuais</b> até existir uma forma melhor.
        </span>
      </div>

      <div className="sys-grid">
        {sistemas.map((s) => {
          const emps = empresas.filter((e) => e.sis === s.id);
          const openBugs = s.bugs.filter((b) => b.st !== "resolvido").length;
          return (
            <div className="card sys-card" key={s.id}>
              <div className="sys-top">
                <div className="sys-logo" style={{ background: `linear-gradient(135deg,${s.cor},${s.cor}cc)` }}>{nomeCurto(s.nome)[0]}</div>
                <div style={{ flex: 1 }}>
                  <div className="sys-name">{s.nome}</div>
                  <div className="sys-url">{s.url}</div>
                </div>
                <span className="health-dot" style={{ background: dotColor(s.status) }} />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pill s={s.status} /><SourceTag source={s.statusSource} />
              </div>

              <div className="sys-stats">
                <div className="sys-stat"><div className="n num">{emps.length}</div><div className="l">Clientes</div></div>
                <div className="sys-stat"><div className="n num">{BRL(receitaSistema(s.id))}</div><div className="l">MRR</div></div>
                <div className="sys-stat"><div className="n num">{s.uptime.toFixed(2)}%</div><div className="l">Uptime</div></div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Hospedagem</span><b style={{ color: "var(--text)" }}>{s.host}{s.host === "Render" ? " (manual)" : ""}</b></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Repositório</span><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.repo}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Supabase</span><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.supabaseRef || "—"}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Último deploy</span><span>{s.ultimoDeploy ? `${s.ultimoDeploy.estado} · ${s.ultimoDeploy.quando}` : "sem dados"}</span></div>
              </div>

              {openBugs > 0 && (
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                  {s.bugs.filter((b) => b.st !== "resolvido").map((b, i) => (
                    <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                      <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flex: "none", background: b.sev === "alta" ? "var(--crit)" : b.sev === "media" ? "var(--warn)" : "var(--info)" }} />
                      <div><div style={{ color: "var(--text)", fontWeight: 600 }}>{b.t}</div><div style={{ color: "var(--faint)" }}>{b.d} · {b.st}</div></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
