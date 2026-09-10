"use client";

import { useState } from "react";
import { Pill, SourceTag } from "@/components/ui";
import type { Source } from "@/lib/types";

export type SistemaCardData = {
  id: string;
  cor: string; inicial: string; nome: string; url: string;
  statusDot: string; statusPill: string; source: Source;
  contas: number | null; mrrText: string;
  hostLabel: string; repo: string; supabaseRef: string | null;
  ultimoDeploy: string | null; bancoNome: string; bancoCor: string;
  custoText: string; custoCor: string;
  lucroText: string; lucroCor: string;
  bugs: { sev: string; t: string; d: string; st: string }[];
};

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{k}</span><span style={{ textAlign: "right" }}>{children}</span>
    </div>
  );
}

export default function SistemaCard(s: SistemaCardData) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="card sys-card">
      <div className="sys-top">
        <div className="sys-logo" style={{ background: `linear-gradient(135deg,${s.cor},${s.cor}cc)` }}>{s.inicial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sys-name">{s.nome}</div>
          {s.url
            ? <a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="sys-url" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{s.url} ↗</a>
            : <span className="sys-url">—</span>}
        </div>
        <span className="health-dot" style={{ background: s.statusDot }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Pill s={s.statusPill} /><SourceTag source={s.source} />
      </div>

      <div className="sys-stats" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="sys-stat"><div className="n num">{s.contas == null ? "—" : s.contas}</div><div className="l">Empresas</div></div>
        <div className="sys-stat"><div className="n num">{s.mrrText}</div><div className="l">Receita / mês</div></div>
      </div>

      <button type="button" onClick={() => setAberto((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", color: "var(--muted)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
        {aberto ? "Ocultar detalhes" : "Detalhes"}
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, color: "var(--muted)" }}>
          {/* Financeiro do sistema, bem visível */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12, marginBottom: 4 }}>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Receita/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.mrrText}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Custo/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: s.custoCor }}>{s.custoText}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Lucro/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: s.lucroCor }}>{s.lucroText}</div></div>
          </div>

          <a href={`/acessos?sistema=${s.id}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 13, fontWeight: 600, textDecoration: "none", marginBottom: 4 }}>
            <span>Ver acessos & logins {s.contas != null ? `(${s.contas})` : ""}</span>
            <span style={{ color: s.cor }}>→</span>
          </a>

          <Linha k="Hospedagem"><b style={{ color: "var(--text)" }}>{s.hostLabel}</b></Linha>
          <Linha k="Repositório"><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.repo || "—"}</span></Linha>
          <Linha k="Supabase"><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.supabaseRef || "—"}</span></Linha>
          <Linha k="Último deploy">{s.ultimoDeploy || "sem dados"}</Linha>
          <Linha k="Banco de dados"><span style={{ color: s.bancoCor, fontWeight: 600 }}>{s.bancoNome}</span></Linha>
          <Linha k="Custo infra / mês"><span className="num" style={{ fontWeight: 650, color: s.custoCor }}>{s.custoText}</span></Linha>

          {s.bugs.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
              {s.bugs.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flex: "none", background: b.sev === "alta" ? "var(--crit)" : b.sev === "media" ? "var(--warn)" : "var(--info)" }} />
                  <div><div style={{ color: "var(--text)", fontWeight: 600 }}>{b.t}</div><div style={{ color: "var(--faint)" }}>{b.d} · {b.st}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
