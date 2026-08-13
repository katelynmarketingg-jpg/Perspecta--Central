"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV } from "@/lib/nav";

export default function Sidebar({ badges }: { badges: { suporte: number; pagamentos: number } }) {
  const path = usePathname();
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const logout = async () => {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  };
  return (
    <aside className="side">
      <div className="brand">
        <div className="logo">P</div>
        <div>
          <div className="bt">Perspecta</div>
          <div className="bs">Central</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((grp) => (
          <div key={grp.label}>
            <div className="navlabel">{grp.label}</div>
            {grp.items.map((it) => (
              <Link key={it.href} href={it.href} className={isActive(it.href) ? "active" : ""}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                  dangerouslySetInnerHTML={{ __html: it.icon }} />
                {it.label}
                {it.badge && badges[it.badge] > 0 ? <span className="badge-n num">{badges[it.badge]}</span> : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="side-foot">
        <div className="av">KS</div>
        <div style={{ flex: 1 }}>
          <div className="nm">Katelyn Santos</div>
          <div className="rl">super_admin</div>
        </div>
        <span onClick={logout} title="Sair" role="button"
          style={{ cursor: "pointer", color: "var(--side-fg)", display: "grid", placeItems: "center", width: 30, height: 30, borderRadius: 8 }}>
          <svg viewBox="0 0 24 24" width={16} height={16} fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </span>
      </div>
    </aside>
  );
}
