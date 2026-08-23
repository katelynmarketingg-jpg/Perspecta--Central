"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Icon, Pill } from "@/components/ui";

type Me = { ok: boolean; papel?: string; usuario?: string; escritorio?: string; superadmin: boolean; erro?: string };
type Org = {
  id: number; name: string; subscription?: string; users_count?: number;
  clients_count?: number; trial_days_left?: number | null; plan_name?: string | null; whatsapp?: string | null;
};

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

function subInfo(s?: string): { label: string; st: string } {
  if (s === "master") return { label: "master", st: "inativo" };
  if (s === "pagante") return { label: "pagante", st: "ativo" };
  if (s === "teste") return { label: "em teste", st: "degradado" };
  if (s === "expirado") return { label: "expirado", st: "com_erro" };
  return { label: s || "—", st: "inativo" };
}

export default function AcessosCreator({ me, orgs, orgsErro, cor }: { me: Me; orgs: Org[] | null; orgsErro?: string; cor: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [adminUsuario, setAdminUsuario] = useState("");
  const [adminNome, setAdminNome] = useState("");
  const [adminSenha, setAdminSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  const podeCriar = me.ok && me.superadmin;

  async function criar() {
    setErr(""); setOk("");
    if (!nome.trim() || !adminUsuario.trim() || !adminSenha) { setErr("Preencha escritório, usuário e senha."); return; }
    if (!confirm(`Criar o escritório "${nome}" e o login "${adminUsuario}" no Perspecta Creator? Isso cria de verdade no sistema.`)) return;
    setLoading(true);
    try {
      const r = await fetch("/api/acessos/creator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, adminUsuario, adminNome, adminSenha, whatsapp }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível criar."); setLoading(false); return; }
      setOk(`Escritório "${nome}" criado no Creator com o login "${adminUsuario}".`);
      setNome(""); setAdminUsuario(""); setAdminNome(""); setAdminSenha(""); setWhatsapp("");
      setOpen(false);
      router.refresh(); // relê a lista ao vivo
    } catch {
      setErr("Falha de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <>
      {/* Diagnóstico do papel da conta */}
      <div className="banner" style={{ borderColor: podeCriar ? "var(--good)" : "var(--warn)" }}>
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          {me.ok ? (
            <>Conta do Creator: <b>{me.usuario || "—"}</b> · papel <b>{me.papel || "?"}</b>
              {podeCriar
                ? <> — <b style={{ color: "var(--good)" }}>pode criar acessos.</b></>
                : <> — <b style={{ color: "var(--warn)" }}>não é superadmin</b>; loga e lê, mas só o escritório <b>master</b> cria acessos. Ajuste as variáveis <code>CREATOR_*</code> para a conta master.</>}
            </>
          ) : (
            <>Não consegui identificar a conta do Creator: <b style={{ color: "var(--crit)" }}>{me.erro || "erro"}</b>.</>
          )}
        </span>
      </div>

      {ok && <div className="banner" style={{ borderColor: "var(--good)" }}><Icon path='<path d="M20 6 9 17l-5-5"/>' /><span>{ok}</span></div>}

      <Card
        title="Acessos do Perspecta Creator"
        hint={orgs ? `${orgs.length} escritório(s) ao vivo` : "—"}
        action={
          <button type="button" onClick={() => { setOpen((v) => !v); setErr(""); }} disabled={!podeCriar}
            style={{ background: podeCriar ? cor : "var(--panel-2)", color: podeCriar ? "#fff" : "var(--faint)", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: podeCriar ? "pointer" : "not-allowed" }}>
            {open ? "Fechar" : "+ Criar acesso"}
          </button>
        }
      >
        {open && podeCriar && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, padding: "4px 0 14px", borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
            <div><label style={lbl}>Escritório (nome do cliente)</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Advocacia Silva" /></div>
            <div><label style={lbl}>Usuário do admin</label><input style={inp} value={adminUsuario} onChange={(e) => setAdminUsuario(e.target.value)} placeholder="ex.: silva (não é e-mail)" /></div>
            <div><label style={lbl}>Nome do admin (opcional)</label><input style={inp} value={adminNome} onChange={(e) => setAdminNome(e.target.value)} placeholder="Ex.: João Silva" /></div>
            <div><label style={lbl}>Senha do admin</label><input style={inp} type="password" value={adminSenha} onChange={(e) => setAdminSenha(e.target.value)} placeholder="senha inicial" /></div>
            <div><label style={lbl}>WhatsApp (opcional)</label><input style={inp} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(00) 00000-0000" /></div>
            <div style={{ display: "flex", alignItems: "flex-end" }}>
              <button type="button" onClick={criar} disabled={loading}
                style={{ background: cor, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>
                {loading ? "Criando…" : "Criar no Creator"}
              </button>
            </div>
            {err && <div style={{ gridColumn: "1/-1", color: "var(--crit)", fontSize: 13 }}>{err}</div>}
          </div>
        )}

        {orgs === null ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>{orgsErro || "Não foi possível listar os escritórios."}</div>
        ) : orgs.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum escritório ainda.</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Escritório</th><th>Situação</th><th>Usuários</th><th>Clientes</th><th>Plano</th><th>Trial</th></tr></thead>
              <tbody>
                {orgs.map((o) => {
                  const s = subInfo(o.subscription);
                  return (
                    <tr key={o.id}>
                      <td><span className="sys-tag"><span className="sd" style={{ background: cor }} />{o.name}</span></td>
                      <td><Pill s={s.st} label={s.label} /></td>
                      <td className="num">{o.users_count ?? "—"}</td>
                      <td className="num">{o.clients_count ?? "—"}</td>
                      <td>{o.plan_name || "—"}</td>
                      <td className="num">{o.trial_days_left != null ? (o.trial_days_left >= 0 ? `${o.trial_days_left}d` : "expirado") : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
