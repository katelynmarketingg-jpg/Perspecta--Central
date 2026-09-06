"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Pill } from "@/components/ui";

type Sis = { id: string; nome: string; cor: string };
type Mensagem = { id: string; autor: string; texto: string; anexoBase64: string | null; anexoNome: string | null; criadoEm: string };
type Ticket = {
  id: string; assunto: string; categoria: string; prioridade: string; status: string;
  sistemaId: string | null; empresaRef: string | null; criadoEm: string; atualizadoEm: string; mensagens: Mensagem[];
};

const CATEGORIA_LABEL: Record<string, string> = { problema: "Problema", sugestao: "Sugestão", erro: "Erro", duvida: "Dúvida" };
const PRIORIDADE_PILL: Record<string, { s: string; label: string }> = {
  alta: { s: "inad", label: "Alta" }, media: { s: "pend", label: "Média" }, baixa: { s: "sem_dados", label: "Baixa" },
};
const STATUS_PILL: Record<string, { s: string; label: string }> = {
  aberto: { s: "pend", label: "Aberto" }, andamento: { s: "ativo", label: "Em andamento" }, resolvido: { s: "canc", label: "Resolvido" },
};
const MAX_ANEXO_BYTES = 1_000_000;

const inp: React.CSSProperties = {
  background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 9,
  padding: "9px 12px", color: "var(--text)", fontSize: 13.5, width: "100%",
};
const lbl: React.CSSProperties = { fontSize: 12, color: "var(--muted)", fontWeight: 550, display: "block", marginBottom: 5 };

function fileParaBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function SuporteView({ sistemas, tickets }: { sistemas: Sis[]; tickets: Ticket[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id || null);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "aberto" | "andamento" | "resolvido">("todos");
  const [novo, setNovo] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [fAssunto, setFAssunto] = useState("");
  const [fCategoria, setFCategoria] = useState("problema");
  const [fPrioridade, setFPrioridade] = useState("media");
  const [fSistema, setFSistema] = useState("");
  const [fEmpresa, setFEmpresa] = useState("");
  const [fMensagem, setFMensagem] = useState("");
  const [fArquivo, setFArquivo] = useState<File | null>(null);

  const [resposta, setResposta] = useState("");
  const [respArquivo, setRespArquivo] = useState<File | null>(null);

  const nomeSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.nome || id : "Geral");
  const corSis = (id: string | null) => (id ? sistemas.find((s) => s.id === id)?.cor || "var(--accent)" : "var(--muted)");

  const listaFiltrada = useMemo(() => {
    const b = busca.trim().toLowerCase();
    return tickets.filter((t) => {
      if (filtroStatus !== "todos" && t.status !== filtroStatus) return false;
      if (b && !`${t.assunto} ${t.empresaRef ?? ""}`.toLowerCase().includes(b)) return false;
      return true;
    });
  }, [tickets, busca, filtroStatus]);

  const selecionado = tickets.find((t) => t.id === selectedId) || null;

  function limparForm() {
    setFAssunto(""); setFCategoria("problema"); setFPrioridade("media"); setFSistema(""); setFEmpresa(""); setFMensagem(""); setFArquivo(null); setErr("");
  }

  async function criarChamado() {
    setErr("");
    if (!fAssunto.trim() || !fMensagem.trim()) { setErr("Preencha o assunto e a mensagem."); return; }
    if (fArquivo && fArquivo.size > MAX_ANEXO_BYTES) { setErr("Anexo grande demais (máx. ~1MB)."); return; }
    setLoading(true);
    try {
      const anexoBase64 = fArquivo ? await fileParaBase64(fArquivo) : null;
      const r = await fetch("/api/suporte", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assunto: fAssunto, categoria: fCategoria, prioridade: fPrioridade,
          sistemaId: fSistema || null, empresaRef: fEmpresa || null, mensagem: fMensagem,
          anexoBase64, anexoNome: fArquivo?.name || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível criar o chamado."); setLoading(false); return; }
      limparForm(); setNovo(false); setSelectedId(j.id || null);
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function enviarResposta() {
    if (!selecionado) return;
    setErr("");
    if (!resposta.trim() && !respArquivo) { setErr("Escreva algo ou anexe um print."); return; }
    if (respArquivo && respArquivo.size > MAX_ANEXO_BYTES) { setErr("Anexo grande demais (máx. ~1MB)."); return; }
    setLoading(true);
    try {
      const anexoBase64 = respArquivo ? await fileParaBase64(respArquivo) : null;
      const r = await fetch(`/api/suporte/${selecionado.id}/mensagens`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto: resposta, anexoBase64, anexoNome: respArquivo?.name || null }),
      });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Não foi possível enviar."); setLoading(false); return; }
      setResposta(""); setRespArquivo(null);
      router.refresh();
    } catch { setErr("Falha de conexão."); }
    setLoading(false);
  }

  async function mudarStatus(status: string) {
    if (!selecionado) return;
    await fetch(`/api/suporte/${selecionado.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }),
    });
    router.refresh();
  }

  return (
    <div className="row2">
      <div className="card" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: 14, borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => { setNovo(true); setSelectedId(null); setErr(""); }}
            style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "9px 14px", fontWeight: 600, fontSize: 13.5, cursor: "pointer" }}>
            + Novo chamado
          </button>
          <input style={inp} placeholder="Buscar por assunto ou empresa..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(["todos", "aberto", "andamento", "resolvido"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setFiltroStatus(s)}
                style={{
                  border: "1px solid var(--border)", borderRadius: 20, padding: "4px 11px", fontSize: 12, cursor: "pointer",
                  background: filtroStatus === s ? "var(--accent)" : "var(--panel-2)", color: filtroStatus === s ? "#fff" : "var(--text)",
                }}>
                {s === "todos" ? "Todos" : STATUS_PILL[s].label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {listaFiltrada.length === 0 && <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhum chamado.</span></div>}
          {listaFiltrada.map((t) => {
            const ultima = t.mensagens[t.mensagens.length - 1];
            return (
              <div key={t.id} onClick={() => { setSelectedId(t.id); setNovo(false); setErr(""); }}
                style={{
                  padding: "13px 16px", borderBottom: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 5, cursor: "pointer",
                  background: selectedId === t.id ? "var(--panel-2)" : "transparent",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 640, fontSize: 13 }}>{t.assunto}</span>
                  <span style={{ marginLeft: "auto" }}><Pill s={PRIORIDADE_PILL[t.prioridade].s} label={PRIORIDADE_PILL[t.prioridade].label} /></span>
                </div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11.5, color: "var(--faint)" }}>
                  <span className="sys-tag"><span className="sd" style={{ background: corSis(t.sistemaId) }} />{nomeSis(t.sistemaId)}</span>
                  {t.empresaRef && <span>· {t.empresaRef}</span>}
                  <span style={{ marginLeft: "auto" }}><Pill s={STATUS_PILL[t.status].s} label={STATUS_PILL[t.status].label} /></span>
                </div>
                {ultima && <div style={{ fontSize: 12, color: "var(--faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{ultima.texto}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card" style={{ display: "flex", flexDirection: "column" }}>
        {novo ? (
          <>
            <div className="card-h"><h3>Novo chamado</h3></div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <div><label style={lbl}>Assunto</label><input style={inp} value={fAssunto} onChange={(e) => setFAssunto(e.target.value)} placeholder="Resumo curto do que está acontecendo" /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><label style={lbl}>Tipo</label>
                  <select style={inp} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
                    {Object.entries(CATEGORIA_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><label style={lbl}>Prioridade</label>
                  <select style={inp} value={fPrioridade} onChange={(e) => setFPrioridade(e.target.value)}>
                    <option value="alta">Alta</option><option value="media">Média</option><option value="baixa">Baixa</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ flex: 1 }}><label style={lbl}>Sistema (opcional)</label>
                  <select style={inp} value={fSistema} onChange={(e) => setFSistema(e.target.value)}>
                    <option value="">Geral</option>
                    {sistemas.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}><label style={lbl}>Empresa (opcional)</label><input style={inp} value={fEmpresa} onChange={(e) => setFEmpresa(e.target.value)} placeholder="Nome do cliente, se for de um só" /></div>
              </div>
              <div><label style={lbl}>Descreva</label>
                <textarea style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "inherit" }} value={fMensagem} onChange={(e) => setFMensagem(e.target.value)} placeholder="O que houve, quando começou, passos pra reproduzir..." />
              </div>
              <div><label style={lbl}>Print (opcional, até ~1MB)</label><input type="file" accept="image/*" onChange={(e) => setFArquivo(e.target.files?.[0] || null)} style={{ fontSize: 12.5 }} /></div>
              {err && <div style={{ color: "var(--crit)", fontSize: 13 }}>{err}</div>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={criarChamado} disabled={loading} style={{ background: "var(--accent)", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{loading ? "…" : "Criar chamado"}</button>
                <button type="button" onClick={() => { setNovo(false); limparForm(); }} style={{ background: "var(--panel-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", fontSize: 13.5, cursor: "pointer" }}>Cancelar</button>
              </div>
            </div>
          </>
        ) : selecionado ? (
          <>
            <div className="card-h">
              <h3>{selecionado.assunto}</h3>
              <span className="act">
                <select style={{ ...inp, width: "auto", padding: "5px 10px", fontSize: 12.5 }} value={selecionado.status} onChange={(e) => mudarStatus(e.target.value)}>
                  <option value="aberto">Aberto</option><option value="andamento">Em andamento</option><option value="resolvido">Resolvido</option>
                </select>
              </span>
            </div>
            <div style={{ padding: "0 18px 8px", color: "var(--faint)", fontSize: 12.5, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="sys-tag"><span className="sd" style={{ background: corSis(selecionado.sistemaId) }} />{nomeSis(selecionado.sistemaId)}</span>
              {selecionado.empresaRef && <span>· {selecionado.empresaRef}</span>}
              <span>· {CATEGORIA_LABEL[selecionado.categoria]}</span>
              <Pill s={PRIORIDADE_PILL[selecionado.prioridade].s} label={PRIORIDADE_PILL[selecionado.prioridade].label} />
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, overflowY: "auto", maxHeight: 340 }}>
              {selecionado.mensagens.map((m) => (
                <div key={m.id} style={{ background: "var(--panel-2)", border: "1px solid var(--border)", borderRadius: 12, padding: "11px 14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--faint)", marginBottom: 5 }}>
                    <b style={{ color: "var(--text)" }}>{m.autor}</b>
                    <span>{new Date(m.criadoEm).toLocaleString("pt-BR")}</span>
                  </div>
                  {m.texto && <div style={{ fontSize: 13 }}>{m.texto}</div>}
                  {m.anexoBase64 && <img src={m.anexoBase64} alt={m.anexoNome || "anexo"} style={{ maxWidth: "100%", borderRadius: 8, marginTop: 8 }} />}
                </div>
              ))}
            </div>
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
              {err && <div style={{ color: "var(--crit)", fontSize: 12.5 }}>{err}</div>}
              <textarea style={{ ...inp, minHeight: 60, resize: "vertical", fontFamily: "inherit" }} placeholder="Escreva uma atualização..." value={resposta} onChange={(e) => setResposta(e.target.value)} />
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="file" accept="image/*" onChange={(e) => setRespArquivo(e.target.files?.[0] || null)} style={{ fontSize: 12, flex: 1 }} />
                <button type="button" onClick={enviarResposta} disabled={loading} className="btn">{loading ? "…" : "Enviar"}</button>
              </div>
            </div>
          </>
        ) : (
          <div className="placeholder"><p>Sem chamados ainda — clique em "Novo chamado".</p></div>
        )}
      </div>
    </div>
  );
}
