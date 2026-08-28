"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };

const ta: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "12px 14px", color: "var(--text)", fontSize: 13.5, width: "100%", minHeight: 220,
  fontFamily: "inherit", lineHeight: 1.55, resize: "vertical",
};

export default function TermosUso({ sistemas, termos }: { sistemas: Sis[]; termos: Record<string, { texto: string; atualizadoEm: string | null }> }) {
  const [sel, setSel] = useState(sistemas[0]?.id || "");
  const [texto, setTexto] = useState(termos[sel]?.texto || "");
  const [rascunhos, setRascunhos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  function trocar(id: string) {
    setSel(id);
    setTexto(rascunhos[id] ?? termos[id]?.texto ?? "");
    setOk(""); setErr("");
  }
  function editar(v: string) {
    setTexto(v);
    setRascunhos((r) => ({ ...r, [sel]: v }));
  }

  async function salvar() {
    setErr(""); setOk(""); setLoading(true);
    try {
      const r = await fetch("/api/termos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId: sel, texto }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível salvar."); setLoading(false); return; }
      setOk("Termo salvo. Já vale para os próximos convites de primeiro acesso.");
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  const s = sistemas.find((x) => x.id === sel);
  const atualizadoEm = termos[sel]?.atualizadoEm;

  return (
    <Card title="Editar termo de uso" hint="um texto por sistema — o cliente aceita no primeiro acesso">
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
        {sistemas.map((sy) => (
          <button key={sy.id} type="button" onClick={() => trocar(sy.id)}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 600,
              border: "1px solid " + (sel === sy.id ? sy.cor : "var(--border)"),
              background: sel === sy.id ? `color-mix(in srgb, ${sy.cor} 14%, transparent)` : "var(--panel-2)", color: "var(--text)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: sy.cor }} />
            {sy.nome.replace(/Perspec+ta /, "")}
            {!termos[sy.id]?.texto && <span style={{ color: "var(--faint)", fontWeight: 500 }}>· vazio</span>}
          </button>
        ))}
      </div>

      <textarea style={ta} value={texto} onChange={(e) => editar(e.target.value)}
        placeholder={`Escreva aqui o termo de uso do ${s?.nome || "sistema"}. O cliente vai ver este texto e precisa aceitar antes de começar o teste grátis.`} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 11.5, color: "var(--faint)" }}>
          {atualizadoEm ? `Última alteração: ${new Date(atualizadoEm).toLocaleString("pt-BR")}` : "Ainda não salvo."}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {err && <span style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</span>}
          {ok && <span style={{ color: "var(--good)", fontSize: 12.5 }}>{ok}</span>}
          <button type="button" onClick={salvar} disabled={loading}
            style={{ background: s?.cor || "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 16px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {loading ? "Salvando…" : "Salvar termo"}
          </button>
        </div>
      </div>
    </Card>
  );
}
