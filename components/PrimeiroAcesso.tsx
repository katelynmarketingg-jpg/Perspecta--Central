"use client";

import { useState } from "react";
import { BRL } from "@/lib/format";

type Convite = {
  id: string; sistemaId: string; empresaNome: string; email: string; trialDias: number;
  status: "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";
  trialAte: string | null;
};

const shell: React.CSSProperties = { minHeight: "100vh", background: "var(--bg)", display: "grid", placeItems: "center", padding: 20 };
const card: React.CSSProperties = { width: "100%", maxWidth: 560, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", gap: 16 };

export default function PrimeiroAcesso({ token, convite, sistema, plano, termo }: {
  token: string;
  convite: Convite;
  sistema: { nome: string; cor: string; url: string } | null;
  plano: { nome: string; valor: number } | null;
  termo: string;
}) {
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [resultado, setResultado] = useState<{ trialAte: string; trialDias: number } | null>(null);
  const nomeSis = sistema?.nome.replace(/Perspec+ta /, "") || "Perspecta";
  const cor = sistema?.cor || "var(--accent)";

  async function aceitar() {
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/convites/aceitar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível confirmar."); setLoading(false); return; }
      setResultado({ trialAte: j.trialAte, trialDias: j.trialDias });
    } catch { setErr("Falha de conexão. Tente de novo."); }
    setLoading(false);
  }

  // Convite já usado antes (recarregou a página depois de aceitar, ou o admin reenviou o link).
  if (convite.status !== "pendente" && !resultado) {
    if (convite.status === "cancelado") {
      return <div style={shell}><div style={{ ...card, textAlign: "center", color: "var(--muted)" }}>Este convite foi cancelado. Fale com quem te enviou o link.</div></div>;
    }
    const jaFoi = convite.status === "ativo"
      ? "Sua assinatura já está ativa."
      : `Você já aceitou os termos${convite.trialAte ? ` — teste válido até ${new Date(convite.trialAte).toLocaleDateString("pt-BR")}` : ""}.`;
    return (
      <div style={shell}>
        <div style={{ ...card, textAlign: "center" }}>
          <div style={{ fontSize: 15, fontWeight: 650 }}>{jaFoi}</div>
          {sistema && <a href={`https://${sistema.url}`} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "inline-block", background: cor, color: "#fff", borderRadius: 9, padding: "11px 20px", fontWeight: 600, textDecoration: "none" }}>Acessar {nomeSis}</a>}
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${cor},${cor}cc)`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>{nomeSis[0]}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17 }}>Bem-vindo(a), {convite.empresaNome}</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Primeiro acesso ao {nomeSis}{plano ? ` · plano ${plano.nome}` : ""}</div>
          </div>
        </div>

        {!resultado ? (
          <>
            <div style={{ fontSize: 12.5, color: "var(--muted)", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
              ✨ <b>{convite.trialDias} dias grátis.</b> {plano ? `Depois, ${BRL(plano.valor)}/mês — ` : ""}você só cadastra a forma de pagamento quando o teste acabar.
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 550, marginBottom: 6 }}>Termos de uso — {nomeSis}</div>
              <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid var(--border)", borderRadius: 9, padding: "12px 14px", fontSize: 12.5, lineHeight: 1.6, color: "var(--text)", background: "var(--panel-2)", whiteSpace: "pre-wrap" }}>
                {termo?.trim() || "Nenhum termo de uso foi cadastrado pra este sistema ainda. Fale com a Perspecta antes de continuar."}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, cursor: "pointer" }}>
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ marginTop: 2 }} />
              <span>Li e aceito os termos de uso do {nomeSis}.</span>
            </label>

            {err && <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div>}

            <button type="button" disabled={!aceite || loading} onClick={aceitar}
              style={{ background: cor, color: "#fff", border: "none", borderRadius: 9, padding: "12px 16px", fontWeight: 650, fontSize: 14.5, cursor: aceite ? "pointer" : "not-allowed", opacity: aceite ? 1 : 0.55 }}>
              {loading ? "Confirmando…" : "Aceitar e começar teste grátis"}
            </button>
          </>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "6px 0" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "color-mix(in srgb, var(--good) 18%, transparent)", display: "grid", placeItems: "center", color: "var(--good)", fontSize: 26 }}>✓</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>Teste grátis ativado!</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                Você tem <b>{resultado.trialDias} dias</b>, até <b>{new Date(resultado.trialAte).toLocaleDateString("pt-BR")}</b>.
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--faint)" }}>
              Perto do fim do teste a gente te manda um link pra cadastrar a forma de pagamento e continuar sem parar.
            </div>
            {sistema && (
              <a href={`https://${sistema.url}`} target="_blank" rel="noreferrer" style={{ width: "100%", background: cor, color: "#fff", borderRadius: 9, padding: "12px 16px", fontWeight: 650, textDecoration: "none", boxSizing: "border-box" }}>
                Acessar {nomeSis} agora
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
