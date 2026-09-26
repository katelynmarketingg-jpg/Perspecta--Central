import { Card, Kpi, Pill, Icon } from "@/components/ui";
import CobrancaAcoes from "@/components/CobrancaAcoes";
import { getSistemas, getEmpresas, getPagamentos, getPlanosTodos, empById } from "@/lib/data";
import { getProvedorAtivo } from "@/lib/integrations/payments";
import { listarConvites } from "@/lib/convites";
import { BRL, initials, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Cobranças: o lado de RECEBER. Quem paga, quem está em teste, quem atrasou —
// e, em cada linha, o botão de cobrar (link de pagamento, WhatsApp, e-mail ou
// baixa manual). As despesas (o que você paga) foram para Custos & despesas.
export default async function Cobrancas() {
  const [sistemas, empresas, pagamentos, provedor, convites, planos] = await Promise.all([
    getSistemas(), getEmpresas(), getPagamentos(), getProvedorAtivo(), listarConvites(), getPlanosTodos(),
  ]);

  // Cobrança por cliente, a partir dos convites reais (situação, teste, carência,
  // forma e dia de cobrança). Forma/dia só ficam certos depois que o cliente paga.
  const corSis = (id: string) => sistemas.find((s) => s.id === id)?.cor || "var(--accent)";
  const nomeSis = (id: string) => nomeCurto(sistemas.find((s) => s.id === id)?.nome || id);
  const valorDe = (planoId: string) => planos.find((p) => p.id === planoId)?.valor || 0;
  const diaDoMes = (iso: string | null) => (iso ? new Date(iso).getDate() : null);
  const dataCurta = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) : "—");
  const CARENCIA = 7;
  const nomeProvedor: Record<string, string> = { mercadopago: "Cartão (Mercado Pago)", asaas: "Cartão (Asaas)", infinitepay: "Pix/cartão (InfinitePay)", manual: "Pago por fora (baixa manual)" };
  const ordem: Record<string, number> = { aguardando_pagamento: 0, trial: 1, pendente: 2, ativo: 3, cancelado: 4 };

  const cobrancaClientes = [...convites].sort((a, b) => (ordem[a.status] ?? 9) - (ordem[b.status] ?? 9)).map((c) => {
    const valor = valorDe(c.planoId);
    let situacao = { label: "convite pendente", s: "muted" };
    let forma = "—", diaCobranca = "—", fimTeste = "—", carencia = "—";
    if (c.status === "trial") {
      situacao = { label: "em teste", s: "warn" };
      forma = "no teste (sem cobrança)";
      fimTeste = dataCurta(c.trialAte);
      const d = diaDoMes(c.trialAte); diaCobranca = d ? `1ª cobrança dia ${d}` : "—";
    } else if (c.status === "ativo") {
      situacao = { label: "pagando", s: "ativo" };
      forma = nomeProvedor[c.pagamentoProvider || ""] || "Cartão";
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
    return { c, valor, situacao, forma, diaCobranca, fimTeste, carencia };
  });

  const pagando = convites.filter((c) => c.status === "ativo");
  const emTeste = convites.filter((c) => c.status === "trial");
  const atrasados = convites.filter((c) => c.status === "aguardando_pagamento");
  const mrr = pagando.reduce((a, c) => a + valorDe(c.planoId), 0);
  const previsto = emTeste.reduce((a, c) => a + valorDe(c.planoId), 0);
  const emAtraso = atrasados.reduce((a, c) => a + valorDe(c.planoId), 0);
  const emCarencia = empresas.filter((e) => e.carenciaRestante != null);
  const falhas = pagamentos.filter((p) => p.status === "falhou" || p.status === "vencido");

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<path d="M20 6 9 17l-5-5"/>' k="Recebendo por mês" v={BRL(mrr)} delta={`${pagando.length} cliente(s) pagando`} dir="up" />
        <Kpi icon='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' k="Em teste (a receber)" v={BRL(previsto)} delta={`${emTeste.length} em teste grátis`} dir="flat" />
        <Kpi icon='<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' k="Em atraso" v={BRL(emAtraso)} delta={atrasados.length > 0 ? `${atrasados.length} para cobrar agora` : "ninguém atrasado"} dir={atrasados.length > 0 ? "down" : "flat"} />
        <Kpi icon='<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' k="Provedor ativo" v={provedor.nome} delta={provedor.configured() ? "cobrança real" : "modo simulado (sem chave)"} dir={provedor.configured() ? "up" : "down"} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Cobrança recorrente por <b>{provedor.nome}</b> (o Central nunca guarda o número do cartão). Para <b>gerar uma cobrança</b>, use os botões da linha do cliente: o link de pagamento é o mesmo do convite — o cliente cadastra o cartão e a assinatura mensal começa sozinha. Pagou por fora? <b>Marcar pago</b>. Troque o provedor em <a href="/config" style={{ color: "var(--accent)", fontWeight: 600 }}>Configurações</a>.</span>
      </div>

      <Card title="Precisa cobrar agora" hint="teste acabou e o pagamento não entrou — com carência restante">
        {falhas.length === 0 ? (
          <div className="card-b"><span style={{ color: "var(--muted)" }}>Nenhuma cobrança em atraso. 🎉</span></div>
        ) : falhas.map((p) => {
          const e = empById(empresas, p.emp);
          const c = convites.find((x) => x.id === p.emp);
          if (!e || !c) return null;
          return (
            <div className="alert crit" key={p.id}>
              <div className="aic"><Icon path='<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>' size={16} /></div>
              <div>
                <div className="at">{e.nome} · {BRL(valorDe(c.planoId))} — {p.status === "vencido" ? "Vencido" : "Falhou"}</div>
                <div className="ad">{p.motivo}{e.carenciaRestante != null ? ` · carência: ${e.carenciaRestante} de ${e.carenciaDias} dias restantes` : ""}</div>
              </div>
              <div className="tm">
                <CobrancaAcoes id={c.id} token={c.token} empresa={c.empresaNome} sistema={nomeSis(c.sistemaId)} whatsapp={c.whatsapp} email={c.email} status={c.status} />
              </div>
            </div>
          );
        })}
      </Card>

      <Card title="Cobrança por cliente" hint={`${cobrancaClientes.length} cliente(s) · atrasados primeiro · forma, dia, teste e carência`}
        action={<a href="/convites?novo=1" className="selectlike" style={{ textDecoration: "none" }}>+ Novo cliente</a>}>
        {cobrancaClientes.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhum cliente com cobrança ainda — os clientes aparecem aqui ao gerar o convite em <a href="/convites" style={{ color: "var(--accent)", fontWeight: 600 }}>Novo cliente</a>.</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Cliente</th><th>Sistema</th><th>Situação</th><th>Forma de pagamento</th><th>Dia de cobrança</th><th className="r">Valor/mês</th><th>Fim do teste</th><th>Carência</th><th>Cobrar</th></tr></thead>
              <tbody>
                {cobrancaClientes.map(({ c, valor, situacao, forma, diaCobranca, fimTeste, carencia }) => (
                  <tr key={c.id}>
                    <td><div className="co"><div className="ci">{initials(c.empresaNome)}</div><div className="cn">{c.empresaNome}</div></div></td>
                    <td><span className="sys-tag"><span className="sd" style={{ background: corSis(c.sistemaId) }} />{nomeSis(c.sistemaId)}</span></td>
                    <td><Pill s={situacao.s} label={situacao.label} /></td>
                    <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{forma}</td>
                    <td className="num" style={{ fontSize: 12.5 }}>{diaCobranca}</td>
                    <td className="r num">{valor > 0 ? BRL(valor) : "—"}</td>
                    <td className="num" style={{ fontSize: 12.5 }}>{fimTeste}</td>
                    <td className="num" style={{ fontSize: 12.5, color: carencia !== "—" ? "var(--warn)" : "var(--faint)" }}>{carencia}</td>
                    <td><CobrancaAcoes id={c.id} token={c.token} empresa={c.empresaNome} sistema={nomeSis(c.sistemaId)} whatsapp={c.whatsapp} email={c.email} status={c.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="row2">
        <Card title="Regras de carência" hint="o que acontece quando o pagamento não entra">
          <div className="card-b">
            <div className="cost-line"><span className="lbl">Carência padrão</span><span className="val num">{CARENCIA} dias</span></div>
            <div className="cost-line"><span className="lbl">Ao esgotar</span><span className="val">bloquear o acesso (hoje manual, em Acessos)</span></div>
            <div className="cost-line"><span className="lbl">Retentativa de cobrança</span><span className="val">feita pelo provedor ({provedor.nome})</span></div>
            <p style={{ color: "var(--muted)", fontSize: 12.5, marginTop: 10 }}>
              A carência conta a partir do fim do teste grátis. Enquanto houver dias, o cliente continua usando — é a hora de mandar o link de pagamento.
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
                    <td><span className="sys-tag"><span className="sd" style={{ background: corSis(e.sis) }} />{nomeSis(e.sis)}</span></td>
                    <td className="r num" style={{ color: "var(--warn)", fontWeight: 650 }}>{e.carenciaRestante}d</td>
                  </tr>
                ))}
                {emCarencia.length === 0 && <tr><td colSpan={3} style={{ color: "var(--muted)" }}>Ninguém em carência.</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Card title="Histórico de cobranças" hint="pagamentos confirmados e vencidos">
        {pagamentos.length === 0 ? (
          <div style={{ color: "var(--muted)", fontSize: 13.5 }}>Nenhuma cobrança registrada ainda.</div>
        ) : (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Empresa</th><th>Sistema</th><th className="r">Valor</th><th>Método</th><th>Data</th><th>Tentativas</th><th>Status</th></tr></thead>
              <tbody>
                {pagamentos.map((p) => {
                  const e = empById(empresas, p.emp);
                  if (!e) return null;
                  return (
                    <tr key={p.id}>
                      <td><div className="co"><div className="ci">{initials(e.nome)}</div><div className="cn">{e.nome}</div></div></td>
                      <td><span className="sys-tag"><span className="sd" style={{ background: corSis(e.sis) }} />{nomeSis(e.sis)}</span></td>
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
        )}
      </Card>
    </>
  );
}
