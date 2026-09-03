"use client";

import { useState } from "react";
import { BRL } from "@/lib/format";

type Convite = {
  id: string; sistemaId: string; empresaNome: string; email: string; trialDias: number;
  status: "pendente" | "trial" | "aguardando_pagamento" | "ativo" | "cancelado";
  trialAte: string | null;
  loginUsuario: string | null;
  loginCriadoEm: string | null;
};

const inp: React.CSSProperties = { background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", color: "var(--text)", fontSize: 14.5, width: "100%", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 6 };

function Shell({ cor, children }: { cor: string; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 20, boxSizing: "border-box",
      background: `radial-gradient(1100px 620px at 50% -10%, color-mix(in srgb, ${cor} 20%, transparent), transparent 60%), var(--bg)`,
    }}>
      <div style={{ width: "100%", maxWidth: 460, display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 13 }}>P</div>
          <span style={{ fontSize: 12.5, fontWeight: 650, color: "var(--muted)", letterSpacing: "0.02em" }}>Perspecta</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20,
      padding: 32, display: "flex", flexDirection: "column", gap: 18, boxShadow: "0 24px 60px -20px rgba(0,0,0,0.35)",
      boxSizing: "border-box",
    }}>
      {children}
    </div>
  );
}

function Steps({ atual, total, cor }: { atual: number; total: number; cor: string }) {
  return (
    <div style={{ display: "flex", gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ flex: 1, height: 3.5, borderRadius: 3, background: i < atual ? cor : "var(--border)", transition: "background .2s" }} />
      ))}
    </div>
  );
}

