"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Plano = { id: string; sis: string; nome: string; valor: number };
type Convite = {
  id: string; token: string; sistemaId: string; planoId: string; empresaNome: string; email: string;
  whatsapp: string | null; trialDias: number; status: "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";
  criadoEm: string; termosAceitosEm: string | null; trialAte: string | null; ativadoEm: string | null;
};

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };
const aBtn: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 7,
  padding: "5px 9px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer",
};

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function diasRestantes(iso: string | null): number | null {
  if (!iso) return null;
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

export default function AcessosConvite({ sistemas, planos, convites }: { sistemas: Sis[]; planos: Plano[]; convites: Convite[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [sis, setSis] = useState(sistemas[0]?.id || "");
  const [plano, setPlano] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [trialDias, setTrialDias] = useState(14);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [linkGerado, setLinkGerado] = useState("");
  const [copiado, setCopiado] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const planosDoSis = useMemo(() => planos.filter((p) => p.sis === sis), [planos, sis]);
  const nomeDe = (id: string) => sistemas.find((s) => s.id === id)?.nome.replace(/Perspec+ta /, "") || id;
  const corDe = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function copiar(texto: string, chave: string) {
    navigator.clipboard?.writeText(texto).then(() => {
      setCopiado(chave);
      setTimeout(() => setCopiado(""), 2000);
    });
  }

  async function gerar() {
    setErr(""); setLinkGerado("");
    if (!sis || !plano || !empresa.trim() || !email.trim()) { setErr("Preencha sistema, plano, empresa e e-mail."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/convites", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId: sis, planoId: plano, empresaNome: empresa, email, whatsapp: whatsapp || null, trialDias }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível gerar."); setLoading(false); return; }
      setLinkGerado(`${origin}/primeiro-acesso/${j.token}`);
      setEmpresa(""); setEmail(""); setWhatsapp(""); setPlano("");
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function cancelar(c: Convite) {
    if (!confirm(`Cancelar o convite de "${c.empresaNome}"?`)) return;
    setBusy(c.id);
    try {
      const r = await fetch(`/api/convites?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
      if (r.ok) router.refresh();
    } catch { /* ignora */ }
    setBusy(null);
  }

  function linkDe(c: Convite): { url: string; label: string } | null {
    if (c.status === "pendente") return { url: `${origin}/primeiro-acesso/${c.token}`, label: "link de 1º acesso" };
    if (c.status === "trial" || c.status === "aguardando_pagamento") return { url: `${origin}/pagamento/${c.token}`, label: "link de pagamento" };
    return null;
  }

  const statusPill: Record<Convite["status"], string> = {
    pendente: "pend", trial: "degradado", aguardando_pagamento: "inad", ativo: "ativo", cancelado: "canc",
  };
  const statusLabel: Record<Convite["status"], string> = {
    pendente: "aguardando 1º acesso", trial: "em teste grátis", aguardando_pagamento: "teste acabou — sem pagamento", ativo: "pagamento ativo", cancelado: "cancelado",
  };

  return (
    <>
      <Card
        title="Gerar acesso — qualquer sistema"
        hint="convite com termo de uso + teste grátis + pagamento self-serviço depois"
        action={
          <button type="button" onClick={() => { setOpen((v) => !v); setErr(""); setLinkGerado(""); }}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {open ? "Fechar" : "+ Gerar convite"}
          </button>
        }
      >
        {open && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 12, padding: "4px 0 14px" }}>
            <div>
              <label style={lbl}>Sistema</label>
              <select style={inp} value={sis} onChange={(e) => { setSis(e.target.value); setPlano(""); }}>
                {sistemas.map((s) => <option key={s.id} value={s.id}>{s.nome.replace(/Perspec+ta /, "")}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Plano</label>
              <select style={inp} value={plano} onChange={(e) => setPlano(e.target.value)}>
                <option value="">Escolha…</option>
                {planosDoSis.map((p) => <option key={p.id} value={p.id}>{p.nome} — {BRL(p.valor)}/mês</option>)}
              </select>
            </div>
            <div><label style={lbl}>Empresa (cliente)</label><input style={inp} value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Advocacia Silva" /></div>
            <div><label style={lbl}>E-mail do cliente</label><input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" /></div>
            <div><label style={lbl}>WhatsApp (opcional)</label><input style={inp} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></div>
            <div><label style={lbl}>Dias de teste grátis</label><input style={inp} type="number" min={1} value={trialDias} onChange={(e) => setTrialDias(Math.max(1, Number(e.target.value)))} /></div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={gerar} disabled={loading}
                style={{ background: corDe(sis), color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>
                {loading ? "Gerando…" : "Gerar link"}
              </button>
            </div>
            {err && <div style={{ gridColumn: "1/-1", color: "var(--crit)", fontSize: 13 }}>{err}</div>}
            {linkGerado && (
              <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--panel-2)", border: "1px solid var(--good)", borderRadius: 9, padding: "10px 12px" }}>
                <span style={{ fontSize: 12.5 }}>Convite gerado — mande este link pro cliente (WhatsApp, e-mail…):</span>
                <code style={{ fontSize: 12, background: "var(--panel)", padding: "3px 7px", borderRadius: 6, wordBreak: "break-all" }}>{linkGerado}</code>
                <button type="button" onClick={() => copiar(linkGerado, "novo")} style={aBtn}>{copiado === "novo" ? "Copiado!" : "Copiar"}</button>
              </div>
            )}
          </div>
        )}

        {convites.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum convite gerado ainda.</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th>Plano</th><th>Status</th><th className="r">Teste</th><th>Link</th><th></th></tr></thead>
              <tbody>
                {convites.map((c) => {
                  const rest = c.status === "trial" ? diasRestantes(c.trialAte) : null;
                  const link = linkDe(c);
                  const planoNome = planos.find((p) => p.id === c.planoId)?.nome || c.planoId;
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.empresaNome}<div style={{ fontSize: 11, color: "var(--faint)", fontWeight: 400 }}>{c.email}</div></td>
                      <td><span className="sys-tag"><span className="sd" style={{ background: corDe(c.sistemaId) }} />{nomeDe(c.sistemaId)}</span></td>
                      <td style={{ fontSize: 12.5 }}>{planoNome}</td>
                      <td><Pill s={statusPill[c.status]} label={statusLabel[c.status]} /></td>
                      <td className="r num">{rest != null ? `${rest}d` : "—"}</td>
                      <td>
                        {link ? (
                          <button type="button" onClick={() => copiar(link.url, c.id)} style={aBtn}>{copiado === c.id ? "Copiado!" : `Copiar ${link.label}`}</button>
                        ) : (
                          <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td>
                        {c.status !== "ativo" && c.status !== "cancelado" && (
                          <button type="button" disabled={busy === c.id} onClick={() => cancelar(c)} style={{ ...aBtn, color: "var(--crit)", borderColor: "var(--crit)" }}>Cancelar</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 10, fontSize: 11.5, color: "var(--faint)" }}>
          Sem envio automático de e-mail/WhatsApp ainda — o link é gerado aqui e você manda pro cliente manualmente. Quando o teste grátis acabar, o convite muda pra "teste acabou — sem pagamento" sozinho; copie o link de pagamento e mande de novo pra ele colocar o cartão.
        </div>
      </Card>
    </>
  );
}
