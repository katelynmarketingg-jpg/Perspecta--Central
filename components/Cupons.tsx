"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

type Cupom = { id: string; codigo: string; tipo: "valor" | "percent"; valor: number; descricao: string | null; ativo: boolean };

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };
const fmt = (c: Cupom) => (c.tipo === "percent" ? `−${c.valor}%` : `−${c.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);

export default function Cupons({ cupons }: { cupons: Cupom[] }) {
  const router = useRouter();
  const [codigo, setCodigo] = useState("");
  const [tipo, setTipo] = useState<"valor" | "percent">("valor");
  const [valor, setValor] = useState(0);
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function adicionar() {
    setErr("");
    if (!codigo.trim() || valor <= 0) { setErr("Preencha o código e um valor maior que zero."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/cupons", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, tipo, valor, descricao }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível salvar."); setLoading(false); return; }
      setCodigo(""); setValor(0); setDescricao(""); setTipo("valor");
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function remover(id: string) {
    if (!confirm("Remover este cupom?")) return;
    setBusy(id);
    try { const r = await fetch(`/api/cupons?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (r.ok) router.refresh(); } catch { /* ignora */ }
    setBusy(null);
  }

  return (
    <Card title="Cupons de desconto" hint="crie cupons para aplicar no simulador e no checkout">
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.5fr auto", gap: 10, alignItems: "end" }}>
        <div><label style={lbl}>Código</label><input style={inp} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex.: BLACK100" /></div>
        <div><label style={lbl}>Tipo</label>
          <select style={inp} value={tipo} onChange={(e) => setTipo(e.target.value as any)}>
            <option value="valor">R$ (valor fixo)</option>
            <option value="percent">% (percentual)</option>
          </select>
        </div>
        <div><label style={lbl}>{tipo === "percent" ? "Desconto (%)" : "Desconto (R$)"}</label><input style={inp} type="number" min={0} value={valor} onChange={(e) => setValor(Math.max(0, Number(e.target.value)))} /></div>
        <div><label style={lbl}>Descrição (opcional)</label><input style={inp} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex.: Promo de lançamento" /></div>
        <button type="button" onClick={adicionar} disabled={loading}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", height: 40 }}>
          {loading ? "…" : "+ Criar"}
        </button>
      </div>
      {err && <div style={{ color: "var(--crit)", fontSize: 13, marginTop: 8 }}>{err}</div>}

      {cupons.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Código</th><th>Desconto</th><th>Descrição</th><th></th></tr></thead>
            <tbody>
              {cupons.map((c) => (
                <tr key={c.id}>
                  <td className="num" style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{c.codigo}</td>
                  <td style={{ color: "var(--accent)", fontWeight: 650 }}>{fmt(c)}</td>
                  <td style={{ color: "var(--muted)" }}>{c.descricao || "—"}</td>
                  <td><button type="button" disabled={busy === c.id} onClick={() => remover(c.id)} style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 16 }}>×</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
