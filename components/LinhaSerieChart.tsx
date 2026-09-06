// Gráfico de linha (uma série, uma cor) para o histórico de uma métrica de
// consumo — com uma linha tracejada mostrando o limite do plano quando o
// sistema de origem mandou esse dado. SVG simples, sem lib externa.
export function LinhaSerieChart({ pontos, limite }: { pontos: { rotulo: string; valor: number }[]; limite?: number | null }) {
  if (pontos.length === 0) return null;
  const W = 560, H = 130, padL = 8, padR = 8, padT = 14, padB = 20;
  const max = Math.max(...pontos.map((p) => p.valor), limite || 0, 1) * 1.12;
  const x = (i: number) => padL + (pontos.length === 1 ? 0 : (i / (pontos.length - 1)) * (W - padL - padR));
  const y = (v: number) => H - padB - (v / max) * (H - padT - padB);

  const path = pontos.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
  const passouLimite = limite != null && pontos[pontos.length - 1].valor > limite;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: H, overflow: "visible" }}>
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--border)" strokeWidth={1} />
      {limite != null && (
        <>
          <line x1={padL} y1={y(limite)} x2={W - padR} y2={y(limite)} stroke="var(--faint)" strokeWidth={1} strokeDasharray="4 4" />
          <text x={W - padR} y={y(limite) - 4} textAnchor="end" fontSize={9.5} fill="var(--faint)">limite do plano · {limite}</text>
        </>
      )}
      <path d={path} fill="none" stroke={passouLimite ? "var(--crit)" : "var(--accent)"} strokeWidth={2} />
      {pontos.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.valor)} r={i === pontos.length - 1 ? 4 : 2.5} fill={passouLimite ? "var(--crit)" : "var(--accent)"} />
      ))}
      <text x={x(0)} y={H - 4} fontSize={9.5} fill="var(--faint)" textAnchor="start">{pontos[0].rotulo}</text>
      <text x={x(pontos.length - 1)} y={H - 4} fontSize={9.5} fill="var(--faint)" textAnchor="end">{pontos[pontos.length - 1].rotulo}</text>
      <text x={x(pontos.length - 1)} y={y(pontos[pontos.length - 1].valor) - 8} fontSize={10.5} fontWeight={650} fill="var(--text)" textAnchor="end">{pontos[pontos.length - 1].valor}</text>
    </svg>
  );
}
