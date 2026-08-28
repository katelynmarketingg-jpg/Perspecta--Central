import { getConvitePorToken } from "@/lib/convites";
import { planById, getSistemas } from "@/lib/data";
import PagamentoSelfService from "@/components/PagamentoSelfService";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Pagina({ params }: { params: { token: string } }) {
  const convite = await getConvitePorToken(params.token);
  if (!convite) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "var(--bg)" }}>
        <div style={{ textAlign: "center", color: "var(--muted)" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔗</div>
          <div style={{ fontSize: 16, fontWeight: 650, color: "var(--text)" }}>Link não encontrado</div>
          <div style={{ fontSize: 13.5, marginTop: 4 }}>Este link de pagamento não existe ou expirou. Fale com quem te enviou.</div>
        </div>
      </div>
    );
  }
  const sistemas = await getSistemas();
  const sistema = sistemas.find((s) => s.id === convite.sistemaId);
  const plano = planById(convite.planoId);

  return (
    <PagamentoSelfService
      token={params.token}
      convite={convite}
      sistema={sistema ? { nome: sistema.nome, cor: sistema.cor, url: sistema.url } : null}
      plano={plano ? { nome: plano.nome, valor: plano.valor } : null}
    />
  );
}
