"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui";

export type LoginRow = {
  sistemaId: string; sistemaNome: string; cor: string;
  empresaRef: string | null; usuarioEmail: string | null;
  ip: string | null; resultado: string; motivo: string | null; quando: string;
};

export function HistoricoLogins({ linhas }: { linhas: LoginRow[] }) {
  const [busca, setBusca] = useState("");
  const [sistema, setSistema] = useState("Todos");
  const [resultado, setResultado] = useState<"todos" | "sucesso" | "falha">("todos");

  const sistemas = useMemo(() => {
    const nomes = new Map<string, string>();
    linhas.forEach((l) => nomes.set(l.sistemaId, l.sistemaNome));
    return [...nomes.entries()];
  }, [linhas]);

  const buscaN = busca.trim().toLowerCase();
  const lista = linhas.filter((l) => {
    if (sistema !== "Todos" && l.sistemaId !== sistema) return false;
    if (resultado !== "todos" && l.resultado !== resultado) return false;
    if (buscaN) {
      const alvo = `${l.usuarioEmail ?? ""} ${l.empresaRef ?? ""}`.toLowerCase();
      if (!alvo.includes(buscaN)) return false;
    }
    return true;
  });

  const inp: React.CSSProperties = {
    background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
    padding: "7px 12px", color: "var(--text)", fontSize: 13,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <input style={{ ...inp, flex: 1, minWidth: 200 }} placeholder="Buscar por e-mail ou empresa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
        <select style={inp} value={sistema} onChange={(e) => setSistema(e.target.value)}>
          <option value="Todos">Todos os sistemas</option>
          {sistemas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
        </select>
        <select style={inp} value={resultado} onChange={(e) => setResultado(e.target.value as any)}>
          <option value="todos">Sucesso e falha</option>
          <option value="sucesso">Só sucesso</option>
          <option value="falha">Só falha</option>
        </select>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Quando</th><th>Sistema</th><th>Empresa</th><th>Usuário</th><th>IP</th><th className="r">Resultado</th></tr></thead>
          <tbody>
            {lista.map((l, i) => (
              <tr key={i}>
                <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{new Date(l.quando).toLocaleString("pt-BR")}</td>
                <td><span className="sys-tag"><span className="sd" style={{ background: l.cor }} />{l.sistemaNome}</span></td>
                <td>{l.empresaRef || "—"}</td>
                <td style={{ color: "var(--muted)" }}>{l.usuarioEmail || "desconhecido"}</td>
                <td className="num" style={{ fontSize: 12.5 }}>{l.ip || "—"}</td>
                <td className="r">
                  {l.resultado === "sucesso"
                    ? <Pill s="ativo" label="sucesso" />
                    : <Pill s="inad" label={l.motivo || "falha"} />}
                </td>
              </tr>
            ))}
            {lista.length === 0 && (
              <tr><td colSpan={6} style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Nenhum login encontrado com esse filtro.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
