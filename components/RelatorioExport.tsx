"use client";

import { Icon } from "@/components/ui";

type Row = Record<string, string | number>;

// Botões de export do relatório: CSV (gera arquivo no navegador) e PDF (imprimir).
// Recebe as linhas já calculadas no servidor — nada de dado sensível trafega além do que já está na tela.
export function RelatorioExport({ rows, filename }: { rows: Row[]; filename: string }) {
  function baixarCsv() {
    if (!rows.length) return;
    const cols = Object.keys(rows[0]);
    const esc = (v: string | number) => {
      const s = String(v ?? "");
      return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = [cols.join(";"), ...rows.map((r) => cols.map((c) => esc(r[c])).join(";"))].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename + ".csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button className="btn sm" onClick={baixarCsv}>
        <Icon path='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15l3 3 3-3"/><path d="M12 12v6"/>' size={14} />
        CSV
      </button>
      <button className="btn sm" onClick={() => window.print()}>
        <Icon path='<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>' size={14} />
        PDF
      </button>
    </span>
  );
}
