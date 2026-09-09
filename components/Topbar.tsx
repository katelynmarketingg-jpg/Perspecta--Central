"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { PAGE_META } from "@/lib/nav";

function metaFor(path: string) {
  if (PAGE_META[path]) return PAGE_META[path];
  const base = "/" + (path.split("/")[1] || "");
  return PAGE_META[base] || { title: "Perspecta Central", sub: "" };
}

type SisFiltro = { id: string; nome: string; cor: string };

export default function Topbar({ sistemas = [] }: { sistemas?: SisFiltro[] }) {
  const path = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const meta = metaFor(path);
  const sisAtual = params.get("sistema") || "";
  const [theme, setTheme] = useState<string>("dark");

  const onFiltro = (id: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (id) p.set("sistema", id); else p.delete("sistema");
    const qs = p.toString();
    router.push(qs ? `${path}?${qs}` : path);
  };

  const THEMES = ["dark", "light", "bege"];
  const LABEL: Record<string, string> = { dark: "escuro", light: "claro", bege: "bege" };

  useEffect(() => {
    const saved = localStorage.getItem("pc-theme") || "dark";
    document.documentElement.setAttribute("data-theme", saved);
    setTheme(saved);
  }, []);

  const toggle = () => {
    const next = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("pc-theme", next);
    setTheme(next);
  };

  return (
    <header className="top">
      <div>
        <h1>{meta.title}</h1>
        <div className="sub">{meta.sub}</div>
      </div>
      <div className="filters">
        <span className="selectlike" style={{ position: "relative" }}>
          <span className="dot" style={{ background: sistemas.find((s) => s.id === sisAtual)?.cor || undefined }} />
          {sistemas.find((s) => s.id === sisAtual)?.nome || "Todos os sistemas"}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <select
            value={sisAtual}
            onChange={(e) => onFiltro(e.target.value)}
            aria-label="Filtrar por sistema"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
          >
            <option value="">Todos os sistemas</option>
            {sistemas.map((s) => (
              <option key={s.id} value={s.id}>{s.nome}</option>
            ))}
          </select>
        </span>
        <span className="icon-btn" onClick={toggle} title={`Tema: ${LABEL[theme]} — clique para trocar`} role="button">
          {theme === "dark" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
          ) : theme === "light" ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor" stroke="none" />
            </svg>
          )}
        </span>
      </div>
    </header>
  );
}
