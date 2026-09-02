import { Pill } from "@/components/ui";
import { getTickets, getEmpresas, empById, sysById } from "@/lib/data";
import { initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

const prioCls: Record<string, string> = { alta: "crit", media: "warn", baixa: "muted" };

export default async function Suporte() {
  const [tickets, empresas] = await Promise.all([Promise.resolve(getTickets()), getEmpresas()]);
  const sel = tickets[0];
  const e = sel ? empById(empresas, sel.emp) : null;

  return (
    <>
      <div className="sec-title"><h2 style={{ display: "none" }}>Suporte</h2><span className="c">{tickets.filter((t) => t.st !== "resolvido").length} abertos · tempo médio 3h12</span></div>
      <div className="row2">
        <div className="card" style={{ overflow: "hidden" }}>
          {tickets.map((t) => {
            const emp = empById(empresas, t.emp)!;
            return (
              <div key={t.id} style={{ padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 640, fontSize: 13 }}>{emp.nome}</span>
                  <span className="sys-tag">· {nomeCurto(sysById(t.sis)?.nome || "")}</span>
                  <span className={"pill " + (prioCls[t.prio])} style={{ marginLeft: "auto" }}>{t.prio}</span>
                </div>
                <div style={{ fontSize: 13 }}>{t.subj}</div>
                <div style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.prev}</div>
              </div>
            );
          })}
        </div>
        <div className="card">
          {sel && e ? (
            <>
              <div className="card-h"><h3>{sel.subj}</h3></div>
              <div style={{ padding: "0 18px 8px", color: "var(--faint)", fontSize: 12.5 }}>{e.nome} · {sysById(sel.sis)?.nome} · <Pill s={sel.st === "aberto" ? "pend" : "ativo"} label={sel.st} /></div>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ alignSelf: "flex-start", maxWidth: "80%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 12, borderBottomLeftRadius: 4, padding: "11px 14px", fontSize: 13 }}>{sel.prev} Podem me ajudar?</div>
                <div style={{ alignSelf: "flex-end", maxWidth: "80%", background: "var(--accent-soft)", border: "1px solid rgba(224,113,58,0.3)", borderRadius: 12, borderBottomRightRadius: 4, padding: "11px 14px", fontSize: 13 }}>Olá! Já estamos verificando. Pode confirmar em qual navegador ocorre?</div>
              </div>
              <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 14px", color: "var(--faint)", fontSize: 13 }}>Escreva uma resposta… (volta ao cliente via API do sistema)</div>
                <button className="btn">Responder</button>
              </div>
            </>
          ) : <div className="placeholder"><p>Sem tickets.</p></div>}
        </div>
      </div>
    </>
  );
}
