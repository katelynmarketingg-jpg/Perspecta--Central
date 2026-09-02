import type { PaymentProvider, CriarAssinaturaInput, ResultadoAssinatura } from "./types";

// Mercado Pago — assinatura recorrente (preapproval). O cartão é tokenizado
// no NAVEGADOR pelo SDK.js (mp.createCardToken) — o número cru nunca chega
// aqui, só o `mpCardToken`. Sem MERCADOPAGO_ACCESS_TOKEN, roda simulado.
export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

async function criarAssinatura(input: CriarAssinaturaInput): Promise<ResultadoAssinatura> {
  if (!mercadoPagoConfigured()) {
    return { ok: true, simulado: true, externalId: "mock_" + input.externalRef };
  }
  if (!input.mpCardToken) {
    return { ok: false, erro: "Cartão não foi tokenizado pelo Mercado Pago no navegador." };
  }
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: `Assinatura Perspecta${input.nomePlano ? ` — ${input.nomePlano}` : ""}`,
        external_reference: input.externalRef,
        payer_email: input.email,
        card_token_id: input.mpCardToken,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: input.valor, currency_id: "BRL" },
        status: "authorized",
      }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erro: data?.message || `Mercado Pago HTTP ${res.status}` };
    return { ok: true, externalId: data?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "falha ao contatar o Mercado Pago" };
  }
}

export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago", nome: "Mercado Pago", configured: mercadoPagoConfigured, criarAssinatura,
};
