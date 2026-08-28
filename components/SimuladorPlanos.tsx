"use client";

import { useMemo, useState } from "react";
import { Card, Icon } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Linha = {
  id: number; sistema: string; cor: string; nome: string;
  logins: number; gb: number; custo: number; preco: number;
};

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

export default function SimuladorPlanos({ sistemas }: { sistemas: Sis[] }) {
  const [sistema, setSistema] = useState(sistemas[0]?.nome || "");
  const [nome, setNome] = useState("");
  const [logins, setLogins] = useState(1);
  const [gb, setGb] = useState(1);
  const [preco, setPreco] = useState(0);
  // Taxas de custo (editáveis) — rateio de infra por conta. Começam em 0 porque
  // hoje a infra é quase toda gratuita; ajuste com seu custo real se quiser.
  const [custoBase, setCustoBase] = useState(0);
  const [custoGb, setCustoGb] = useState(0);
  const [custoLogin, setCustoLogin] = useState(0);
  const [ajustar, setAjustar] = useState(false);
  const [lista, setLista] = useState<Linha[]>([]);

  const custo = useMemo(() => custoBase + gb * custoGb + logins * custoLogin, [custoBase, gb, custoGb, logins, custoLogin]);
  const lucro = preco - custo;
  const margem = preco > 0 ? lucro / preco : 0;
  const corLucro = lucro > 0 ? "var(--good)" : lucro < 0 ? "var(--crit)" : "var(--muted)";
  const cor = sistemas.find((s) => s.nome === sistema)?.cor || "var(--accent)";

  function adicionar() {
    if (preco <= 0) return;
    setLista((l) => [...l, { id: Date.now(), sistema, cor, nome: nome || "Plano", logins, gb, custo, preco }]);
    setNome("");
  }

  return (
    <>
      <Card title="Simulador de plano" hint="custo → preço → lucro e margem, na hora">
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
          {ajustar ? "▾ ocultar custos base" : "▸ ajustar custos base (rateio de infra)"}
        </button>
        {ajustar && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginTop: 8 }}>
            <div><label style={lbl}>Custo base / conta (R$)</label><input style={inp} type="number" min={0} step={0.5} value={custoBase} onChange={(e) => setCustoBase(Math.max(0, Number(e.target.value)))} /></div>
            <div><label style={lbl}>Custo por GB (R$)</label><input style={inp} type="number" min={0} step={0.1} value={custoGb} onChange={(e) => setCustoGb(Math.max(0, Number(e.target.value)))} /></div>
            <div><label style={lbl}>Custo por login (R$)</label><input style={inp} type="number" min={0} step={0.5} value={custoLogin} onChange={(e) => setCustoLogin(Math.max(0, Number(e.target.value)))} /></div>
          </div>
        )}

        {/* Resultado */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 12, marginTop: 16 }}>
          <Resultado k="Custo estimado" v={BRL(custo)} />
          <Resultado k="Preço de venda" v={BRL(preco)} />
          <Resultado k="Lucro / mês" v={BRL(lucro)} cor={corLucro} />
          <Resultado k="Margem" v={(margem * 100).toFixed(0) + "%"} cor={corLucro} />
        </div>
        <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--faint)" }}>
          O custo é uma <b>suposição sua</b> (taxas em "ajustar custos base"), não uma medição. Hoje a infra é quase toda gratuita, então começa em R$ 0.
        </div>

        <button type="button" onClick={adicionar} disabled={preco <= 0}
          style={{ marginTop: 14, background: preco > 0 ? cor : "var(--panel-2)", color: preco > 0 ? "#fff" : "var(--faint)", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: preco > 0 ? "pointer" : "not-allowed" }}>
          + Adicionar à comparação
        </button>
      </Card>

      {lista.length > 0 && (
        <Card title="Comparação de planos" hint={`${lista.length} plano(s) simulado(s)`}>
          <div className="tablewrap">
            <table>
              <thead><tr><th>Sistema</th><th>Plano</th><th className="r">Logins</th><th className="r">GB</th><th className="r">Custo</th><th className="r">Preço</th><th className="r">Lucro</th><th className="r">Margem</th><th></th></tr></thead>
              <tbody>
                {lista.map((l) => {
                  const luc = l.preco - l.custo; const mg = l.preco > 0 ? luc / l.preco : 0;
                  const c = luc >= 0 ? "var(--good)" : "var(--crit)";
                  return (
                    <tr key={l.id}>
                      <td><span className="sys-tag"><span className="sd" style={{ background: l.cor }} />{l.sistema}</span></td>
                      <td>{l.nome}</td>
                      <td className="r num">{l.logins}</td>
                      <td className="r num">{l.gb}</td>
                      <td className="r num">{BRL(l.custo)}</td>
                      <td className="r num">{BRL(l.preco)}</td>
                      <td className="r num" style={{ color: c, fontWeight: 650 }}>{BRL(luc)}</td>
                      <td className="r num" style={{ color: c, fontWeight: 650 }}>{(mg * 100).toFixed(0)}%</td>
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

function Resultado({ k, v, cor }: { k: string; v: string; cor?: string }) {
  return (
    <div style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 550 }}>{k}</div>
      <div className="num" style={{ fontSize: 20, fontWeight: 700, color: cor || "var(--text)", marginTop: 2 }}>{v}</div>
    </div>
  );
}
