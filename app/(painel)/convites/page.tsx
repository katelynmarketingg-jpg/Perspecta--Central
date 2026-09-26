import { Icon, Kpi } from "@/components/ui";
import AcessosConvite from "@/components/AcessosConvite";
import { getSistemas, getPlanos, getPlanosTodos } from "@/lib/data";
import { listarPlanosCentral } from "@/lib/planos-central";
import { listarConvites } from "@/lib/convites";
import { BRL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

// Novo cliente: o funil inteiro de um cliente novo num lugar só —
// gerar convite → cliente aceita o termo (teste começa) → cria o login →
// cadastra o pagamento. Antes ficava enterrado no meio de Acessos.
export default async function NovoCliente({ searchParams }: { searchParams?: { novo?: string; sistema?: string } }) {
  const filtro = searchParams?.sistema || "";
  const [sistemas, planosReais, todosPlanos, todosConvites] = await Promise.all([
    getSistemas(), listarPlanosCentral(), getPlanosTodos(), listarConvites(),
  ]);
  const convites = todosConvites.filter((c) => !filtro || c.sistemaId === filtro);

  // Planos reais da Perspecta (central.planos); cai nos modelos de exemplo só
  // enquanto o schema central não responder (senão o convite ficaria sem plano).
  const planos = planosReais.length
    ? planosReais.map((p) => ({ id: p.id, sis: p.sistemaId, nome: p.nome, valor: p.preco }))
    : getPlanos().map((p) => ({ id: p.id, sis: p.sis, nome: p.nome, valor: p.valor }));
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }));

  const dias = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null);
  const pendentes = convites.filter((c) => c.status === "pendente").length;
  const emTeste = convites.filter((c) => c.status === "trial");
  const acabando = emTeste.filter((c) => { const d = dias(c.trialAte); return d != null && d <= 3; }).length;
  const semPagamento = convites.filter((c) => c.status === "aguardando_pagamento").length;
  const pagando = convites.filter((c) => c.status === "ativo");
  const valorDe = (id: string) => todosPlanos.find((p) => p.id === id)?.valor || 0;
  const mrrConvites = pagando.reduce((a, c) => a + valorDe(c.planoId), 0);
  const previsto = emTeste.reduce((a, c) => a + valorDe(c.planoId), 0);

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          <b>Como funciona:</b> 1) você gera o convite e manda o link · 2) o cliente aceita o <a href="/termos" style={{ color: "var(--accent)", fontWeight: 600 }}>termo de uso</a> e o teste grátis começa · 3) no Creator, Juris e Commerce ele mesmo cria o login · 4) quando o teste acaba, o mesmo convite vira <b>link de pagamento</b> (acompanhe em <a href="/pagamentos" style={{ color: "var(--accent)", fontWeight: 600 }}>Cobranças</a>).
        </span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<path d="M4 4h16v16H4z"/><path d="m4 4 8 8 8-8"/>' k="Aguardando 1º acesso" v={pendentes} delta="link enviado, ainda não abriu" dir="flat" />
        <Kpi icon='<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' k="Em teste grátis" v={emTeste.length} delta={acabando > 0 ? `${acabando} acabando em até 3 dias` : previsto > 0 ? `${BRL(previsto)}/mês se todos pagarem` : "nenhum acabando"} dir={acabando > 0 ? "down" : "flat"} />
        <Kpi icon='<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>' k="Teste acabou, sem pagamento" v={semPagamento} delta={semPagamento > 0 ? "cobrar agora" : "tudo em dia"} dir={semPagamento > 0 ? "down" : "flat"} />
        <Kpi icon='<path d="M20 6 9 17l-5-5"/>' k="Pagando (via convite)" v={pagando.length} delta={mrrConvites > 0 ? `${BRL(mrrConvites)}/mês` : undefined} dir="up" />
      </div>

      <AcessosConvite sistemas={sisSimples} planos={planos} todosPlanos={todosPlanos} convites={convites} abrir={searchParams?.novo === "1"} />
    </>
  );
}
