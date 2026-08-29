"use client";

import { useState } from "react";
import { BRL } from "@/lib/format";

type Convite = {
  id: string; sistemaId: string; empresaNome: string; email: string; trialDias: number;
  status: "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";
  trialAte: string | null;
};

const inp: React.CSSProperties = { background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 14.5, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 6 };
const soDigitos = (v: string) => v.replace(/\D/g, "");

function Shell({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box",
      background: `radial-gradient(1100px 620px at 50% -10%, color-mix(in srgb, ${cor} 20%, transparent), transparent 60%), var(--bg)`,
    }}>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>P</div>
          <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--muted)", letterSpacing: "0.02em" }}>Perspecta</span>
        </div>
        {children}
      </div>
    </div>
  );
}
const card: React.CSSProperties = { width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: 32, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35)", boxSizing: "border-box" };

export default function PagamentoSelfService({ token, convite, sistema, plano }: {
  token: string;
  convite: Convite;
  sistema: { nome: string; cor: string; url: string } | null;
  plano: { nome: string; valor: number } | null;
}) {
  const nomeSis = sistema?.nome.replace(/Perspec+ta /, "") || "Perspecta";
  const cor = sistema?.cor || "var(--accent)";
  const [cardNome, setCardNome] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardVal, setCardVal] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState<{ simulado: boolean } | null>(null);

  if (convite.status === "pendente") {
    return (
      <Shell cor={cor}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Falta aceitar os termos de uso antes.</div>
          <a href={`/primeiro-acesso/${token}`} style={{ marginTop: 6, display: "inline-block", background: cor, color: "#fff", borderRadius: 9, padding: "11px 20px", fontWeight: 600, textDecoration: "none" }}>Ir para o primeiro acesso</a>
        </div>
      </Shell>
    );
  }
  if (convite.status === "cancelado") {
    return <Shell cor={cor}><div style={{ ...card, textAlign: "center", color: "var(--muted)" }}>Este acesso foi cancelado. Fale com a Perspecta.</div></Shell>;
  }
  if (convite.status === "ativo" && !ok) {
    return (
      <Shell cor={cor}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>Seu pagamento já está confirmado. 🎉</div>
          {sistema && <a href={`https://${sistema.url}`} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "inline-block", background: cor, color: "#fff", borderRadius: 9, padding: "11px 20px", fontWeight: 600, textDecoration: "none" }}>Acessar {nomeSis}</a>}
        </div>
      </Shell>
    );
  }

  const acabou = convite.status === "aguardando_pagamento";

  async function confirmar() {
    setErr("");
    if (soDigitos(cardNum).length < 13 || soDigitos(cardVal).length < 4 || soDigitos(cardCvv).length < 3) {
      setErr("Confira os dados do cartão."); return;
    }
    setLoading(true);
    const cardToken = "sim_" + soDigitos(cardNum).slice(-4);
    try {
      const r = await fetch("/api/convites/pagamento", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, cardToken }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível confirmar."); setLoading(false); return; }
      setOk({ simulado: j.simulado });
    } catch { setErr("Falha de conexão. Tente de novo."); }
    setLoading(false);
  }

  if (ok) {
    return (
      <Shell cor={cor}>
        <div style={{ ...card, alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "color-mix(in srgb, var(--good) 18%, transparent)", display: "grid", placeItems: "center", color: "var(--good)", fontSize: 26 }}>✓</div>
          <div style={{ fontSize: 17, fontWeight: 700 }}>Pagamento confirmado!</div>
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Sua assinatura do {nomeSis} está ativa{plano ? ` — ${BRL(plano.valor)}/mês` : ""}.</div>
          {ok.simulado && <div style={{ fontSize: 11.5, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", borderRadius: 9, padding: "9px 12px" }}>Modo simulado: nenhuma cobrança real foi feita ainda (chave do Mercado Pago não configurada).</div>}
          {sistema && <a href={`https://${sistema.url}`} target="_blank" rel="noreferrer" style={{ width: "100%", background: cor, color: "#fff", borderRadius: 9, padding: "12px 16px", fontWeight: 650, textDecoration: "none", boxSizing: "border-box" }}>Acessar {nomeSis}</a>}
        </div>
      </Shell>
    );
  }

  return (
    <Shell cor={cor}>
      <div style={card}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17 }}>{convite.empresaNome}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{nomeSis}{plano ? ` · plano ${plano.nome} · ${BRL(plano.valor)}/mês` : ""}</div>
        </div>

        <div style={{
          fontSize: 12.5, borderRadius: 9, padding: "10px 12px",
          background: acabou ? "color-mix(in srgb, var(--crit) 12%, transparent)" : "var(--panel-2)",
          border: "1px solid " + (acabou ? "color-mix(in srgb, var(--crit) 35%, transparent)" : "var(--border)"),
          color: acabou ? "var(--crit)" : "var(--muted)",
        }}>
          {acabou
            ? <>Seu <b>teste grátis acabou</b>. Cadastre o pagamento pra continuar usando sem interrupção.</>
            : <>Você ainda está no teste grátis{convite.trialAte ? ` até ${new Date(convite.trialAte).toLocaleDateString("pt-BR")}` : ""}. Pode adiantar e cadastrar o pagamento agora se quiser.</>}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={lbl}>Nome no cartão</label>
          <input style={inp} value={cardNome} onChange={(e) => setCardNome(e.target.value)} placeholder="Como está no cartão" autoComplete="cc-name" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={lbl}>Número do cartão</label>
          <input style={inp} value={cardNum} inputMode="numeric" autoComplete="cc-number"
            onChange={(e) => setCardNum(soDigitos(e.target.value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} placeholder="0000 0000 0000 0000" />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <label style={lbl}>Validade</label>
            <input style={inp} value={cardVal} inputMode="numeric" autoComplete="cc-exp"
              onChange={(e) => { const d = soDigitos(e.target.value).slice(0, 4); setCardVal(d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d); }} placeholder="MM/AA" />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
            <label style={lbl}>CVV</label>
            <input style={inp} value={cardCvv} inputMode="numeric" autoComplete="cc-csc"
              onChange={(e) => setCardCvv(soDigitos(e.target.value).slice(0, 4))} placeholder="123" />
          </div>
        </div>

        <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", gap: 7, alignItems: "flex-start" }}>
          <span>🔒</span>
          <span>Protegido pelo <b>Mercado Pago</b> e tokenizado no seu navegador — o número completo nunca é enviado nem guardado pela Perspecta.</span>
        </div>

        {err && <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div>}

        <button type="button" disabled={loading} onClick={confirmar}
          style={{ background: cor, color: "#fff", border: "none", borderRadius: 9, padding: "12px 16px", fontWeight: 650, fontSize: 14.5, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Confirmando…" : "Confirmar pagamento"}
        </button>
      </div>
    </Shell>
  );
}
