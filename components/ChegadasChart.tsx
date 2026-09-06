// Barras simples (um valor por mês) — mesmo padrão do CustoChart, mas com
// uma série só. Só entra aqui quem tem data de cadastro real; sem eixo duplo,
// sem cor inventada (uma cor só, magnitude).
export function ChegadasChart({ meses }: { meses: { rotulo: string; qtd: number }[] }) {
  const max = Math.max(...meses.map((m) => m.qtd), 1);
  const alturaPct = (v: number) => Math.max((v / max) * 100, v > 0 ? 4 : 2);

  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140, padding: "22px 6px 0", borderBottom: "1px solid var(--border)" }}>
      {meses.map((m, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%", justifyContent: "flex-end", minWidth: 0 }}>
          <div style={{ position: "relative", width: 26, borderRadius: "4px 4px 0 0", minHeight: 2, background: "var(--accent)", height: alturaPct(m.qtd) + "%" }}>
            <span className="num" style={{ position: "absolute", top: -18, left: "50%", transform: "translateX(-50%)", fontSize: 11, fontWeight: 650, color: "var(--text)", whiteSpace: "nowrap" }}>
              {m.qtd}
            </span>
          </div>
          <span style={{ fontSize: 10.5, color: "var(--faint)", textAlign: "center" }}>{m.rotulo}</span>
        </div>
      ))}
    </div>
  );
}
