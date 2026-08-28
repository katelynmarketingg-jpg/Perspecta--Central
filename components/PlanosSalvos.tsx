"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Icon } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Plano = { id: string; sistemaId: string; nome: string; logins: number; gb: number; produtos: number | null; preco: number };

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function PlanosSalvos({ planos, sistemas }: { planos: Plano[]; sistemas: Sis[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function remover(id: string) {
    if (!confirm("Remover este plano?")) return;
    setBusy(id);
    try { const r = await fetch(`/api/planos?id=${encodeURIComponent(id)}`, { method: "DELETE" }); if (r.ok) router.refresh(); } catch { /* ignora */ }
    setBusy(null);
  }

  if (planos.length === 0) {
    return (
      <Card title="Seus planos" hint="crie planos no simulador acima">
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum plano criado ainda. Monte um no simulador e clique em <b>Salvar plano</b>.</div>
      </Card>
    );
  }

  const porSistema = sistemas
    .map((s) => ({ s, pls: planos.filter((p) => p.sistemaId === s.id) }))
    .filter((g) => g.pls.length > 0);

  return (
    <>
      {porSistema.map(({ s, pls }) => (
        <div key={s.id}>
          <div className="sec-title" style={{ marginTop: 12 }}>
            <h3 style={{ fontSize: 15, margin: 0 }}><span className="sys-tag"><span className="sd" style={{ background: s.cor }} />{s.nome}</span></h3>
            <span className="c">{pls.length} plano(s)</span>
          </div>
          <div className="plan-grid">
            {pls.map((p) => (
              <div className="card plan-card" key={p.id} style={{ position: "relative" }}>
                <button type="button" disabled={busy === p.id} onClick={() => remover(p.id)}
                  style={{ position: "absolute", top: 10, right: 12, background: "none", border: "none", color: "var(--faint)", cursor: "pointer", fontSize: 18 }}>×</button>
                <div className="plan-head"><div className="pn">{p.nome}</div><div className="ps">{s.nome}</div></div>
                <div className="plan-price"><div className="pv num">{BRL(p.preco)} <small>/mês</small></div></div>
                <div className="plan-lims">
                  <div className="plan-lim"><Icon path='<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/>' size={14} />{p.gb} GB de armazenamento</div>
                  <div className="plan-lim"><Icon path='<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>' size={14} />{p.logins} logins</div>
                  {p.produtos != null && <div className="plan-lim"><Icon path='<path d="M4 6h16M4 12h16M4 18h10"/>' size={14} />{p.produtos.toLocaleString("pt-BR")} produtos</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
