"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Pill } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Tipo = "fixa" | "periodica" | "unica" | "parcelada";
type Despesa = {
  id: string; nome: string; tipo: Tipo; valorBrl: number;
  periodicidadeMeses: number | null; parcelasTotal: number | null;
  dataInicio: string; sistemaId: string | null; ativo: boolean;
  situacao: { valorEsteMes: number; status: "cobrando" | "aguardando" | "futura" | "concluida" | "encerrada"; detalhe: string };
};

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const TIPO_LABEL: Record<Tipo, string> = { fixa: "Fixa (todo mês)", periodica: "Periódica", unica: "Única", parcelada: "Parcelada" };
const STATUS_PILL: Record<Despesa["situacao"]["status"], { s: string; label: string }> = {
  cobrando: { s: "ativo", label: "Cobrando este mês" },
  aguardando: { s: "sem_dados", label: "Aguardando" },
  futura: { s: "pend", label: "Ainda não começou" },
  concluida: { s: "canc", label: "Concluída" },
  encerrada: { s: "canc", label: "Encerrada" },
};

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

export default function Despesas({ sistemas, despesas }: { sistemas: Sis[]; despesas: Despesa[] }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Tipo>("fixa");
  const [valor, setValor] = useState(0);
  const [periodicidade, setPeriodicidade] = useState(3);
  const [parcelas, setParcelas] = useState(3);
  const [dataInicio, setDataInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [sistemaId, setSistemaId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const nomeSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.nome || id : "Todos os sistemas / geral");
  const corSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.cor || "var(--accent)" : "var(--muted)");

  function limpar() {
    setNome(""); setTipo("fixa"); setValor(0); setPeriodicidade(3); setParcelas(3);
    setDataInicio(new Date().toISOString().slice(0, 10)); setSistemaId(""); setErr("");
  }

  async function salvar() {
    setErr("");
    if (!nome.trim() || valor <= 0) { setErr("Preencha o nome e um valor maior que zero."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/despesas", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, tipo, valorBrl: valor,
          periodicidadeMeses: tipo === "periodica" ? periodicidade : null,
          parcelasTotal: tipo === "parcelada" ? parcelas : null,
          dataInicio, sistemaId: sistemaId || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível salvar."); setLoading(false); return; }
      limpar();
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function alternarAtivo(id: string, ativo: boolean) {
    setBusy(id);
    try {
      const r = await fetch("/api/despesas", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ativo }),
      });
      if (r.ok) router.refresh();
    } catch { /* ignora */ }
    setBusy(null);
  }

  async function remover(id: string) {
    if (!confirm("Remover esta despesa e todo o histórico dela?")) return;
    setBusy(id);
    try {
      const r = await fetch(`/api/despesas?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (r.ok) router.refresh();
    } catch { /* ignora */ }
    setBusy(null);
  }

  const totalEsteMes = despesas.reduce((a, d) => a + d.situacao.valorEsteMes, 0);

  return (
    <Card title="Despesas" hint={`total previsto este mês: ${BRL(totalEsteMes)}`}>
      <div style={{ display: "grid", gridTemplateColumns: tipo === "fixa" || tipo === "unica" ? "2fr 1.3fr 1fr 1fr 1.3fr auto" : "2fr 1.3fr 1fr 1fr 1fr 1.3fr auto", gap: 10, alignItems: "end" }}>
        <div><label style={lbl}>Nome da despesa</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Notebook novo, ferramenta, contador…" /></div>
        <div><label style={lbl}>Tipo</label>
          <select style={inp} value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)}>
            {(Object.keys(TIPO_LABEL) as Tipo[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Valor {tipo === "parcelada" ? "da parcela" : ""} (R$)</label><input style={inp} type="number" min={0} step={1} value={valor} onChange={(e) => setValor(Math.max(0, Number(e.target.value)))} /></div>
        {tipo === "periodica" && (
          <div><label style={lbl}>A cada quantos meses</label><input style={inp} type="number" min={1} step={1} value={periodicidade} onChange={(e) => setPeriodicidade(Math.max(1, Number(e.target.value)))} /></div>
        )}
        {tipo === "parcelada" && (
          <div><label style={lbl}>Total de parcelas</label><input style={inp} type="number" min={2} step={1} value={parcelas} onChange={(e) => setParcelas(Math.max(2, Number(e.target.value)))} /></div>
        )}
        <div><label style={lbl}>{tipo === "unica" ? "Data" : "Início"}</label><input style={inp} type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} /></div>
        <div><label style={lbl}>Aplica a</label>
          <select style={inp} value={sistemaId} onChange={(e) => setSistemaId(e.target.value)}>
            <option value="">Todos / geral</option>
            {sistemas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
        </div>
        <button type="button" onClick={salvar} disabled={loading}
          style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", height: 40, whiteSpace: "nowrap" }}>
          {loading ? "…" : "+ Adicionar"}
        </button>
      </div>
      {err && <div style={{ color: "var(--crit)", fontSize: 13, marginTop: 8 }}>{err}</div>}

      {despesas.length > 0 && (
        <div className="tablewrap" style={{ marginTop: 14 }}>
          <table>
            <thead><tr><th>Despesa</th><th>Tipo</th><th>Aplica a</th><th className="r">Valor</th><th>Situação</th><th></th></tr></thead>
            <tbody>
              {despesas.map((d) => {
                const st = STATUS_PILL[d.situacao.status];
                return (
                  <tr key={d.id} style={{ opacity: d.ativo ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 600 }}>{d.nome}</td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{TIPO_LABEL[d.tipo]}</td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: corSis(d.sistemaId) }} />{nomeSis(d.sistemaId)}</span></td>
                    <td className="r num" style={{ fontWeight: 650 }}>{BRL(d.valorBrl)}</td>
                    <td>
                      <Pill s={st.s} label={st.label} />
                      <div style={{ color: "var(--faint)", fontSize: 11.5, marginTop: 3 }}>{d.situacao.detalhe}</div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {d.ativo ? (
                        <button type="button" disabled={busy === d.id} onClick={() => alternarAtivo(d.id, false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "4px 9px", marginRight: 6 }}>Encerrar</button>
                      ) : (
                        <button type="button" disabled={busy === d.id} onClick={() => alternarAtivo(d.id, true)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 7, color: "var(--text)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "4px 9px", marginRight: 6 }}>Reativar</button>
                      )}
                      <button type="button" disabled={busy === d.id} onClick={() => remover(d.id)} style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 16 }}>×</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {despesas.length === 0 && <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhuma despesa cadastrada ainda.</span></div>}
    </Card>
  );
}
