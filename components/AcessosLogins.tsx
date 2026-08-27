"use client";

import { useEffect, useState } from "react";
import { Card, Pill } from "@/components/ui";

type User = { id: number; name: string; username: string; role: string; active: boolean };

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "10px 12px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };
const aBtn: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 7,
  padding: "5px 9px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer",
};
const aBtnDanger: React.CSSProperties = { ...aBtn, color: "var(--crit)", borderColor: "var(--crit)" };

export default function AcessosLogins({ orgId, orgNome, cor, podeCriar }: { orgId: number; orgNome: string; cor: string; podeCriar: boolean }) {
  const [users, setUsers] = useState<User[] | null>(null);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [papel, setPapel] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);

  async function carregar() {
    setErro("");
    try {
      const r = await fetch(`/api/acessos/creator/usuarios?org=${orgId}`);
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Não foi possível listar."); setUsers(null); return; }
      setUsers(j.users);
    } catch { setErro("Falha de conexão."); }
  }

  useEffect(() => { carregar(); /* eslint-disable-next-line */ }, [orgId]);

  async function criar() {
    setErro("");
    if (!nome.trim() || !usuario.trim() || !senha) { setErro("Preencha nome, usuário e senha."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/acessos/creator/usuarios", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org: orgId, nome, usuario, senha, papel }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Não foi possível criar."); setLoading(false); return; }
      setNome(""); setUsuario(""); setSenha(""); setPapel("member"); setOpen(false);
      await carregar();
    } catch { setErro("Falha de conexão."); }
    setLoading(false);
  }

  async function agir(acao: "senha" | "ativar" | "desativar" | "excluir", u: User) {
    let senhaNova: string | undefined;
    if (acao === "senha") {
      senhaNova = prompt(`Nova senha para "${u.username}":`) || undefined;
      if (!senhaNova) return;
    } else {
      const q: Record<string, string> = {
        ativar: `Reativar o login "${u.username}"?`,
        desativar: `Desativar o login "${u.username}"? Ele para de entrar.`,
        excluir: `EXCLUIR o login "${u.username}" de vez?`,
      };
      if (!confirm(q[acao])) return;
    }
    setErro(""); setBusy(u.id);
    try {
      const r = await fetch("/api/acessos/creator/usuarios", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acao, org: orgId, id: u.id, senha: senhaNova }),
      });
      const j = await r.json();
      if (!r.ok) { setErro(j.error || "Não foi possível concluir."); setBusy(null); return; }
      await carregar();
    } catch { setErro("Falha de conexão."); }
    setBusy(null);
  }

  return (
    <Card
      title={`Logins de ${orgNome}`}
      hint={users ? `${users.length} login(s)` : "carregando…"}
      action={podeCriar ? (
        <button type="button" onClick={() => { setOpen((v) => !v); setErro(""); }}
          style={{ background: open ? "var(--panel-2)" : cor, color: open ? "var(--text)" : "#fff", border: open ? "1px solid var(--border)" : "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
          {open ? "Fechar" : "+ Novo login"}
        </button>
      ) : undefined}
    >
      {open && podeCriar && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, padding: "4px 0 14px", borderBottom: "1px solid var(--border)", marginBottom: 14 }}>
          <div><label style={lbl}>Nome</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Maria" /></div>
          <div><label style={lbl}>Usuário (não é e-mail)</label><input style={inp} value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="ex.: maria" /></div>
          <div><label style={lbl}>Senha</label><input style={inp} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="senha inicial" /></div>
          <div><label style={lbl}>Papel</label>
            <select style={inp} value={papel} onChange={(e) => setPapel(e.target.value as any)}>
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <button type="button" onClick={criar} disabled={loading}
              style={{ background: cor, color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", width: "100%" }}>
              {loading ? "Criando…" : "Criar login"}
            </button>
          </div>
        </div>
      )}

      {erro && <div style={{ color: "var(--crit)", fontSize: 13, marginBottom: 10 }}>{erro}</div>}

      {users === null ? (
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>{erro ? "" : "Carregando…"}</div>
      ) : users.length === 0 ? (
        <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum login neste escritório.</div>
      ) : (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Nome</th><th>Usuário</th><th>Papel</th><th>Situação</th>{podeCriar && <th>Ações</th>}</tr></thead>
            <tbody>
              {users.map((u) => {
                const bsy = busy === u.id;
                return (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td className="num" style={{ fontFamily: "var(--mono)" }}>{u.username}</td>
                    <td>{u.role === "superadmin" ? "superadmin" : u.role === "admin" ? "admin" : "membro"}</td>
                    <td><Pill s={u.active ? "ativo" : "inativo"} label={u.active ? "ativo" : "inativo"} /></td>
                    {podeCriar && (
                      <td>
                        {u.role === "superadmin" ? <span style={{ color: "var(--faint)", fontSize: 12 }}>—</span> : (
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            <button type="button" disabled={bsy} onClick={() => agir("senha", u)} style={aBtn}>Resetar senha</button>
                            {u.active
                              ? <button type="button" disabled={bsy} onClick={() => agir("desativar", u)} style={aBtn}>Desativar</button>
                              : <button type="button" disabled={bsy} onClick={() => agir("ativar", u)} style={aBtn}>Reativar</button>}
                            <button type="button" disabled={bsy} onClick={() => agir("excluir", u)} style={aBtnDanger}>Excluir</button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
