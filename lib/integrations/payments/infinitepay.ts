import type { PaymentProvider, CriarAssinaturaInput, ResultadoAssinatura } from "./types";

// InfinitePay — igual ao provider já usado no Perspecta Commerce: gera um
// link de checkout hospedado (Pix ou cartão) via POST /links. IMPORTANTE:
// a InfinitePay não tem API de assinatura recorrente automática — o link
// serve pra UMA cobrança. Pra virar "recorrente" de verdade, um novo link
// precisa ser gerado a cada ciclo (isso ainda não está automatizado; por
// ora, cada "criar assinatura" aqui gera o link do primeiro pagamento).
// Sem INFINITEPAY_HANDLE, roda simulado.
export function infinitePayConfigured(): boolean {
  return Boolean(process.env.INFINITEPAY_HANDLE);
}

async function criarAssinatura(input: CriarAssinaturaInput): Promise<ResultadoAssinatura> {
  if (!infinitePayConfigured()) {
    return { ok: true, simulado: true, externalId: "mock_" + input.externalRef, checkoutUrl: undefined };
  }
  const handle = (process.env.INFINITEPAY_HANDLE as string).replace(/^@/, "");
  try {
    const res = await fetch("https://api.checkout.infinitepay.io/links", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        handle,
        order_nsu: input.externalRef,
        items: [{ quantity: 1, price: Math.round(input.valor * 100), description: input.nomePlano ? `Assinatura Perspecta — ${input.nomePlano}` : "Assinatura Perspecta" }],
        customer: { name: input.nomeCliente, email: input.email },
        ...(input.webhookBaseUrl ? { webhook_url: `${input.webhookBaseUrl}/api/webhooks/infinitepay` } : {}),
      }),
    });
    if (!res.ok) return { ok: false, erro: `InfinitePay HTTP ${res.status}` };
    const data: any = await res.json().catch(() => ({}));
    if (!data?.url) return { ok: false, erro: "InfinitePay não devolveu o link de pagamento." };
    return { ok: true, externalId: input.externalRef, checkoutUrl: data.url };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "falha ao contatar a InfinitePay" };
  }
}

export const infinitePayProviderCentral: PaymentProvider = {
  id: "infinitepay", nome: "InfinitePay", configured: infinitePayConfigured, criarAssinatura,
};
