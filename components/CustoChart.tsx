import { BRL } from "@/lib/format";

// Gráfico de barras pareadas (hoje × previsto) por serviço — dado real,
// vindo direto de getResumoCusto(). Sem eixo duplo: os dois valores são
// custo em R$, cabem na mesma escala.
export function CustoChart({ itens }: { itens: { servico: string; hoje: number; previsto: number }[] }) {
  const max = Math.max(...itens.map((i) => Math.max(i.hoje, i.previsto)), 1);
  const alturaPct = (v: number) => Math.max((v / max) * 100, v > 0 ? 4 : 2);

  return (
    <div>
      <div style={{ display: "flex", gap: 18, fontSize: 11.5, color: "var(--muted)", marginBottom: 4 }}>
        <span><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--panel-3)", display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />Hoje</span>
        <span><span style={{ width: 9, height: 9, borderRadius: 2, background: "var(--accent)", display: "inline-block", marginRight: 6, verticalAlign: "middle" }} />Previsto</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 150, padding: "20px 6px 0", borderBottom: "1px solid var(--border)" }}>
        {itens.map((it, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: "100%", width: "100%", justifyContent: "center" }}>
              <div style={{ position: "relative", width: 18, borderRadius: "4px 4px 0 0", minHeight: 2, background: "var(--panel-3)", height: alturaPct(it.hoje) + "%" }}>
                <span className="num" style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: it.hoje > 0 ? "var(--text)" : "var(--good)", whiteSpace: "nowrap" }}>
                  {it.hoje > 0 ? BRL(it.hoje) : "grátis"}
                </span>
              </div>
              <div style={{ position: "relative", width: 18, borderRadius: "4px 4px 0 0", minHeight: 2, background: "var(--accent)", height: alturaPct(it.previsto) + "%" }}>
                <span className="num" style={{ position: "absolute", top: -16, left: "50%", transform: "translateX(-50%)", fontSize: 9.5, color: it.previsto > 0 ? "var(--text)" : "var(--good)", whiteSpace: "nowrap" }}>
                  {it.previsto > 0 ? BRL(it.previsto) : "grátis"}
                </span>
              </div>
            </div>
            <span style={{ fontSize: 10.5, color: "var(--faint)", textAlign: "center", lineHeight: 1.25, padding: "0 2px 2px" }}>{it.servico}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
