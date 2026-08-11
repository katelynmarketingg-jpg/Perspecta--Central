// Integração com o Mercado Pago — cobrança recorrente por cartão TOKENIZADO.
// IMPORTANTE: nunca guardar número de cartão cru; usar apenas o token/ID do MP.
// Enquanto MERCADOPAGO_ACCESS_TOKEN não estiver setado, o Central opera em modo mock
// (nenhuma cobrança real é feita).

export function mercadoPagoConfigured(): boolean {
  return Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN);
}

// Esboço da criação de assinatura recorrente (preapproval). Só executa de verdade
// quando a chave estiver configurada; caso contrário retorna um resultado simulado.
export async function criarAssinaturaRecorrente(params: {
  emailPagador: string;
  valor: number;
  cardTokenId: string; // token gerado no navegador do cliente — o Central nunca vê o cartão
  externalRef: string;
}): Promise<{ ok: boolean; preapprovalId?: string; simulado?: boolean }> {
  if (!mercadoPagoConfigured()) {
    return { ok: true, simulado: true, preapprovalId: "mock_" + params.externalRef };
  }
  try {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    const res = await fetch("https://api.mercadopago.com/preapproval", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        reason: "Assinatura Perspecta",
        external_reference: params.externalRef,
        payer_email: params.emailPagador,
        card_token_id: params.cardTokenId,
        auto_recurring: { frequency: 1, frequency_type: "months", transaction_amount: params.valor, currency_id: "BRL" },
        status: "authorized",
      }),
    });
    const data: any = await res.json();
    return { ok: res.ok, preapprovalId: data?.id };
  } catch {
    return { ok: false };
  }
}
