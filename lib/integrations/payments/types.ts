// Abstração de pagamento: você escolhe em Configurações qual provedor está
// ativo (InfinitePay, Mercado Pago ou Asaas) — trocar não mexe no fluxo de
// primeiro acesso / teste grátis / cobrança, só troca quem processa o cartão.

export type ProviderId = "mercadopago" | "asaas" | "infinitepay";

export type DadosCartao = {
  numero: string; nome: string; validade: string /* MM/AA */; cvv: string;
  cpfCnpj?: string;
};

export type CriarAssinaturaInput = {
  nomeCliente: string;
  email: string;
  valor: number; // BRL
  externalRef: string; // referência nossa (id do convite)
  // Mercado Pago: token JÁ tokenizado pelo SDK.js no navegador (nunca cartão cru).
  mpCardToken?: string;
  // Asaas: aceita os dados do cartão direto (servidor deles é PCI, sem tokenização client-side).
  cartao?: DadosCartao;
  // Usado pelo InfinitePay pra montar a descrição do link.
  nomePlano?: string;
};

export type ResultadoAssinatura = {
  ok: boolean;
  erro?: string;
  simulado?: boolean; // true = sem chave configurada, nada real aconteceu
  externalId?: string; // id da assinatura/cobrança no provedor
  checkoutUrl?: string; // quando o provedor exige redirecionar (InfinitePay)
};

export interface PaymentProvider {
  readonly id: ProviderId;
  readonly nome: string;
  configured(): boolean;
  criarAssinatura(input: CriarAssinaturaInput): Promise<ResultadoAssinatura>;
}
