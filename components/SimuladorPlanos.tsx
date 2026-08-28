"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Cupom = { id: string; codigo: string; tipo: "valor" | "percent"; valor: number };
type Linha = {
  id: number; sistema: string; cor: string; nome: string;
  logins: number; gb: number; preco: number; custoHoje: number; custoPagando: number;
};

function descontar(preco: number, c?: Cupom | null): number {
  if (!c) return preco;
  const p = c.tipo === "percent" ? preco * (1 - c.valor / 100) : preco - c.valor;
  return Math.max(0, Math.round(p * 100) / 100);
}

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const markup = (preco: number, custo: number) => (custo > 0 ? ((preco - custo) / custo) * 100 : null);
const fmtMk = (m: number | null) => (m == null ? "—" : `${m.toFixed(0)}%`);

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

export default function SimuladorPlanos({ sistemas, rateioPagando = 0, cupons = [] }: { sistemas: Sis[]; rateioPagando?: number; cupons?: Cupom[] }) {
  const [sistema, setSistema] = useState(sistemas[0]?.nome || "");
  const [nome, setNome] = useState("");
  const [logins, setLogins] = useState(1);
  const [gb, setGb] = useState(1);
  const [preco, setPreco] = useState(0);
  const [cupomId, setCupomId] = useState("");
  // Custos extras opcionais (rateio manual). Começam em 0.
  const [custoBase, setCustoBase] = useState(0);
  const [custoGb, setCustoGb] = useState(0);
  const [custoLogin, setCustoLogin] = useState(0);
  const [ajustar, setAjustar] = useState(false);
  const [lista, setLista] = useState<Linha[]>([]);

  const custoManual = useMemo(() => custoBase + gb * custoGb + logins * custoLogin, [custoBase, gb, custoGb, logins, custoLogin]);
  const custoHoje = custoManual;                    // infra hoje ~grátis
  const custoPagando = custoManual + rateioPagando; // + rateio dos pacotes pagos
  const cor = sistemas.find((s) => s.nome === sistema)?.cor || "var(--accent)";
  const cupom = cupons.find((c) => c.id === cupomId) || null;
  const precoFinal = descontar(preco, cupom);

  function adicionar() {
    if (precoFinal <= 0) return;
    setLista((l) => [...l, { id: Date.now(), sistema, cor, nome: nome || "Plano", logins, gb, preco: precoFinal, custoHoje, custoPagando }]);
    setNome("");
  }

  return (
    <>
      <Card title="Simulador de plano" hint="custo hoje × quando pagar → lucro e markup">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12 }}>
          <div><label style={lbl}>Sistema</label>
            <select style={inp} value={sistema} onChange={(e) => setSistema(e.target.value)}>
              {sistemas.map((s) => <option key={s.id} value={s.nome}>{s.nome}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Nome do plano</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Essencial" /></div>
          <div><label style={lbl}>Nº de logins</label><input style={inp} type="number" min={0} value={logins} onChange={(e) => setLogins(Math.max(0, Number(e.target.value)))} /></div>
          <div><label style={lbl}>Armazenamento (GB)</label><input style={inp} type="number" min={0} step={0.5} value={gb} onChange={(e) => setGb(Math.max(0, Number(e.target.value)))} /></div>
          <div><label style={lbl}>Preço de venda (R$/mês)</label><input style={{ ...inp, borderColor: cor }} type="number" min={0} value={preco} onChange={(e) => setPreco(Math.max(0, Number(e.target.value)))} placeholder="0,00" /></div>
        </div>

        <button type="button" onClick={() => setAjustar((v) => !v)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: 12.5, cursor: "pointer", marginTop: 10, padding: 0 }}>
          {ajustar ? "▾ ocultar custos extras" : "▸ acrescentar custos extras (opcional)"}
        </button>
        {ajustar && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 8 }}>
            <div><label style={lbl}>Custo fixo / conta (R$)</label><input style={inp} type="number" min={0} step={0.5} value={custoBase} onChange={(e) => setCustoBase(Math.max(0, Number(e.target.value)))} /></div>
            <div><label style={lbl}>Custo por GB (R$)</label><input style={inp} type="number" min={0} step={0.1} value={custoGb} onChange={(e) => setCustoGb(Math.max(0, Number(e.target.value)))} /></div>
            <div><label style={lbl}>Custo por login (R$)</label><input style={inp} type="number" min={0} step={0.5} value={custoLogin} onChange={(e) => setCustoLogin(Math.max(0, Number(e.target.value)))} /></div>
          </div>
        )}

        {cupons.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 550 }}>Cupom:</span>
            <select style={{ ...inp, width: "auto", minWidth: 180 }} value={cupomId} onChange={(e) => setCupomId(e.target.value)}>
              <option value="">Sem cupom</option>
              {cupons.map((c) => <option key={c.id} value={c.id}>{c.codigo} ({c.tipo === "percent" ? `−${c.valor}%` : `−${BRL(c.valor)}`})</option>)}
            </select>
          </div>
        )}

        {/* Preço em destaque */}
        <div style={{ marginTop: 14, marginBottom: 4, fontSize: 12.5, color: "var(--muted)" }}>
          Vendendo por {cupom && precoFinal !== preco
            ? <><s style={{ color: "var(--faint)" }}>{BRL(preco)}</s> <b style={{ color: "var(--accent)" }}>{BRL(precoFinal)}/mês</b> (com {cupom.codigo})</>
            : <b style={{ color: "var(--text)" }}>{BRL(precoFinal)}/mês</b>}, o resultado nos dois cenários:
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
          <Cenario titulo="Hoje (infra grátis)" custo={custoHoje} preco={precoFinal} destaque={false} />
          <Cenario titulo="Quando começar a pagar" custo={custoPagando} preco={precoFinal} destaque rateio={rateioPagando} />
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>
          "Quando começar a pagar" soma o <b>rateio da infra prevista</b> ({BRL(rateioPagando)}/empresa) + custos extras que você adicionar. <b>Markup</b> = lucro sobre o custo (pode passar de 100%).
        </div>

        <button type="button" onClick={adicionar} disabled={precoFinal <= 0}
          style={{ marginTop: 14, background: precoFinal > 0 ? cor : "var(--panel-2)", color: precoFinal > 0 ? "#fff" : "var(--faint)", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: precoFinal > 0 ? "pointer" : "not-allowed" }}>
          + Adicionar à comparação
        </button>
      </Card>

      {lista.length > 0 && (
        <Card title="Comparação de planos" hint={`${lista.length} plano(s) simulado(s)`}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Sistema</th><th>Plano</th><th className="r">Preço</th><th className="r">Lucro hoje</th><th className="r">Lucro pagando</th><th className="r">Markup pagando</th><th></th></tr></thead>
              <tbody>
                {lista.map((l) => {
                  const lucH = l.preco - l.custoHoje; const lucP = l.preco - l.custoPagando;
                  const cH = lucH >= 0 ? "var(--good)" : "var(--crit)"; const cP = lucP >= 0 ? "var(--good)" : "var(--crit)";
                  return (
                    <tr key={l.id}>
                      <td><span className="sys-tag"><span className="sd" style={{ background: l.cor }} />{l.sistema}</span></td>
                      <td>{l.nome}</td>
                      <td className="r num">{BRL(l.preco)}</td>
                      <td className="r num" style={{ color: cH, fontWeight: 650 }}>{BRL(lucH)}</td>
                      <td className="r num" style={{ color: cP, fontWeight: 650 }}>{BRL(lucP)}</td>
                      <td className="r num" style={{ color: cP, fontWeight: 650 }}>{fmtMk(markup(l.preco, l.custoPagando))}</td>
                      <td><button type="button" onClick={() => setLista((x) => x.filter((y) => y.id !== l.id))} style={{ background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 16 }}>×</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}

function Cenario({ titulo, custo, preco, destaque, rateio }: { titulo: string; custo: number; preco: number; destaque: boolean; rateio?: number }) {
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
