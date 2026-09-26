"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { linkWhatsApp } from "@/lib/format";

// Ações de cobrança de um cliente: copiar o link de pagamento, mandar no
// WhatsApp/e-mail com a mensagem pronta, ou dar baixa manual quando ele pagou
// por fora (Pix direto, transferência). O link é o MESMO do convite — o
// cliente cadastra o cartão lá e a assinatura recorrente começa sozinha.
export default function CobrancaAcoes({ id, token, empresa, sistema, whatsapp, email, status }: {
  id: string; token: string; empresa: string; sistema: string;
  whatsapp: string | null; email: string;
  status: "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";
}) {
  const router = useRouter();
  const [copiado, setCopiado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  if (status !== "trial" && status !== "aguardando_pagamento") return <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span>;

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/pagamento/${token}`;
  const texto = status === "aguardando_pagamento"
    ? `Olá, ${empresa}! Seu teste grátis do ${sistema} acabou. Para continuar usando sem interrupção, cadastre a forma de pagamento por este link: ${url}`
    : `Olá, ${empresa}! Para já deixar o ${sistema} garantido depois do teste grátis, cadastre a forma de pagamento por este link: ${url}`;
  const zap = linkWhatsApp(whatsapp, texto);
  const mail = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(`Pagamento — ${sistema}`)}&body=${encodeURIComponent(texto)}`;

  function copiar() {
    navigator.clipboard?.writeText(url).then(() => { setCopiado(true); setTimeout(() => setCopiado(false), 2000); });
  }

  async function marcarPago() {
    if (!confirm(`Registrar que "${empresa}" já pagou por fora (Pix, transferência…)? O cliente passa para "pagando".`)) return;
    setBusy(true); setErro("");
    try {
      const r = await fetch("/api/convites", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, acao: "marcar_pago" }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro(j.error || "Não foi possível registrar.");
      else router.refresh();
    } catch { setErro("Falha de conexão."); }
    setBusy(false);
  }

  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
      <button type="button" className="act-btn" onClick={copiar}>{copiado ? "Copiado!" : "Copiar link"}</button>
      {zap && <a className="act-btn good" href={zap} target="_blank" rel="noreferrer">WhatsApp</a>}
      <a className="act-btn" href={mail}>E-mail</a>
      <button type="button" className="act-btn" disabled={busy} onClick={marcarPago} title="O cliente pagou por fora — dar baixa manual">{busy ? "Salvando…" : "Marcar pago"}</button>
      {erro && <span style={{ color: "var(--crit)", fontSize: 11.5 }}>{erro}</span>}
    </div>
  );
}
