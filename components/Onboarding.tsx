"use client";

import { useMemo, useState } from "react";
import { BRL, fmtStorage } from "@/lib/format";
import type { Plano } from "@/lib/types";

type Sis = { id: string; nome: string; cor: string };

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "11px 13px", color: "var(--text)", fontSize: 14, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550 };

const soDigitos = (v: string) => v.replace(/\D/g, "");

export function Onboarding({ sistemas, planos }: { sistemas: Sis[]; planos: Plano[] }) {
  const [step, setStep] = useState(1);
  const [sis, setSis] = useState<string>("");
  const [plano, setPlano] = useState<string>("");
  const [empresa, setEmpresa] = useState("");
  const [email, setEmail] = useState("");
  const [cnpj, setCnpj] = useState("");
  // Cartão fica só no navegador — nunca é enviado ao servidor (só um token derivado).
  const [cardNome, setCardNome] = useState("");
  const [cardNum, setCardNum] = useState("");
  const [cardVal, setCardVal] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<any>(null);

  const planosDoSis = useMemo(() => planos.filter((p) => p.sis === sis), [planos, sis]);
  const planoSel = useMemo(() => planos.find((p) => p.id === plano), [planos, plano]);
  const sisSel = useMemo(() => sistemas.find((s) => s.id === sis), [sistemas, sis]);

  function escolherSis(id: string) {
    setSis(id);
    setPlano("");
  }

  async function finalizar() {
    setErr("");
    if (!empresa || !email) { setErr("Preencha o nome da empresa e o e-mail."); return; }
    if (soDigitos(cardNum).length < 13 || soDigitos(cardVal).length < 4 || soDigitos(cardCvv).length < 3) {
      setErr("Confira os dados do cartão."); return;
    }
    setLoading(true);
    // Tokenização: no modo real, o SDK do Mercado Pago gera o token aqui no navegador.
    // Enquanto não há chave pública, geramos um token simulado com os últimos 4 dígitos —
    // o número completo do cartão NUNCA sai do navegador.
    const cardToken = "sim_" + soDigitos(cardNum).slice(-4);
    try {
      const r = await fetch("/api/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ empresa, email, cnpj, sis, plano, cardToken }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível concluir."); setLoading(false); return; }
      setResult(j);
      setStep(4);
    } catch {
      setErr("Falha de conexão. Tente novamente.");
    }
    setLoading(false);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", display: "grid", placeItems: "center", zIndex: 1000, padding: 20, overflow: "auto" }}>
      <div className="card" style={{ width: "100%", maxWidth: 520, padding: 28, display: "flex", flexDirection: "column", gap: 18, margin: "auto" }}>
        {/* Marca + passos */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: "linear-gradient(135deg,var(--accent),var(--accent-2))", display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 18 }}>P</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.01em" }}>Comece grátis na Perspecta</div>
            <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--faint)", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {step <= 3 ? `Passo ${step} de 3` : "Concluído"}
            </div>
          </div>
        </div>

        {step <= 3 && (
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ flex: 1, height: 4, borderRadius: 3, background: n <= step ? "var(--accent)" : "var(--border)" }} />
            ))}
          </div>
        )}

        {/* Passo 1 — sistema + plano */}
        {step === 1 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={lbl}>Qual sistema você quer usar?</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 8 }}>
                {sistemas.map((s) => (
                  <button key={s.id} type="button" onClick={() => escolherSis(s.id)}
                    style={{ textAlign: "left", padding: "10px 12px", borderRadius: 9, cursor: "pointer",
                      border: "1px solid " + (sis === s.id ? "var(--accent)" : "var(--border)"),
                      background: sis === s.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel-2)", color: "var(--text)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 600 }}>
                      <span style={{ width: 9, height: 9, borderRadius: "50%", background: s.cor }} />{s.nome.replace(/Perspec+ta /, "")}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {sis && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={lbl}>Escolha o plano</label>
                {planosDoSis.length === 0 && <div style={{ fontSize: 12.5, color: "var(--faint)" }}>Sem planos cadastrados para este sistema ainda.</div>}
                {planosDoSis.map((p) => (
                  <button key={p.id} type="button" onClick={() => setPlano(p.id)}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 13px", borderRadius: 9, cursor: "pointer", textAlign: "left",
                      border: "1px solid " + (plano === p.id ? "var(--accent)" : "var(--border)"),
                      background: plano === p.id ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "var(--panel-2)", color: "var(--text)" }}>
                    <span>
                      <span style={{ fontWeight: 650, fontSize: 14 }}>{p.nome}</span>
                      <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>{fmtStorage(p.storage)} · {p.logins} logins · {p.registros.toLocaleString("pt-BR")} registros</span>
                    </span>
                    <span className="num" style={{ fontWeight: 700, fontSize: 15 }}>{BRL(p.valor)}<span style={{ fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>/mês</span></span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "10px 12px" }}>
              ✨ <b>14 dias grátis.</b> Você só é cobrado depois do teste — e pode cancelar antes sem pagar nada.
            </div>

            <button className="btn" type="button" disabled={!plano} onClick={() => setStep(2)}
              style={{ justifyContent: "center", padding: "11px 15px", opacity: plano ? 1 : 0.5 }}>Continuar</button>
          </>
        )}

        {/* Passo 2 — dados da empresa */}
        {step === 2 && (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Nome da empresa</label>
              <input style={inp} value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Ex.: Advocacia Menezes" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>E-mail</label>
              <input style={inp} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contato@empresa.com.br" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>CNPJ <span style={{ color: "var(--faint)" }}>(opcional)</span></label>
              <input style={inp} value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" inputMode="numeric" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={() => setStep(1)} style={{ justifyContent: "center", padding: "11px 15px", flex: "0 0 auto" }}>Voltar</button>
              <button className="btn" type="button" disabled={!empresa || !email} onClick={() => setStep(3)} style={{ justifyContent: "center", padding: "11px 15px", flex: 1, opacity: empresa && email ? 1 : 0.5 }}>Continuar</button>
            </div>
          </>
        )}

        {/* Passo 3 — cartão + resumo */}
        {step === 3 && (
          <>
            <div style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13 }}>
                <b>{sisSel?.nome.replace(/Perspec+ta /, "")}</b> · {planoSel?.nome}
                <span style={{ display: "block", fontSize: 11.5, color: "var(--muted)" }}>14 dias grátis, depois {BRL(planoSel?.valor || 0)}/mês</span>
              </span>
              <button type="button" onClick={() => setStep(1)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>alterar</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Nome no cartão</label>
              <input style={inp} value={cardNome} onChange={(e) => setCardNome(e.target.value)} placeholder="Como está no cartão" autoComplete="cc-name" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={lbl}>Número do cartão</label>
              <input style={inp} value={cardNum} inputMode="numeric" autoComplete="cc-number"
                onChange={(e) => setCardNum(soDigitos(e.target.value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim())} placeholder="0000 0000 0000 0000" />
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <label style={lbl}>Validade</label>
                <input style={inp} value={cardVal} inputMode="numeric" autoComplete="cc-exp"
                  onChange={(e) => { const d = soDigitos(e.target.value).slice(0, 4); setCardVal(d.length > 2 ? d.slice(0, 2) + "/" + d.slice(2) : d); }} placeholder="MM/AA" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <label style={lbl}>CVV</label>
                <input style={inp} value={cardCvv} inputMode="numeric" autoComplete="cc-csc"
                  onChange={(e) => setCardCvv(soDigitos(e.target.value).slice(0, 4))} placeholder="123" />
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", gap: 7, alignItems: "flex-start" }}>
              <span>🔒</span>
              <span>Seu cartão é protegido pelo <b>Mercado Pago</b> e tokenizado no seu navegador — o número completo <b>nunca</b> é enviado nem guardado pela Perspecta. Você não é cobrado durante os 14 dias.</span>
            </div>

            {err ? <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div> : null}

            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn ghost" type="button" onClick={() => setStep(2)} style={{ justifyContent: "center", padding: "11px 15px", flex: "0 0 auto" }}>Voltar</button>
              <button className="btn" type="button" disabled={loading} onClick={finalizar} style={{ justifyContent: "center", padding: "11px 15px", flex: 1, opacity: loading ? 0.7 : 1 }}>
                {loading ? "Ativando…" : "Começar teste grátis"}
              </button>
            </div>
          </>
        )}

        {/* Passo 4 — sucesso */}
        {step === 4 && result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, alignItems: "center", textAlign: "center", padding: "6px 0" }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "color-mix(in srgb, var(--good) 18%, transparent)", display: "grid", placeItems: "center", color: "var(--good)", fontSize: 26 }}>✓</div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Teste grátis ativado!</div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
                {result.sistema} · plano {result.plano} — {result.trialDias} dias grátis.
              </div>
            </div>
            <div style={{ width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px", fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Empresa</span><b>{empresa}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>1ª cobrança</span><b>{new Date(result.trialAte).toLocaleDateString("pt-BR")}</b></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>Valor mensal</span><b className="num">{BRL(result.valor)}</b></div>
            </div>
            {result.simulado && (
              <div style={{ fontSize: 11.5, color: "var(--warn)", background: "color-mix(in srgb, var(--warn) 12%, transparent)", border: "1px solid color-mix(in srgb, var(--warn) 30%, transparent)", borderRadius: 9, padding: "9px 12px" }}>
                Modo simulado: nenhuma cobrança real foi feita. A cobrança recorrente ativa de verdade quando a chave do Mercado Pago for configurada.
              </div>
            )}
            <a className="btn" href="/" style={{ justifyContent: "center", padding: "11px 15px", width: "100%", textDecoration: "none" }}>Ir para o painel</a>
          </div>
        )}
      </div>
    </div>
  );
}
