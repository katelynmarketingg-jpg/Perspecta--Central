import type { PaymentProvider, CriarAssinaturaInput, ResultadoAssinatura } from "./types";

// Asaas — assinatura recorrente por cartão. Diferente do Mercado Pago, a API
// do Asaas aceita os dados do cartão direto numa chamada servidor-a-servidor
// (o servidor deles é PCI-compliant pra isso) — não exige SDK no navegador.
// Sem ASAAS_API_KEY, roda simulado.
export function asaasConfigured(): boolean {
  return Boolean(process.env.ASAAS_API_KEY);
}

function baseUrl(): string {
  return process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://sandbox.asaas.com/api/v3";
}

async function asaasFetch(path: string, body: any) {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: process.env.ASAAS_API_KEY as string },
    body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function criarAssinatura(input: CriarAssinaturaInput): Promise<ResultadoAssinatura> {
  if (!asaasConfigured()) {
    return { ok: true, simulado: true, externalId: "mock_" + input.externalRef };
  }
  if (!input.cartao) return { ok: false, erro: "Dados do cartão não informados." };
  if (!input.cartao.cpfCnpj) return { ok: false, erro: "Informe o CPF/CNPJ — o Asaas exige pra identificar o pagador." };

  const [mes, anoCurto] = input.cartao.validade.split("/");
  const ano = anoCurto?.length === 2 ? `20${anoCurto}` : anoCurto;

  try {
    // 1) Cliente (idempotente: se já existir pelo e-mail, o Asaas te avisa — aqui a gente
    // sempre tenta criar; se a conta já existir, o erro vem claro em vez de duplicar.)
    const cli = await asaasFetch("/customers", {
      name: input.nomeCliente, email: input.email, cpfCnpj: input.cartao.cpfCnpj.replace(/\D/g, ""),
    });
    let customerId = cli.data?.id;
    if (!cli.ok) {
      // Cliente já existe → busca pelo CPF/CNPJ em vez de falhar.
      const busca = await fetch(`${baseUrl()}/customers?cpfCnpj=${encodeURIComponent(input.cartao.cpfCnpj.replace(/\D/g, ""))}`, {
        headers: { access_token: process.env.ASAAS_API_KEY as string },
      }).then((r) => r.json()).catch(() => null);
      customerId = busca?.data?.[0]?.id;
      if (!customerId) return { ok: false, erro: cli.data?.errors?.[0]?.description || `Asaas: não foi possível criar/achar o cliente (HTTP ${cli.status}).` };
    }

    // 2) Assinatura mensal com cobrança no cartão.
    const sub = await asaasFetch("/subscriptions", {
      customer: customerId, billingType: "CREDIT_CARD", cycle: "MONTHLY",
      value: input.valor, nextDueDate: new Date().toISOString().slice(0, 10),
      description: input.nomePlano ? `Assinatura Perspecta — ${input.nomePlano}` : "Assinatura Perspecta",
      externalReference: input.externalRef,
      creditCard: {
        holderName: input.cartao.nome, number: input.cartao.numero.replace(/\s/g, ""),
        expiryMonth: mes, expiryYear: ano, ccv: input.cartao.cvv,
      },
      creditCardHolderInfo: {
        name: input.cartao.nome, email: input.email, cpfCnpj: input.cartao.cpfCnpj.replace(/\D/g, ""),
      },
    });
    if (!sub.ok) return { ok: false, erro: sub.data?.errors?.[0]?.description || `Asaas: cobrança recusada (HTTP ${sub.status}).` };
    return { ok: true, externalId: sub.data?.id };
  } catch (e: any) {
    return { ok: false, erro: e?.message || "falha ao contatar o Asaas" };
  }
}

export const asaasProvider: PaymentProvider = {
  id: "asaas", nome: "Asaas", configured: asaasConfigured, criarAssinatura,
};
