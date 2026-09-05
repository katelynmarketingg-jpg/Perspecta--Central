"use client";

import { useMemo, useState } from "react";
import { BRL, initials } from "@/lib/format";

export type Cli = {
  nome: string; email: any; telefone: any; documento: any; valor: any;
  status: any; sistema: string; cor: string;
};

const fmtValor = (v: any) => {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? BRL(n) : String(v);
};

export function ClientesView({ clientes }: { clientes: Cli[] }) {
  const [filtro, setFiltro] = useState<string>("Todos");
  const [busca, setBusca] = useState("");

  // Sistemas presentes (com cor e contagem) para os chips de filtro.
  const sistemas = useMemo(() => {
    const m = new Map<string, { cor: string; n: number }>();
    for (const c of clientes) {
      const cur = m.get(c.sistema) || { cor: c.cor, n: 0 };
      cur.n++; cur.cor = c.cor; m.set(c.sistema, cur);
    }
    return [...m.entries()].map(([nome, v]) => ({ nome, ...v })).sort((a, b) => b.n - a.n);
  }, [clientes]);

  const porSistema = filtro === "Todos" ? clientes : clientes.filter((c) => c.sistema === filtro);
  const buscaN = busca.trim().toLowerCase();
  const lista = buscaN
    ? porSistema.filter((c) => c.nome.toLowerCase().includes(buscaN) || String(c.email ?? "").toLowerCase().includes(buscaN))
    : porSistema;

  const tem = (f: keyof Cli) => lista.some((c) => c[f] != null && c[f] !== "");
  const colTel = tem("telefone"), colDoc = tem("documento"), colValor = tem("valor"), colStatus = tem("status");

  const chip = (nome: string, cor: string | null, n: number) => {
    const ativo = filtro === nome;
    return (
      <button key={nome} type="button" onClick={() => setFiltro(nome)}
        className="selectlike"
        style={{ cursor: "pointer", borderColor: ativo ? "var(--accent)" : "var(--border)", background: ativo ? "var(--accent-soft)" : "var(--panel)", fontWeight: ativo ? 650 : 500 }}>
        {cor ? <span className="sd" style={{ background: cor }} /> : null}
        {nome} <span style={{ color: "var(--faint)", fontFamily: "var(--mono)", fontSize: 12 }}>{n}</span>
      </button>
    );
  };

  return (
    <div className="card">
      <div className="card-h" style={{ flexWrap: "wrap", gap: 10 }}>
        <h3>Todos os clientes</h3>
        <span className="hint">{lista.length} · ao vivo</span>
        <input
          type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "7px 12px", color: "var(--text)", fontSize: 13, minWidth: 200 }}
        />
        <div className="act" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {chip("Todos", null, clientes.length)}
          {sistemas.map((s) => chip(s.nome, s.cor, s.n))}
        </div>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Sistema</th>
              <th>Contato</th>
              {colTel && <th>Telefone</th>}
              {colDoc && <th>Documento</th>}
              {colValor && <th className="r">Valor</th>}
              {colStatus && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {lista.map((c, i) => (
              <tr key={i}>
                <td><div className="co"><div className="ci">{initials(c.nome)}</div><div className="cn">{c.nome}</div></div></td>
                <td><span className="sys-tag"><span className="sd" style={{ background: c.cor }} />{c.sistema}</span></td>
                <td style={{ color: "var(--muted)" }}>{c.email ?? "—"}</td>
                {colTel && <td className="num">{c.telefone ?? "—"}</td>}
                {colDoc && <td className="num">{c.documento ?? "—"}</td>}
                {colValor && <td className="r num">{fmtValor(c.valor)}</td>}
                {colStatus && <td style={{ color: "var(--muted)" }}>{c.status ?? "—"}</td>}
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={7} style={{ color: "var(--muted)" }}>Nenhum cliente neste sistema.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
