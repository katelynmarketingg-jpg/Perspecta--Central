import { Card, Icon, Pill } from "@/components/ui";
import { getGatilhos, type Gatilho } from "@/lib/gatilhos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const COR: Record<string, string> = {
  ok: "var(--good)", perto: "var(--warn)", passou: "var(--crit)", pago: "var(--accent)", medir: "var(--faint)",
};
const ROTULO: Record<string, string> = {
  ok: "dentro do grátis", perto: "chegando no limite", passou: "virou conta", pago: "já é pago", medir: "a medir",
};

export default async function Consumos() {
  const gatilhos = await getGatilhos();

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          <b>Quando vira conta</b>: o quanto cada serviço já usa do <b>plano grátis</b> e o que passa a custar ao ultrapassar. Cada limite tem <b>fonte + data</b> conferida — nada de número chutado.
        </span>
      </div>

      <Card title="Gatilhos de custo" hint="uso ao vivo × limite do plano grátis">
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {gatilhos.map((g, i) => <Linha key={i} g={g} />)}
        </div>
      </Card>
    </>
  );
}

function Linha({ g }: { g: Gatilho }) {
  const cor = COR[g.estado];
  const pct = g.usadoMb != null && g.limiteMb ? Math.min(100, (g.usadoMb / g.limiteMb) * 100) : g.estado === "pago" ? 100 : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontWeight: 600 }}>{g.servico}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: cor }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: cor }} />{ROTULO[g.estado]}
        </span>
      </div>
      <div className="hbar-track" style={{ height: 8 }}>
        <div className="hbar-fill" style={{ width: pct + "%", background: cor }} />
      </div>
      <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{g.mensagem}</div>
      <div style={{ fontSize: 11, color: "var(--faint)" }}>fonte: {g.fonte} · conferido em {g.conferido}</div>
    </div>
  );
}
