"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Icon } from "@/components/ui";

type Kind = "juris" | "commerce";

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

// Textos por sistema — o Juris tem campos extras (nome/e-mail); o Commerce
// loga por Empresa + Usuário + Senha, sem e-mail.
const CFG: Record<Kind, {
  endpoint: string;
  nomeLabel: string; nomePlaceholder: string;
  usuarioLabel: string; usuarioPlaceholder: string;
  extras: boolean; // Juris aceita nome e e-mail do admin
}> = {
  juris: {
    endpoint: "/api/acessos/juris",
    nomeLabel: "Escritório (nome do cliente)", nomePlaceholder: "Ex.: Advocacia Silva",
    usuarioLabel: "Login do admin", usuarioPlaceholder: "ex.: silva (não é e-mail)",
    extras: true,
  },
  commerce: {
    endpoint: "/api/acessos/commerce",
    nomeLabel: "Loja (nome do cliente)", nomePlaceholder: "Ex.: Perfume Prateado",
    usuarioLabel: "Usuário do admin", usuarioPlaceholder: "ex.: pedro (não é e-mail)",
    extras: false,
  },
};

export default function AcessosSistema({
  kind, titulo, cor, pronto, motivoBloqueio,
}: {
  kind: Kind; titulo: string; cor: string; pronto: boolean; motivoBloqueio?: string;
}) {
  const cfg = CFG[kind];
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function criar() {
    setErr(""); setOk("");
    if (!nome.trim() || !usuario.trim() || !senha) { setErr("Preencha nome, usuário e senha."); return; }
    if (!confirm(`Criar "${nome}" com o login "${usuario}" no ${titulo}? Isso cria de verdade no sistema.`)) return;
    setLoading(true);
    const body = kind === "juris"
      ? { nome, adminLogin: usuario, adminSenha: senha, adminNome, adminEmail }
      : { nomeLoja: nome, adminUsuario: usuario, senha };
    try {
      const r = await fetch(cfg.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível criar."); setLoading(false); return; }
      setOk(`"${nome}" criado no ${titulo} com o login "${usuario}".`);
      setNome(""); setUsuario(""); setSenha(""); setAdminNome(""); setAdminEmail("");
      setOpen(false);
      router.refresh();
    } catch {
      setErr("Falha de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <>
      {ok && <div className="banner" style={{ borderColor: "var(--good)" }}><Icon path='<path d="M20 6 9 17l-5-5"/>' /><span>{ok}</span></div>}
      <Card
        title={`Criar acesso — ${titulo}`}
        hint={pronto ? "cria escritório/loja + login direto no sistema" : "indisponível"}
        action={
          <button type="button" onClick={() => { setOpen((v) => !v); setErr(""); }} disabled={!pronto}
            style={{ background: pronto ? cor : "var(--panel-2)", color: pronto ? "#fff" : "var(--faint)", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: pronto ? "pointer" : "not-allowed" }}>
            {open ? "Fechar" : "+ Criar acesso"}
          </button>
        }
      >
        {!pronto ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            {motivoBloqueio || `Configure as variáveis do ${titulo} no Vercel para criar acessos por aqui.`}
          </div>
        ) : open ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, padding: "4px 0" }}>
            <div><label style={lbl}>{cfg.nomeLabel}</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={cfg.nomePlaceholder} /></div>
            <div><label style={lbl}>{cfg.usuarioLabel}</label><input style={inp} value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder={cfg.usuarioPlaceholder} /></div>
            <div><label style={lbl}>Senha do admin</label><input style={inp} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="senha inicial" /></div>
            {cfg.extras && <div><label style={lbl}>Nome do admin (opcional)</label><input style={inp} value={adminNome} onChange={(e) => setAdminNome(e.target.value)} placeholder="Ex.: João Silva" /></div>}
            {cfg.extras && <div><label style={lbl}>E-mail do admin (opcional)</label><input style={inp} value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="contato@cliente.com" /></div>}
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={criar} disabled={loading}
                style={{ background: cor, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>
                {loading ? "Criando…" : `Criar no ${titulo}`}
              </button>
            </div>
            {err && <div style={{ gridColumn: "1/-1", color: "var(--crit)", fontSize: 13 }}>{err}</div>}
          </div>
        ) : (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Clique em <b>+ Criar acesso</b> para cadastrar um cliente direto no {titulo} — sem depender do link de convite.
          </div>
        )}
      </Card>
    </>
  );
}
