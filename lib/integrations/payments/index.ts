import type { PaymentProvider, ProviderId } from "./types";
import { mercadoPagoProvider } from "./mercadopago";
import { asaasProvider } from "./asaas";
import { infinitePayProviderCentral } from "./infinitepay";
import { getConfig, setConfig } from "../../config-central";

export * from "./types";

const PROVIDERS: Record<ProviderId, PaymentProvider> = {
  mercadopago: mercadoPagoProvider,
  asaas: asaasProvider,
  infinitepay: infinitePayProviderCentral,
};
export const TODOS_PROVEDORES = Object.values(PROVIDERS);

const CHAVE = "pagamento.provedor_ativo";

export async function getProvedorAtivoId(): Promise<ProviderId> {
  return getConfig<ProviderId>(CHAVE, "mercadopago");
}

export async function setProvedorAtivo(id: ProviderId): Promise<{ ok: boolean; erro?: string }> {
  if (!PROVIDERS[id]) return { ok: false, erro: "Provedor inválido." };
  return setConfig(CHAVE, id);
}

export async function getProvedorAtivo(): Promise<PaymentProvider> {
  const id = await getProvedorAtivoId();
  return PROVIDERS[id] || PROVIDERS.mercadopago;
}
