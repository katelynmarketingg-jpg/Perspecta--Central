"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pill, SourceTag } from "@/components/ui";
import { BRL } from "@/lib/format";
import type { Source } from "@/lib/types";

export type SistemaCardData = {
  id: string;
  cor: string; inicial: string; nome: string; url: string;
  statusDot: string; statusPill: string; source: Source;
  contas: number | null; mrrText: string;
  hostLabel: string; repo: string; supabaseRef: string | null;
  ultimoDeploy: string | null; bancoNome: string; bancoCor: string;
  custoText: string; custoCor: string;
  lucroText: string; lucroCor: string;
  // Armazenamento
  usoGb: number | null; limiteGb: number | null; custoPorGbBrl: number | null; custoRealPorGbBrl: number | null;
  armazCompartilhadoSupabase: boolean;
  breakdown: { empresa: string; gb: number; limite: number | null }[];
  // Token
  tokenNome: string | null; tokenExpira: boolean; tokenExpiraEm: string | null;
  bugs: { sev: string; t: string; d: string; st: string }[];
};

const inp: React.CSSProperties = {
  background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8,
  padding: "7px 10px", color: "var(--text)", fontSize: 13, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 11, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 4 };

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span>{k}</span><span style={{ textAlign: "right" }}>{children}</span>
    </div>
  );
}

const GB = (n: number | null) => (n == null ? "—" : `${n % 1 === 0 ? n : n.toFixed(2)} GB`);

