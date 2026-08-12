import type { Source } from "./types";

// Preços unitários publicados dos provedores de infraestrutura.
// Servem para: (a) referência do quanto cada serviço cobra por unidade, e
// (b) estimar custo de EXCEDENTE quando o uso ao vivo passar do incluído no plano.
// Valores em USD (tabelas oficiais); o Central converte para BRL pelo câmbio abaixo.
// Enquanto não há uso ao vivo, todo custo derivado é marcado como "estimativa" (manual).

const GB = 1024; // MB por GB

// Câmbio USD→BRL usado nas conversões. Ajuste conforme o câmbio corrente.
export const CAMBIO_USD_BRL = 5.4;

export const usdToBrl = (usd: number) => usd * CAMBIO_USD_BRL;

// Tabelas oficiais (aproximadas, mês de referência). Ajuste em Config quando mudarem.
export const PRECOS = {
  supabase: {
    label: "Supabase",
    plano: "Pro",
    baseUsd: 25, // plano Pro por organização (inclui cotas)
    incluido: { dbDiskGb: 8, storageGb: 100, egressGb: 250 },
    excedenteUsd: { dbDiskGb: 0.125, storageGb: 0.021, egressGb: 0.09 },
  },
  vercel: {
    label: "Vercel",
    plano: "Pro",
    baseUsd: 20, // por assento/mês
    incluido: { fastDataTransferGb: 1024, fastOriginTransferGb: 100 },
    excedenteUsd: { fastDataTransferGb: 0.15, fastOriginTransferGb: 0.06 },
  },
  render: {
    label: "Render",
    // Render cobra por serviço: o tier tem preço fixo (isto é direto, não estimativa de rateio).
    tiersUsd: { Starter: 7, Standard: 25, Pro: 85, "Pro Plus": 175 } as Record<string, number>,
  },
} as const;

export type InfraCusto = {
  baseBrl: number;   // custo fixo atribuído ao projeto (plano/host)
  usoMb: number;     // storage usado (soma das empresas do sistema)
  limiteMb: number;  // storage contratado (soma dos planos)
  custoPorGb: number; // baseBrl ÷ uso (GB)
  custoPorMb: number; // baseBrl ÷ uso (MB)
  utilizacao: number; // uso ÷ limite (0..1)
  source: Source;    // "live" quando o uso vier de API; senão "manual"/"mock"
};

// Deriva o custo por projeto e por MB a partir do custo já atribuído ao sistema
// e do uso agregado. Responde: "quanto custa o projeto" e "quanto custa o espaço que usamos".
export function infraCusto(params: {
  baseBrl: number;
  usoMb: number;
  limiteMb: number;
  source: Source;
}): InfraCusto {
  const { baseBrl, usoMb, limiteMb, source } = params;
  const usoGb = usoMb / GB;
  return {
    baseBrl,
    usoMb,
    limiteMb,
    custoPorGb: usoGb > 0 ? baseBrl / usoGb : 0,
    custoPorMb: usoMb > 0 ? baseBrl / usoMb : 0,
    utilizacao: limiteMb > 0 ? usoMb / limiteMb : 0,
    source,
  };
}
