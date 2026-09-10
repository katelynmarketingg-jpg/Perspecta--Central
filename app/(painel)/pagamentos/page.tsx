import { Card, Kpi, Pill, Icon } from "@/components/ui";
import { getSistemas, getEmpresas, getPagamentos, empById, sysById, planById } from "@/lib/data";
import { getProvedorAtivo } from "@/lib/integrations/payments";
import { listarDespesas, situacaoDespesa } from "@/lib/despesas";
import { listarConvites } from "@/lib/convites";
import DespesasView from "@/components/Despesas";
import { BRL, initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Pagamentos() {
  const [sistemas, empresas, pagamentos, provedor, despesas, convites] = await Promise.all([
    getSistemas(), getEmpresas(), getPagamentos(), getProvedorAtivo(), listarDespesas(), listarConvites(),
  ]);

  // Cobrança por cliente, a partir dos convites reais (situação, teste, carência,
  // forma e dia de cobrança). Forma/dia só ficam certos depois que o cliente paga.
  const corSis = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";
  const nomeSis = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);
  const diaDoMes = (iso: string | null) => (iso ? new Date(iso).getDate() : null);
  const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");
  const CARENCIA = 7;
  const cobrancaClientes = convites.map((c) => {
    const valor = planById(c.planoId)?.valor || 0;
    let situacao = { label: "convite pendente", s: "muted" };
    let forma = "—", diaCobranca = "—", fimTeste = "—", carencia = "—";
    if (c.status === "trial") {
      situacao = { label: "em teste", s: "warn" };
      forma = "no teste (sem cobrança)";
      fimTeste = dataCurta(c.trialAte);
      const d = diaDoMes(c.trialAte); diaCobranca = d ? `1ª cobrança dia ${d}` : "—";
    } else if (c.status === "ativo") {
      situacao = { label: "pagando", s: "ativo" };
      forma = "Cartão (Mercado Pago)";
      const d = diaDoMes(c.ativadoEm) || diaDoMes(c.trialAte); diaCobranca = d ? `todo dia ${d}` : "—";
    } else if (c.status === "aguardando_pagamento") {
      situacao = { label: "aguardando pagamento", s: "inad" };
      forma = "aguardando cartão";
      const rest = c.trialAte ? Math.max(0, CARENCIA - Math.round((Date.now() - new Date(c.trialAte).getTime()) / 86400000)) : null;
      carencia = rest != null ? `${rest} de ${CARENCIA} dias` : "—";
      fimTeste = dataCurta(c.trialAte);
    } else if (c.status === "cancelado") {
      situacao = { label: "cancelado", s: "canc" };
    }
    return { id: c.id, empresa: c.empresaNome, sistemaId: c.sistemaId, valor, situacao, forma, diaCobranca, fimTeste, carencia };
  });
  const falhas = pagamentos.filter((p) => p.status === "falhou" || p.status === "vencido");
  const recebido = pagamentos.filter((p) => p.status === "pago").reduce((a, p) => a + p.valor, 0);
  const aReceber = pagamentos.filter((p) => p.status !== "pago").reduce((a, p) => a + p.valor, 0);
  const emCarencia = empresas.filter((e) => e.carenciaRestante != null);
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }));
  const despesasComSituacao = despesas.map((d) => ({ ...d, situacao: situacaoDespesa(d) }));

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<path d="M20 6 9 17l-5-5"/>' k="Recebido no mês" v={BRL(recebido)} />
        <Kpi icon='<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' k="Não entraram" v={BRL(aReceber)} delta={falhas.length + " cobranças"} dir="down" />
        <Kpi icon='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' k="Em carência" v={emCarencia.length} delta="acesso ainda liberado" dir="flat" />
        <Kpi icon='<rect x="2" y="5" width="20" height="14" rx="2"/>' k="Assinaturas ativas" v={empresas.filter((e) => e.status === "ativo").length} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Cobrança recorrente por <b>{provedor.nome}</b> (o Central nunca guarda o número do cartão). Carência padrão <b>7 dias</b> após falha; ao esgotar, o acesso do tenant é bloqueado automaticamente. Troque o provedor em <b>Configurações</b>.</span>
      </div>

      <Card title="Cobrança por cliente" hint={`${cobrancaClientes.length} cliente(s) · forma, dia, teste e carência`}>
        {cobrancaClientes.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum cliente com cobrança ainda — os clientes aparecem aqui ao criar o convite de primeiro acesso (aba Acessos).</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Cliente</th><th>Sistema</th><th>Situação</th><th>Forma de pagamento</th><th>Dia de cobrança</th><th className="r">Valor/mês</th><th>Fim do teste</th><th>Carência</th></tr></thead>
              <tbody>
                {cobrancaClientes.map((c) => (
                  <tr key={c.id}>
                    <td><div className="co"><div className="ci">{initials(c.empresa)}</div><div className="cn">{c.empresa}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: corSis(c.sistemaId) }} />{nomeSis(c.sistemaId)}</span></td>
                    <td><Pill s={c.situacao.s} label={c.situacao.label} /></td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{c.forma}</td>
                    <td className="num" style={{ fontSize: 12.5 }}>{c.diaCobranca}</td>
                    <td className="r num">{c.valor > 0 ? BRL(c.valor) : "—"}</td>
                    <td className="num" style={{ fontSize: 12.5 }}>{c.fimTeste}</td>
                    <td className="num" style={{ fontSize: 12.5, color: c.carencia !== "—" ? "var(--warn)" : "var(--faint)" }}>{c.carencia}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Pagamentos que não entraram" hint="exigem sua ação — com motivo e carência">
        {falhas.length === 0 ? (
          <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhuma falha em aberto.</span></div>
        ) : falhas.map((p) => {
          const e = empById(empresas, p.emp)!;
          return (
            <div className="alert crit" key={p.id}>
              <div className="aic"><Icon path='<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' size={16} /></div>
              <div>
                <div className="at">{e.nome} · {BRL(p.valor)} — {p.status === "vencido" ? "Vencido" : "Falhou"}</div>
                <div className="ad">{p.motivo}{e.carenciaRestante != null ? ` · carência: ${e.carenciaRestante} de ${e.carenciaDias} dias restantes` : ""}</div>
              </div>
              <div className="tm"><button className="btn ghost sm">Reprocessar</button></div>
            </div>
          );
        })}
      </Card>

      <div className="row2">
        <Card title="Configuração de carência" hint="padrão por plano, sobrescreve por empresa">
          <div className="card-b">
            <div className="cost-line"><span className="lbl">Carência padrão</span><span className="val num">7 dias</span></div>
            <div className="cost-line"><span className="lbl">Ao esgotar</span><span className="val">bloqueio automático</span></div>
            <div className="cost-line"><span className="lbl">Retentativa de cobrança</span><span className="val num">a cada 3 dias</span></div>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>
              A conta bancária que recebe cada cobrança é configurável por sistema (uma central pode ter mais de uma conta). Ajuste em Configurações.
            </p>
          </div>
        </Card>
        <Card title="Empresas em carência" hint="acesso liberado por tempo limitado">
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th className="r">Restam</th></tr></thead>
              <tbody>
                {emCarencia.map((e) => (
                  <tr key={e.id}>
                    <td><div className="co"><div className="ci">{initials(e.nome)}</div><div className="cn">{e.nome}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: sysById(e.sis)?.cor }} />{nomeCurto(sysById(e.sis)?.nome || "")}</span></td>
                    <td className="r num" style={{ color: "var(--warn)", fontWeight: 650 }}>{e.carenciaRestante}d</td>
                  </tr>
                ))}
                {emCarencia.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>Ninguém em carência.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Histórico de cobranças" hint="todas as tentativas, não só o resultado final">
        <div className="tablewrap">
          <table>
            <thead><tr><th>Empresa</th><th>Sistema</th><th className="r">Valor</th><th>Método</th><th>Data</th><th>Tentativas</th><th>Status</th></tr></thead>
            <tbody>
              {pagamentos.map((p) => {
                const e = empById(empresas, p.emp)!;
                return (
                  <tr key={p.id}>
                    <td><div className="co"><div className="ci">{initials(e.nome)}</div><div className="cn">{e.nome}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: sysById(e.sis)?.cor }} />{nomeCurto(sysById(e.sis)?.nome || "")}</span></td>
                    <td className="r num">{BRL(p.valor)}</td>
                    <td>{p.metodo}</td>
                    <td className="num">{p.data}</td>
                    <td style={{ color: "var(--faint)", fontSize: 12 }}>{p.tentativas ? p.tentativas.map((t) => `${t.data} ${t.resultado}`).join(" · ") : "1 (ok)"}</td>
                    <td><Pill s={p.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <DespesasView sistemas={sisSimples} despesas={despesasComSituacao} />
    </>
  );
}