// Tamanho humano: GB, ou MB/KB quando é pouco (ex.: nós do Firebase por empresa).
function tam(gb: number): string {
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = gb * 1024;
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`;
  const kb = mb * 1024;
  return `${kb.toFixed(0)} KB`;
}

// Caixa clicável com cabeçalho (resumo) + detalhe/edição ao abrir.
function Caixa({ cor, titulo, resumo, children }: { cor: string; titulo: string; resumo: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, width: "100%", background: "transparent", border: "none", padding: "10px 12px", cursor: "pointer", color: "var(--text)", textAlign: "left" }}>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>{titulo}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 650 }}>
          {resumo}
          <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--faint)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </button>
      {open && <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border)" }}>{children}</div>}
    </div>
  );
}

function Armazenamento(s: SistemaCardData) {
  const router = useRouter();
  const [limite, setLimite] = useState(s.limiteGb != null ? String(s.limiteGb) : "");
  const [custoGb, setCustoGb] = useState(s.custoPorGbBrl != null ? String(s.custoPorGbBrl) : "");
  const [custoRealGb, setCustoRealGb] = useState(s.custoRealPorGbBrl != null ? String(s.custoRealPorGbBrl) : "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const limiteN = Number(limite) || 0;
  const custoGbN = Number(custoGb) || 0;         // preço cobrado/GB
  const custoRealGbN = Number(custoRealGb) || 0; // meu custo/GB
  const cobradoNovo = limiteN * custoGbN;
  const meuCustoNovo = limiteN * custoRealGbN;
  const custoAtual = s.limiteGb != null && s.custoPorGbBrl != null ? s.limiteGb * s.custoPorGbBrl : null;      // cobrado (hoje)
  const meuCustoAtual = s.limiteGb != null && s.custoRealPorGbBrl != null ? s.limiteGb * s.custoRealPorGbBrl : null; // meu (hoje)
  const pct = s.usoGb != null && s.limiteGb ? Math.min(100, (s.usoGb / s.limiteGb) * 100) : null;
  const corBarra = pct == null ? "var(--muted)" : pct >= 100 ? "var(--crit)" : pct >= 80 ? "var(--warn)" : "var(--good)";

  const resumo = s.limiteGb != null
    ? <><span>{GB(s.usoGb)} / {GB(s.limiteGb)}</span>{meuCustoAtual != null && <span style={{ color: "var(--muted)", fontWeight: 500 }}>· meu {BRL(meuCustoAtual)}/mês</span>}</>
    : <span style={{ color: "var(--warn)" }}>definir limite</span>;

  async function salvar() {
    setMsg(""); setSaving(true);
    try {
      const r = await fetch("/api/sistemas/detalhes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId: s.id, limiteGb: limite === "" ? null : limiteN, custoPorGbBrl: custoGb === "" ? null : custoGbN, custoRealPorGbBrl: custoRealGb === "" ? null : custoRealGbN }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Não foi possível salvar."); setSaving(false); return; }
      setMsg("Salvo!"); router.refresh();
    } catch { setMsg("Falha de conexão."); }
    setSaving(false);
  }

  return (
    <Caixa cor={s.cor} titulo="Armazenamento" resumo={resumo}>
      <div style={{ paddingTop: 10 }}>
        {pct != null ? (
          <>
            <div className="hbar-track" style={{ height: 8 }}><div className="hbar-fill" style={{ width: pct + "%", background: corBarra }} /></div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
              Usando <b style={{ color: "var(--text)" }}>{GB(s.usoGb)}</b> de <b>{GB(s.limiteGb)}</b> ({pct.toFixed(0)}%).
              {meuCustoAtual != null && <> Esse limite te custa <b style={{ color: "var(--text)" }}>{BRL(meuCustoAtual)}/mês</b>{custoAtual != null && <> (cobrando {BRL(custoAtual)})</>}.</>}
              {s.armazCompartilhadoSupabase && <span style={{ color: "var(--faint)" }}> Uso lido do banco Supabase (compartilhado entre os sistemas que usam esse banco).</span>}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {s.usoGb != null ? <>Uso atual: <b style={{ color: "var(--text)" }}>{GB(s.usoGb)}</b>. </> : "Uso não medido para este sistema. "}
            Defina o limite comprado abaixo para ver quanto custa e o quanto está sendo usado.
          </div>
        )}

        {/* Desmembramento por empresa: quem usa quanto (e quanto custa) */}
        {s.breakdown.length > 0 ? (
          <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
            <div style={{ padding: "7px 10px", background: "var(--panel)", fontSize: 11.5, fontWeight: 650, color: "var(--muted)", display: "flex", justifyContent: "space-between" }}>
              <span>Por empresa — quem usa quanto</span><span>{s.breakdown.length} empresa(s)</span>
            </div>
            {s.breakdown.map((e, i) => (
              <LinhaEmpresa key={i} sistemaId={s.id} cor={s.cor} custoPorGbBrl={s.custoRealPorGbBrl} usoGbSistema={s.usoGb} e={e} />
            ))}
          </div>
        ) : (
          <div style={{ marginTop: 10, fontSize: 12, color: "var(--faint)" }}>
            Desmembramento por empresa aparece quando o sistema reportar o uso de cada cliente (evento <b>uso.medido</b>). O Bistro já mostra ao vivo.
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 12 }}>
          <div><label style={lbl}>Limite comprado (GB)</label><input style={inp} type="number" min={0} value={limite} onChange={(e) => setLimite(e.target.value)} placeholder="ex.: 20" /></div>
          <div><label style={lbl}>Meu custo por GB (R$)</label><input style={inp} type="number" min={0} step="0.01" value={custoRealGb} onChange={(e) => setCustoRealGb(e.target.value)} placeholder="ex.: 0,67" /></div>
          <div><label style={lbl}>Preço por GB cobrado (R$)</label><input style={inp} type="number" min={0} step="0.01" value={custoGb} onChange={(e) => setCustoGb(e.target.value)} placeholder="ex.: 2,00" /></div>
        </div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
          Com <b style={{ color: "var(--text)" }}>{limiteN || 0} GB</b>:{" "}
          <b style={{ color: "var(--crit)" }}>meu custo {BRL(meuCustoNovo)}/mês</b> ·{" "}
          <b style={{ color: "var(--good)" }}>cobrando {BRL(cobradoNovo)}/mês</b>
          {cobradoNovo - meuCustoNovo !== 0 && <> · margem <b style={{ color: cobradoNovo - meuCustoNovo >= 0 ? "var(--good)" : "var(--crit)" }}>{BRL(cobradoNovo - meuCustoNovo)}/mês</b></>}
          {meuCustoAtual != null && meuCustoNovo !== meuCustoAtual && <span style={{ color: "var(--faint)" }}> (meu custo hoje: {BRL(meuCustoAtual)})</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button type="button" onClick={salvar} disabled={saving}
            style={{ background: s.cor, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {saving ? "Salvando…" : "Salvar / liberar GB"}
          </button>
          {msg && <span style={{ fontSize: 12.5, color: msg === "Salvo!" ? "var(--good)" : "var(--crit)" }}>{msg}</span>}
        </div>
      </div>
    </Caixa>
  );
}

function diasAteExpirar(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

function TokenBox(s: SistemaCardData) {
  const router = useRouter();
  const [nome, setNome] = useState(s.tokenNome || "");
  const [expira, setExpira] = useState(s.tokenExpira);
  const [data, setData] = useState(s.tokenExpiraEm || "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const dias = s.tokenExpira ? diasAteExpirar(s.tokenExpiraEm) : null;
  let resumo: React.ReactNode;
  if (!s.tokenNome) resumo = <span style={{ color: "var(--warn)" }}>configurar</span>;
  else if (!s.tokenExpira) resumo = <span style={{ color: "var(--good)" }}>vitalício</span>;
  else if (dias == null) resumo = <span style={{ color: "var(--muted)" }}>expira (sem data)</span>;
  else if (dias < 0) resumo = <span style={{ color: "var(--crit)" }}>expirado</span>;
  else {
    const cor = dias <= 7 ? "var(--crit)" : dias <= 30 ? "var(--warn)" : "var(--muted)";
    resumo = <span style={{ color: cor }}>expira em {dias}d</span>;
  }

  async function salvar() {
    setMsg(""); setSaving(true);
    try {
      const r = await fetch("/api/sistemas/detalhes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId: s.id, tokenNome: nome || null, tokenExpira: expira, tokenExpiraEm: expira ? (data || null) : null }),
      });
      const j = await r.json();
      if (!r.ok) { setMsg(j.error || "Não foi possível salvar."); setSaving(false); return; }
      setMsg("Salvo!"); router.refresh();
    } catch { setMsg("Falha de conexão."); }
    setSaving(false);
  }

  return (
    <Caixa cor={s.cor} titulo="Token / chave" resumo={resumo}>
      <div style={{ paddingTop: 10 }}>
        {s.tokenNome && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>
            Token: <b className="num" style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>{s.tokenNome}</b>.{" "}
            {s.tokenExpira
              ? (s.tokenExpiraEm
                  ? <>Expira em <b style={{ color: dias != null && dias <= 30 ? "var(--warn)" : "var(--text)" }}>{new Date(s.tokenExpiraEm + "T00:00:00").toLocaleDateString("pt-BR")}</b>{dias != null && <> ({dias < 0 ? "vencido" : `faltam ${dias} dias`}) — renove antes de vencer.</>}</>
                  : "Expira, mas sem data definida.")
              : "É vitalício — não precisa renovar."}
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <div><label style={lbl}>Qual token/chave (nome)</label><input style={inp} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="ex.: SUPABASE_MANAGEMENT_TOKEN" /></div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--text)", cursor: "pointer" }}>
            <input type="checkbox" checked={expira} onChange={(e) => setExpira(e.target.checked)} />
            Esse token expira (desmarcado = vitalício)
          </label>
          {expira && <div><label style={lbl}>Data de expiração</label><input style={inp} type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <button type="button" onClick={salvar} disabled={saving}
            style={{ background: s.cor, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
          {msg && <span style={{ fontSize: 12.5, color: msg === "Salvo!" ? "var(--good)" : "var(--crit)" }}>{msg}</span>}
        </div>
      </div>
    </Caixa>
  );
}

// Uma empresa na lista de armazenamento: uso × limite (editável) + custo.
function LinhaEmpresa({ sistemaId, cor, custoPorGbBrl, usoGbSistema, e }: {
  sistemaId: string; cor: string; custoPorGbBrl: number | null; usoGbSistema: number | null;
  e: { empresa: string; gb: number; limite: number | null };
}) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [val, setVal] = useState(e.limite != null ? String(e.limite) : "");
  const [saving, setSaving] = useState(false);

  const custoEmp = custoPorGbBrl != null ? e.gb * custoPorGbBrl : null;
  const temLimite = e.limite != null && e.limite > 0;
  const pctEmp = temLimite ? Math.min(100, (e.gb / (e.limite as number)) * 100) : (usoGbSistema ? Math.min(100, (e.gb / usoGbSistema) * 100) : 0);
  const corEmp = temLimite ? (pctEmp >= 100 ? "var(--crit)" : pctEmp >= 80 ? "var(--warn)" : "var(--good)") : cor;

  async function salvar() {
    setSaving(true);
    try {
      const r = await fetch("/api/sistemas/limite-empresa", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sistemaId, empresa: e.empresa, limiteGb: val === "" ? null : Number(val) }),
      });
      if (r.ok) { setEditando(false); router.refresh(); }
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ padding: "8px 10px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text)", textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.empresa}</span>
        <span className="num" style={{ fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }}>
          {tam(e.gb)}{temLimite && <span style={{ color: "var(--muted)", fontWeight: 500 }}> de {tam(e.limite as number)}</span>}
          {custoEmp != null && <span style={{ color: "var(--muted)", fontWeight: 500 }}> · {BRL(custoEmp)}</span>}
          <button type="button" onClick={() => setEditando((v) => !v)} title="Definir limite desta empresa"
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--faint)", padding: 0, display: "inline-flex" }}>
            <svg viewBox="0 0 24 24" width={13} height={13} fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
          </button>
        </span>
      </div>
      <div className="hbar-track" style={{ height: 5 }}><div className="hbar-fill" style={{ width: pctEmp + "%", background: corEmp }} /></div>
      {editando && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Limite (GB):</span>
          <input type="number" min={0} step="0.1" value={val} onChange={(ev) => setVal(ev.target.value)}
            style={{ ...inp, width: 90, padding: "5px 8px" }} placeholder="ex.: 5" />
          <button type="button" onClick={salvar} disabled={saving}
            style={{ background: cor, color: "#fff", border: "none", borderRadius: 7, padding: "5px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            {saving ? "…" : "Salvar"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function SistemaCard(s: SistemaCardData) {
  const [aberto, setAberto] = useState(false);
  // Alerta de token no cabeçalho (mesmo fechado), pra chamar atenção.
  const diasToken = s.tokenExpira ? diasAteExpirar(s.tokenExpiraEm) : null;
  const alertaToken = diasToken != null && diasToken <= 30;

  return (
    <div className="card sys-card">
      <div className="sys-top">
        <div className="sys-logo" style={{ background: `linear-gradient(135deg,${s.cor},${s.cor}cc)` }}>{s.inicial}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="sys-name">{s.nome}</div>
          {s.url
            ? <a href={`https://${s.url}`} target="_blank" rel="noreferrer" className="sys-url" style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{s.url} ↗</a>
            : <span className="sys-url">—</span>}
        </div>
        <span className="health-dot" style={{ background: s.statusDot }} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <Pill s={s.statusPill} /><SourceTag source={s.source} />
        {alertaToken && <span className="pill" style={{ color: diasToken! <= 7 ? "var(--crit)" : "var(--warn)", background: diasToken! <= 7 ? "var(--crit-soft)" : "var(--warn-soft)" }}>token {diasToken! < 0 ? "vencido" : `vence em ${diasToken}d`}</span>}
      </div>

      <div className="sys-stats" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="sys-stat"><div className="n num">{s.contas == null ? "—" : s.contas}</div><div className="l">Empresas</div></div>
        <div className="sys-stat"><div className="n num">{s.mrrText}</div><div className="l">Receita / mês</div></div>
      </div>

      <button type="button" onClick={() => setAberto((v) => !v)}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", color: "var(--muted)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
        {aberto ? "Ocultar detalhes" : "Detalhes"}
        <svg viewBox="0 0 24 24" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={2} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform .15s ease" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5, color: "var(--muted)" }}>
          {/* Financeiro do sistema, bem visível */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: 12 }}>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Receita/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{s.mrrText}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Custo/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: s.custoCor }}>{s.custoText}</div></div>
            <div><div style={{ fontSize: 11, color: "var(--muted)" }}>Lucro/mês</div><div className="num" style={{ fontSize: 15, fontWeight: 700, color: s.lucroCor }}>{s.lucroText}</div></div>
          </div>

          {/* Armazenamento e Token clicáveis */}
          <Armazenamento {...s} />
          <TokenBox {...s} />

          <a href={`/acessos?sistema=${s.id}`}
            style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", color: "var(--text)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            <span>Ver acessos & logins {s.contas != null ? `(${s.contas})` : ""}</span>
            <span style={{ color: s.cor }}>→</span>
          </a>

          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 2 }}>
            <Linha k="Hospedagem"><b style={{ color: "var(--text)" }}>{s.hostLabel}</b></Linha>
            <Linha k="Repositório"><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.repo || "—"}</span></Linha>
            <Linha k="Supabase"><span className="num" style={{ fontFamily: "var(--mono)" }}>{s.supabaseRef || "—"}</span></Linha>
            <Linha k="Último deploy">{s.ultimoDeploy || "sem dados"}</Linha>
            <Linha k="Banco de dados"><span style={{ color: s.bancoCor, fontWeight: 600 }}>{s.bancoNome}</span></Linha>
          </div>

          {s.bugs.length > 0 && (
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 4, display: "flex", flexDirection: "column", gap: 8 }}>
              {s.bugs.map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 12.5 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", marginTop: 5, flex: "none", background: b.sev === "alta" ? "var(--crit)" : b.sev === "media" ? "var(--warn)" : "var(--info)" }} />
                  <div><div style={{ color: "var(--text)", fontWeight: 600 }}>{b.t}</div><div style={{ color: "var(--faint)" }}>{b.d} · {b.st}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
