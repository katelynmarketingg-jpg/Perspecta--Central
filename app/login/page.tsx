"use client";
import { useState } from "react";

export default function Login() {
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/login", { method: "POST", body: fd });
    if (r.ok) {
      window.location.href = "/";
    } else {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Não foi possível entrar.");
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20 }}>
      <form onSubmit={onSubmit} className="card" style={{ width: "100%", maxWidth: 380, padding: 28, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div className="logo" style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Perspecta Central</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", letterSpacing: "0.14em", textTransform: "uppercase" }}>Acesso restrito</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 550 }}>E-mail</label>
          <input name="email" type="email" required autoComplete="username" placeholder="voce@perspecta.com.br"
            style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "11px 13px", color: "var(--text)", fontSize: 14 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, color: "var(--muted)", fontWeight: 550 }}>Senha</label>
          <input name="password" type="password" required autoComplete="current-password"
            style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "11px 13px", color: "var(--text)", fontSize: 14 }} />
        </div>

        {err ? <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div> : null}

        <button className="btn" type="submit" disabled={loading} style={{ justifyContent: "center", padding: "11px 15px", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Entrando…" : "Entrar"}
        </button>
        <div style={{ fontSize: 11.5, color: "var(--faint)", textAlign: "center" }}>Uso interno · só a equipe Perspecta</div>
      </form>
    </div>
  );
}
