"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui";

type Provedor = { id: "mercadopago" | "asaas" | "infinitepay"; nome: string; configurado: boolean };

const ENV_POR_PROVEDOR: Record<string, { env: string; desc: string }> = {
  mercadopago: { env: "MERCADOPAGO_ACCESS_TOKEN + MERCADOPAGO_PUBLIC_KEY", desc: "Cartão tokenizado no navegador (SDK.js)" },
  asaas: { env: "ASAAS_API_KEY (+ ASAAS_ENV=production quando sair do sandbox)", desc: "Cartão + Pix/boleto, processado direto no servidor deles" },
  infinitepay: { env: "INFINITEPAY_HANDLE", desc: "Link de checkout hospedado (Pix ou cartão) — não é recorrência automática ainda" },
};

export default function SeletorPagamento({ ativo, provedores }: { ativo: string; provedores: Provedor[] }) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState(ativo);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function salvar(id: string) {
    setSelecionado(id); setLoading(true); setMsg("");
    try {
      const r = await fetch("/api/config/pagamento", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider: id }) });
      if (!r.ok) { const j = await r.json().catch(() => ({})); setMsg(j.error || "Não foi possível salvar."); setLoading(false); return; }
      setMsg("Provedor de pagamento atualizado.");
      router.refresh();
    } catch { setMsg("Falha de conexão."); }
    setLoading(false);
  }

  return (
    <div className="tablewrap">
      <table>
        <thead><tr><th></th><th>Provedor</th><th>Como cobra</th><th>Variáveis</th><th>Status</th></tr></thead>
        <tbody>
          {provedores.map((p) => (
            <tr key={p.id}>
              <td>
                <input type="radio" name="provedor" checked={selecionado === p.id} disabled={loading} onChange={() => salvar(p.id)} style={{ width: 16, height: 16, cursor: "pointer" }} />
              </td>
              <td style={{ fontWeight: 600 }}>{p.nome}{selecionado === p.id ? <span style={{ marginLeft: 8 }}><Pill s="ativo" label="ativo agora" /></span> : null}</td>
              <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{ENV_POR_PROVEDOR[p.id]?.desc}</td>
              <td className="num" style={{ fontFamily: "var(--mono)", fontSize: 11.5 }}>{ENV_POR_PROVEDOR[p.id]?.env}</td>
              <td>{p.configurado ? <Pill s="ativo" label="conectado" /> : <Pill s="sem_dados" label="simulado (sem chave)" />}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--muted)" }}>{msg}</div>}
    </div>
  );
}