export default function PrimeiroAcesso({ token, convite, sistema, plano, termo }: {
  token: string;
  convite: Convite;
  sistema: { nome: string; cor: string; url: string } | null;
  plano: { nome: string; valor: number } | null;
  termo: string;
}) {
  const criaLoginAutomatico = ["creator", "juris", "commerce"].includes(convite.sistemaId);
  const [passo, setPasso] = useState<"termos" | "login" | "pronto">(
    convite.status !== "pendente" ? (criaLoginAutomatico && !convite.loginCriadoEm ? "login" : "pronto") : "termos"
  );
  const [aceite, setAceite] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [trialInfo, setTrialInfo] = useState<{ trialAte: string; trialDias: number } | null>(
    convite.status !== "pendente" ? { trialAte: convite.trialAte || "", trialDias: convite.trialDias } : null
  );
  const [usuario, setUsuario] = useState("");
  const [nome, setNome] = useState("");
  const [senha, setSenha] = useState("");
  const [loginFeito, setLoginFeito] = useState(Boolean(convite.loginCriadoEm));
  const nomeSis = sistema?.nome.replace(/Perspec+ta /, "") || "Perspecta";
  const cor = sistema?.cor || "var(--accent)";
  const totalPassos = criaLoginAutomatico ? 3 : 2;
  const passoNum = passo === "termos" ? 1 : passo === "login" ? 2 : totalPassos;

  async function aceitar() {
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/convites/aceitar", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível confirmar."); setLoading(false); return; }
      setTrialInfo({ trialAte: j.trialAte, trialDias: j.trialDias });
      setPasso(criaLoginAutomatico ? "login" : "pronto");
    } catch { setErr("Falha de conexão. Tente de novo."); }
    setLoading(false);
  }

  async function criarLogin() {
    setErr("");
    if (!senha || !usuario.trim()) { setErr("Escolha um usuário e uma senha."); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/convites/criar-login", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, adminUsuario: usuario, adminNome: nome, adminSenha: senha }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível criar o acesso."); setLoading(false); return; }
      setLoginFeito(true);
      setPasso("pronto");
    } catch { setErr("Falha de conexão. Tente de novo."); }
    setLoading(false);
  }

  if (convite.status === "cancelado") {
    return <Shell cor={cor}><Card><div style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Este convite foi cancelado. Fale com quem te enviou o link.</div></Card></Shell>;
  }

  return (
    <Shell cor={cor}>
      <Card>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg,${cor},${cor}bb)`, display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 22, boxShadow: `0 10px 26px -10px ${cor}` }}>{nomeSis[0]}</div>
          <div>
            <div style={{ fontWeight: 750, fontSize: 19, letterSpacing: "-0.01em" }}>Bem-vindo(a), {convite.empresaNome.split(" ")[0]}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 3 }}>Primeiro acesso ao {nomeSis}{plano ? ` · plano ${plano.nome}` : ""}</div>
          </div>
        </div>

        {passo !== "pronto" && <Steps atual={passoNum} total={totalPassos} cor={cor} />}

        {passo === "termos" && (
          <>
            <div style={{ fontSize: 13, color: "var(--text)", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 14px" }}>
              ✨ <b>{convite.trialDias} dias grátis.</b> {plano ? `Depois, ${BRL(plano.valor)}/mês — ` : ""}você só cadastra a forma de pagamento quando o teste acabar.
            </div>

            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", fontWeight: 550, marginBottom: 7 }}>Termos de uso — {nomeSis}</div>
              <div style={{ maxHeight: 200, overflow: "auto", border: "1px solid var(--border)", borderRadius: 12, padding: "13px 15px", fontSize: 12.5, lineHeight: 1.65, color: "var(--text)", background: "var(--panel-2)", whiteSpace: "pre-wrap" }}>
                {termo?.trim() || "Nenhum termo de uso foi cadastrado pra este sistema ainda. Fale com a Perspecta antes de continuar."}
              </div>
            </div>

            <label style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, cursor: "pointer" }}>
              <input type="checkbox" checked={aceite} onChange={(e) => setAceite(e.target.checked)} style={{ marginTop: 2, accentColor: cor, width: 16, height: 16 }} />
              <span>Li e aceito os termos de uso do {nomeSis}.</span>
            </label>

            {err && <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div>}

            <button type="button" disabled={!aceite || loading} onClick={aceitar}
              style={{ background: cor, color: "#fff", border: "none", borderRadius: 11, padding: "13px 16px", fontWeight: 650, fontSize: 15, cursor: aceite ? "pointer" : "not-allowed", opacity: aceite ? 1 : 0.5, transition: "opacity .15s" }}>
              {loading ? "Confirmando…" : "Aceitar e começar teste grátis"}
            </button>
          </>
        )}

        {passo === "login" && (
          <>
            <div style={{ fontSize: 13, color: "var(--good)", background: "var(--good-soft)", border: "1px solid color-mix(in srgb, var(--good) 30%, transparent)", borderRadius: 12, padding: "12px 14px" }}>
              ✓ Termos aceitos, teste grátis já está contando. Agora escolha seu usuário e senha pra entrar no {nomeSis}.
            </div>
            <div><label style={lbl}>Seu nome</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como te chamam" /></div>
            <div><label style={lbl}>Usuário</label><input style={inp} value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="ex.: joao (não é e-mail)" /></div>
            <div><label style={lbl}>Senha</label><input style={inp} type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="crie uma senha" /></div>

            {err && <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div>}

            <button type="button" disabled={loading} onClick={criarLogin}
              style={{ background: cor, color: "#fff", border: "none", borderRadius: 11, padding: "13px 16px", fontWeight: 650, fontSize: 15, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
              {loading ? "Criando…" : "Criar meu acesso"}
            </button>
          </>
        )}

        {passo === "pronto" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "4px 0" }}>
            <div style={{ width: 58, height: 58, borderRadius: "50%", background: "var(--good-soft)", display: "grid", placeItems: "center", color: "var(--good)", fontSize: 28 }}>✓</div>
            <div>
              <div style={{ fontSize: 19, fontWeight: 750, letterSpacing: "-0.01em" }}>{loginFeito ? "Acesso criado!" : "Teste grátis ativado!"}</div>
              {trialInfo?.trialAte && (
                <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 5 }}>
                  Teste grátis por <b style={{ color: "var(--text)" }}>{trialInfo.trialDias} dias</b>, até <b style={{ color: "var(--text)" }}>{new Date(trialInfo.trialAte).toLocaleDateString("pt-BR")}</b>.
                </div>
              )}
            </div>

            {loginFeito ? (
              <div style={{ fontSize: 12.5, color: "var(--faint)" }}>
                Perto do fim do teste a gente te manda um link pra cadastrar a forma de pagamento e continuar sem parar.
              </div>
            ) : (
              <div style={{ fontSize: 12.5, color: "var(--warn)", background: "var(--warn-soft)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", borderRadius: 12, padding: "10px 13px" }}>
                Esse sistema ainda não cria o login sozinho por aqui — a Perspecta vai liberar seu acesso manualmente e te avisar por e-mail/WhatsApp.
              </div>
            )}

            {loginFeito && sistema && (
              <a href={`https://${sistema.url}`} target="_blank" rel="noreferrer" style={{ width: "100%", background: cor, color: "#fff", borderRadius: 11, padding: "13px 16px", fontWeight: 650, fontSize: 15, textDecoration: "none", boxSizing: "border-box" }}>
                Acessar {nomeSis} agora
              </a>
            )}
          </div>
        )}
      </Card>
      <div style={{ textAlign: "center", fontSize: 11.5, color: "var(--faint)" }}>Powered by Perspecta</div>
    </Shell>
  );
}
