"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";

// Cada sistema tem um custo real por GB (do provedor onde roda):
// Supabase ~US$0,125/GB, Render disco ~US$0,25/GB, Firebase ~US$5/GB.
type Sis = { id: string; nome: string; cor: string; gbBrl: number; loginBrl: number; fixoBrl?: number };
type Cupom = { id: string; codigo: string; tipo: "valor" | "percent"; valor: number };

const BRL = (n: number) => (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const markup = (preco: number, custo: number) => (custo > 0 ? ((preco - custo) / custo) * 100 : null);
const fmtMk = (m: number | null) => (m == null ? "—" : `${m.toFixed(0)}%`);
function descontar(preco: number, c?: Cupom | null): number {
  if (!c) return preco;
  const p = c.tipo === "percent" ? preco * (1 - c.valor / 100) : preco - c.valor;
  return Math.max(0, Math.round(p * 100) / 100);
}

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

export default function SimuladorPlanos({ sistemas, cupons = [] }: { sistemas: Sis[]; cupons?: Cupom[] }) {
  const router = useRouter();
  const [sistemaId, setSistemaId] = useState(sistemas[0]?.id || "");
  const [nome, setNome] = useState("");
  const [logins, setLogins] = useState(1);
  const [gb, setGb] = useState(10);
  const [produtos, setProdutos] = useState(0);
  const [preco, setPreco] = useState(0);
  const [custoExtra, setCustoExtra] = useState(0);
  const [cupomId, setCupomId] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const sis = sistemas.find((s) => s.id === sistemaId) || sistemas[0];
  const cor = sis?.cor || "var(--accent)";
  const cupom = cupons.find((c) => c.id === cupomId) || null;
  const precoFinal = descontar(preco, cupom);

  // Custo dos recursos do plano no sistema escolhido (por GB e por login).
  const custoRecursos = useMemo(() => (sis ? gb * sis.gbBrl + logins * sis.loginBrl : 0), [sis, gb, logins]);
  const fixoRateado = sis?.fixoBrl || 0;           // custos fixos (ex.: Claude) rateados por empresa
  const custoHoje = custoExtra + fixoRateado;       // hoje: fixos rateados (infra grátis)
  const custoPagando = custoHoje + custoRecursos;   // + por uso quando passar do grátis

  async function salvar() {
    setMsg("");
    if (!nome.trim()) { setMsg("Dê um nome ao plano."); return; }
    if (precoFinal <= 0 || !sis) { setMsg("Informe um preço maior que zero."); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/planos", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId: sis.id, nome, logins, gb, produtos: produtos || null, preco: precoFinal }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Não foi possível salvar."); setSaving(false); return; }
      setMsg(`Plano "${nome}" salvo em ${sis.nome}.`);
      setNome("");
      router.refresh();
    } catch { setMsg("Falha de conexão."); }
    setSaving(false);
  }

  return (
    <>
      <Card title="Simulador de plano" hint="preencha e o cálculo aparece na hora">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <div><label style={lbl}>Sistema</label>
            <select style={inp} value={sistemaId} onChange={(e) => setSistemaId(e.target.value)}>
              {sistemas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Nome do plano</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Essencial" /></div>
          <div><label style={lbl}>Nº de logins</label><input style={inp} type="number" min={0} value={logins} onChange={(e) => setLogins(Math.max(0, Number(e.target.value) || 0))} /></div>
          <div><label style={lbl}>Armazenamento (GB)</label><input style={inp} type="number" min={0} step={1} value={gb} onChange={(e) => setGb(Math.max(0, Number(e.target.value) || 0))} /></div>
          <div><label style={lbl}>Preço de venda (R$/mês)</label><input style={{ ...inp, borderColor: cor }} type="number" min={0} value={preco} onChange={(e) => setPreco(Math.max(0, Number(e.target.value) || 0))} placeholder="0" /></div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, alignItems: "end" }}>
          <div><label style={lbl}>Produtos (limite, opcional)</label><input style={inp} type="number" min={0} value={produtos} onChange={(e) => setProdutos(Math.max(0, Number(e.target.value) || 0))} placeholder="ex.: 500 (Commerce)" /></div>
          <div><label style={lbl}>Custo extra fixo (R$, opcional)</label><input style={inp} type="number" min={0} value={custoExtra} onChange={(e) => setCustoExtra(Math.max(0, Number(e.target.value) || 0))} /></div>
          {cupons.length > 0 && (
            <div><label style={lbl}>Cupom</label>
              <select style={inp} value={cupomId} onChange={(e) => setCupomId(e.target.value)}>
                <option value="">Sem cupom</option>
                {cupons.map((c) => <option key={c.id} value={c.id}>{c.codigo} ({c.tipo === "percent" ? `−${c.valor}%` : `−${BRL(c.valor)}`})</option>)}
              </select>
            </div>
          )}
        </div>

        <div style={{ marginTop: 14, marginBottom: 6, fontSize: 12.5, color: "var(--muted)" }}>
          {sis && <>No <b style={{ color: "var(--text)" }}>{sis.nome}</b>, <b>{gb} GB</b> custam <b style={{ color: "var(--text)" }}>{BRL(gb * sis.gbBrl)}/mês</b> quando passar do grátis. </>}
          Vendendo por {cupom && precoFinal !== preco
            ? <><s style={{ color: "var(--faint)" }}>{BRL(preco)}</s> <b style={{ color: "var(--accent)" }}>{BRL(precoFinal)}</b></>
            : <b style={{ color: "var(--text)" }}>{BRL(precoFinal)}</b>}/mês:
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <Cenario titulo="Hoje (infra grátis)" custo={custoHoje} preco={precoFinal} destaque={false} />
          <Cenario titulo="Quando começar a pagar" custo={custoPagando} preco={precoFinal} destaque />
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>
          {fixoRateado > 0 && <>Inclui <b>{BRL(fixoRateado)}/empresa</b> de custos fixos rateados (ex.: Claude). </>}
          Custo por GB real do provedor de cada sistema (Supabase, Render ou Firebase). <b>Markup</b> = lucro sobre o custo. Cálculo automático.
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <button type="button" onClick={salvar} disabled={saving || precoFinal <= 0}
            style={{ background: precoFinal > 0 ? cor : "var(--panel-2)", color: precoFinal > 0 ? "#fff" : "var(--faint)", border: "none", borderRadius: 8, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: precoFinal > 0 ? "pointer" : "not-allowed" }}>
            {saving ? "Salvando…" : "Salvar plano"}
          </button>
          {msg && <span style={{ fontSize: 13, color: msg.includes("salvo") ? "var(--good)" : "var(--crit)" }}>{msg}</span>}
        </div>
      </Card>
    </>
  );
}

function Cenario({ titulo, custo, preco, destaque }: { titulo: string; custo: number; preco: number; destaque: boolean }) {
  const lucro = preco - custo;
  const mk = markup(preco, custo);
  const cor = lucro > 0 ? "var(--good)" : lucro < 0 ? "var(--crit)" : "var(--muted)";
  return (
    <div style={{ background: "var(--panel-2)", border: `1px solid ${destaque ? "var(--accent)" : "var(--border)"}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: destaque ? "var(--accent)" : "var(--text)", marginBottom: 10 }}>{titulo}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Custo</div><div className="num" style={{ fontSize: 17, fontWeight: 700 }}>{BRL(custo)}</div></div>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Lucro</div><div className="num" style={{ fontSize: 17, fontWeight: 700, color: cor }}>{BRL(lucro)}</div></div>
        <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Markup</div><div className="num" style={{ fontSize: 17, fontWeight: 700, color: cor }}>{fmtMk(mk)}</div></div>
      </div>
    </div>
  );
}
