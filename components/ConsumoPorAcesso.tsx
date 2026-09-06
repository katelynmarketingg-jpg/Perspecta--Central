"use client";

import { useMemo, useState } from "react";
import { LinhaSerieChart } from "@/components/LinhaSerieChart";

type Sis = { id: string; nome: string; cor: string };
type Registro = { id: string; sistemaId: string; empresaRef: string; metrica: string; valor: number; limite: number | null; plano: string | null; medidoEm: string };

const METRICA_LABEL: Record<string, string> = { storage_gb: "Armazenamento (GB)", logins: "Acessos (logins)" };

export default function ConsumoPorAcesso({ sistemas, registros }: { sistemas: Sis[]; registros: Registro[] }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [historicos, setHistoricos] = useState<Record<string, { rotulo: string; valor: number }[]>>({});
  const [carregando, setCarregando] = useState<string | null>(null);

  const nomeSis = (id: string) => sistemas.find((s) => s.id === id)?.nome || id;
  const corSis = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";

  const grupos = useMemo(() => {
    const m = new Map<string, { sistemaId: string; empresaRef: string; plano: string | null; itens: Registro[] }>();
    for (const r of registros) {
      const key = `${r.sistemaId}::${r.empresaRef}`;
      const g = m.get(key) || { sistemaId: r.sistemaId, empresaRef: r.empresaRef, plano: r.plano, itens: [] };
      g.itens.push(r);
      if (r.plano) g.plano = r.plano;
      m.set(key, g);
    }
    return [...m.values()];
  }, [registros]);

  async function alternar(key: string, r: Registro) {
    if (aberto === key) { setAberto(null); return; }
    setAberto(key);
    if (!historicos[key]) {
      setCarregando(key);
      try {
        const resp = await fetch(`/api/uso-consumo/historico?sistemaId=${encodeURIComponent(r.sistemaId)}&empresaRef=${encodeURIComponent(r.empresaRef)}&metrica=${encodeURIComponent(r.metrica)}`);
        const j = await resp.json();
        const pontos = (j.historico || []).map((h: Registro) => ({
          rotulo: new Date(h.medidoEm).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          valor: h.valor,
        }));
        setHistoricos((prev) => ({ ...prev, [key]: pontos }));
      } catch { /* mantém vazio */ }
      setCarregando(null);
    }
  }

  if (grupos.length === 0) {
    return <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhum acesso reportou uso ainda — aparece aqui assim que um sistema mandar o primeiro evento "uso.medido".</span></div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {grupos.map((g) => (
        <div key={`${g.sistemaId}::${g.empresaRef}`} style={{ border: "1px solid var(--border)", borderRadius: 10, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 650, fontSize: 13.5, textTransform: "capitalize" }}>{g.empresaRef}</span>
            <span className="sys-tag"><span className="sd" style={{ background: corSis(g.sistemaId) }} />{nomeSis(g.sistemaId)}</span>
            {g.plano && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>· plano {g.plano}</span>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {g.itens.map((r) => {
              const key = `${r.sistemaId}::${r.empresaRef}::${r.metrica}`;
              const pct = r.limite ? Math.min(100, Math.round((r.valor / r.limite) * 100)) : null;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => alternar(key, r)}>
                    <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{METRICA_LABEL[r.metrica] || r.metrica}</span>
                    <span style={{ fontSize: 12.5, fontWeight: 650 }}>
                      {r.valor}{r.limite != null ? ` / ${r.limite}` : ""}
                      <span style={{ color: "var(--faint)", fontWeight: 400, marginLeft: 8 }}>{aberto === key ? "▲" : "▼"}</span>
                    </span>
                  </div>
                  {pct != null && (
                    <div className="hbar-track" style={{ height: 6, marginTop: 5 }}>
                      <div className="hbar-fill" style={{ width: pct + "%", background: pct >= 100 ? "var(--crit)" : pct >= 80 ? "var(--warn)" : "var(--good)" }} />
                    </div>
                  )}
                  {aberto === key && (
                    <div style={{ marginTop: 8 }}>
                      {carregando === key ? (
                        <span style={{ fontSize: 12, color: "var(--faint)" }}>Carregando histórico…</span>
                      ) : (historicos[key]?.length || 0) < 2 ? (
                        <span style={{ fontSize: 12, color: "var(--faint)" }}>Ainda só uma medição — o gráfico aparece a partir da segunda.</span>
                      ) : (
                        <LinhaSerieChart pontos={historicos[key]} limite={r.limite} />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
