"use client";
import { useState } from "react";
import { Pill } from "@/components/ui";

type Attempt = { usuario: string; sis: string; resultado: string; motivo?: string; quando: string; ip: string };
type EmpGroup = {
  id: string; nome: string; cor: string; sisNome: string;
  ultima: string; falhas: number; ativos: number;
  attempts: Attempt[];
};

export default function AcessosView({ groups }: { groups: EmpGroup[] }) {
  const [open, setOpen] = useState<string | null>(groups[0]?.id ?? null);

  return (
    <div className="card">
      <div className="card-h"><h3>Empresas</h3><span className="hint">clique para ver usuários e histórico</span></div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Empresa</th><th>Sistema</th><th>Última tentativa</th><th className="r">Falhas recentes</th><th></th></tr></thead>
          <tbody>
            {groups.map((g) => (
              <RowGroup key={g.id} g={g} open={open === g.id} onToggle={() => setOpen(open === g.id ? null : g.id)} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RowGroup({ g, open, onToggle }: { g: EmpGroup; open: boolean; onToggle: () => void }) {
  // agrupar por usuário
  const byUser: Record<string, Attempt[]> = {};
  g.attempts.forEach((a) => { (byUser[a.usuario] ||= []).push(a); });

  return (
    <>
      <tr onClick={onToggle} style={{ cursor: "pointer" }}>
        <td>
          <div className="co">
            <div className="ci">{g.nome.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()}</div>
            <div className="cn">{g.nome}</div>
          </div>
        </td>
        <td><span className="sys-tag"><span className="sd" style={{ background: g.cor }} />{g.sisNome}</span></td>
        <td className="num" style={{ color: "var(--muted)" }}>{g.ultima}</td>
        <td className="r num" style={{ color: g.falhas > 0 ? "var(--crit)" : "var(--muted)", fontWeight: 650 }}>{g.falhas}</td>
        <td className="r">
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}
            style={{ transform: open ? "rotate(180deg)" : "none", color: "var(--faint)" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={5} style={{ background: "var(--panel-2)", padding: "6px 20px 14px" }}>
            {Object.entries(byUser).map(([usuario, atts]) => (
              <div key={usuario} style={{ padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{usuario}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {atts.map((a, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "var(--muted)" }}>
                      <Pill s={a.resultado} />
                      <span className="num" style={{ minWidth: 96 }}>{a.quando}</span>
                      <span style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{a.ip}</span>
                      {a.motivo ? <span style={{ color: "var(--crit)" }}>· {a.motivo}</span> : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </td>
        </tr>
      )}
    </>
  );
}
