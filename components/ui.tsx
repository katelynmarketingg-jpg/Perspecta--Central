import React from "react";
import type { Source } from "@/lib/types";

export function Icon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2}
      dangerouslySetInnerHTML={{ __html: path }} />
  );
}

export function Kpi({ icon, k, v, delta, dir = "flat" }:
  { icon?: string; k: string; v: React.ReactNode; delta?: string; dir?: "up" | "down" | "flat" }) {
  return (
    <div className="card kpi">
      {icon ? <div className="ic"><Icon path={icon} size={20} /></div> : null}
      <div>
        <div className="k">{k}</div>
        <div className="v num">{v}</div>
        {delta ? <div className={"delta " + dir}>{delta}</div> : null}
      </div>
    </div>
  );
}

const PILL_CLASS: Record<string, string> = {
  operacional: "good", ativo: "good", pago: "good", sucesso: "good",
  com_erro: "crit", inad: "crit", falhou: "crit", vencido: "crit", falha: "crit",
  degradado: "warn", pend: "warn", pendente: "warn",
  sem_dados: "muted", canc: "muted",
};
const PILL_LABEL: Record<string, string> = {
  operacional: "Operacional", degradado: "Degradado", com_erro: "Com erro", sem_dados: "Sem dados",
  ativo: "Ativo", inad: "Inadimplente", pend: "Pendente", canc: "Cancelado",
  pago: "Pago", falhou: "Falhou", vencido: "Vencido", pendente: "Pendente",
  sucesso: "Sucesso", falha: "Falha",
};
export function Pill({ s, label }: { s: string; label?: string }) {
  return <span className={"pill " + (PILL_CLASS[s] || "muted")}>{label || PILL_LABEL[s] || s}</span>;
}

const SRC_LABEL: Record<Source, string> = { live: "ao vivo", manual: "manual", mock: "sem dados" };
export function SourceTag({ source }: { source: Source }) {
  return <span className={"tag-src " + source}>{SRC_LABEL[source]}</span>;
}

export function Card({ title, hint, action, children }:
  { title?: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card">
      {(title || action) && (
        <div className="card-h">
          {title ? <h3>{title}</h3> : null}
          {hint ? <span className="hint">{hint}</span> : null}
          {action ? <span className="act">{action}</span> : null}
        </div>
      )}
      {children}
    </div>
  );
}

export function Chart({ svg }: { svg: string }) {
  return <div className="chart-wrap" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ---- SVG chart builders (strings) ----
export function barChartSvg(labels: string[], a: number[], b: number[], colA = "#e0713a", colB = "#e2604f") {
  const W = 560, H = 210, padL = 44, padR = 12, padT = 12, padB = 28, iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...a, ...b) * 1.12, gw = iw / labels.length, bw = Math.min(16, gw / 3.2), gap = 5;
  let g = "";
  for (let i = 0; i <= 4; i++) {
    const y = padT + ih - (ih * i / 4), val = Math.round(max * i / 4);
    g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/><text x="${padL - 8}" y="${y + 3.5}" text-anchor="end" font-size="10" fill="currentColor" fill-opacity="0.5">${val >= 1000 ? (val / 1000) + "k" : val}</text>`;
  }
  labels.forEach((lb, i) => {
    const cx = padL + gw * i + gw / 2, ha = ih * (a[i] / max), hb = ih * (b[i] / max);
    g += `<rect x="${cx - bw - gap / 2}" y="${padT + ih - ha}" width="${bw}" height="${ha}" rx="3" fill="${colA}"/><rect x="${cx + gap / 2}" y="${padT + ih - hb}" width="${bw}" height="${hb}" rx="3" fill="${colB}" opacity=".9"/><text x="${cx}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="currentColor" fill-opacity="0.65">${lb}</text>`;
  });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

export function areaChartSvg(labels: string[], data: number[], color = "#e0713a") {
  const W = 560, H = 210, padL = 40, padR = 14, padT = 14, padB = 28, iw = W - padL - padR, ih = H - padT - padB;
  const max = Math.max(...data) * 1.1, min = Math.min(...data) * 0.9;
  const X = (i: number) => padL + iw * i / (labels.length - 1);
  const Y = (v: number) => padT + ih - ((v - min) / (max - min)) * ih;
  let g = "";
  for (let i = 0; i <= 4; i++) { const y = padT + ih - (ih * i / 4); g += `<line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="currentColor" stroke-opacity="0.12" stroke-width="1"/>`; }
  const line = data.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join(" ");
  const id = "ar" + Math.random().toString(36).slice(2, 6);
  g += `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".30"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>`;
  g += `<path d="${line} L ${X(data.length - 1)} ${padT + ih} L ${padL} ${padT + ih} Z" fill="url(#${id})"/>`;
  g += `<path d="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>`;
  data.forEach((v, i) => { g += `<circle cx="${X(i)}" cy="${Y(v)}" r="${i === data.length - 1 ? 4 : 2.6}" fill="${color}"/>`; });
  labels.forEach((lb, i) => { g += `<text x="${X(i)}" y="${H - 9}" text-anchor="middle" font-size="10.5" fill="currentColor" fill-opacity="0.65">${lb}</text>`; });
  return `<svg class="chart" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}

export function Hbar({ rows }: { rows: { name: string; color: string; pctWidth: number; value: string }[] }) {
  return (
    <div className="card-b">
      {rows.map((r, i) => (
        <div className="hbar-row" key={i}>
          <div className="hbar-lab"><span className="sd" style={{ background: r.color }} />{r.name}</div>
          <div className="hbar-track"><div className="hbar-fill" style={{ width: r.pctWidth + "%", background: r.color }} /></div>
          <div className="hbar-val num">{r.value}</div>
        </div>
      ))}
    </div>
  );
}
