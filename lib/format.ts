const GB = 1024;

export const BRL = (n: number) =>
  "R$ " + Number(n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const pct = (n: number) => Math.round(n * 100) + "%";

export const fmtStorage = (mb: number) =>
  mb >= GB ? (mb / GB).toFixed(1).replace(".", ",") + " GB" : Math.round(mb) + " MB";

export const initials = (n: string) =>
  n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const nomeCurto = (n: string) => n.replace(/Perspec+ta /, "");
