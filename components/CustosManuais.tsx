"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Custo = { id: string; nome: string; valorBrl: number; sistemaId: string | null };

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

export default function CustosManuais({ sistemas, custos }: { sistemas: Sis[]; custos: Custo[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [valor, setValor] = useState(0);
  const [sistemaId, setSistemaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const nomeSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.nome || id : "Todos os sistemas");
  const corSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.cor || "var(--accent)" : "var(--muted)");

  async function adicionar() {
    setErr("");
    if (!nome.trim() || valor <= 0) { setErr("Preencha o nome e um valor maior que zero."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/custos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, valorBrl: valor, sistemaId: sistemaId || null }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível salvar."); setLoading(false); return; }
      setNome(""); setValor(0); setSistemaId("");
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function remover(id: string) {
    if (!confirm("Remover este custo?")) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/custos?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (r.ok) router.refresh();
    } catch { /* ignora */ }
    setBusy(null);
  }

  return (
    <Card title="Custos adicionais" hint="o que você paga além da infra — entra no total e no rateio">
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.5fr auto", gap: 10, alignItems: "end" }}>
        <div><label style={lbl}>Nome do custo</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Canva Pro, domínio, e-mail…" /></div>
        <div><label style={lbl}>Valor (R$/mês)</label><input style={inp} type="number" min={0} step={1} value={valor} onChange={(e) => setValor(Math.max(0, Number(e.target.value)))} /></div>
        <div><label style={lbl}>Aplica a</label>
          <select style={inp} value={sistemaId} onChange={(e) => setSistemaId(e.target.value)}>
            <option value="">Todos os sistemas</option>
            {sistemas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <button type="button" onClick={adicionar} disabled={loading}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", height: 40 }}>
          {loading ? "…" : "+ Adicionar"}
        </button>
      </div>
      {err && <div style={{ color: "var(--crit)", fontSize: 13, marginTop: 8 }}>{err}</div>}

      {custos.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Custo</th><th>Aplica a</th><th className="r">Valor/mês</th><th></th></tr></thead>
            <tbody>
              {custos.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.nome}</td>
                  <td><span className="sys-tag"><span className="sd" style={{ background: corSis(c.sistemaId) }} />{nomeSis(c.sistemaId)}</span></td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(c.valorBrl)}</td>
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
