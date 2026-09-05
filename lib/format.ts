const GB = 1024;

export const BRL = (n: number) =>
  "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const pct = (n: number) => Math.round(n * 100) + "%";

export const fmtStorage = (mb: number) =>
  mb >= GB ? (mb / GB).toFixed(1).replace(".", ",") + " GB" : Math.round(mb) + " MB";

export const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const nomeCurto = (n: string) => n.replace(/Perspec+ta /, "");

// Status de sistema em português simples — nunca mostra o valor cru
// (com_erro, sem_dados) direto na tela, sempre com uma palavra que
// qualquer pessoa entende.
export const STATUS_LABEL: Record<string, string> = {
  operacional: "Tudo certo",
  degradado: "Parcial",
  com_erro: "Erro",
  sem_dados: "Sem dado ainda",
};
export const STATUS_COR: Record<string, string> = {
  operacional: "var(--good)",
  degradado: "var(--warn)",
  com_erro: "var(--crit)",
  sem_dados: "var(--faint)",
};
export const statusLabel = (s: string) => STATUS_LABEL[s] || s;
export const statusCor = (s: string) => STATUS_COR[s] || "var(--faint)";
