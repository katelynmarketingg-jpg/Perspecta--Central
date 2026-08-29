import { Card, Kpi, Icon, Pill } from "@/components/ui";
import CustosManuais from "@/components/CustosManuais";
import { getResumoCusto } from "@/lib/gatilhos";
import { listarCustosManuais } from "@/lib/custos-manuais";
import { getSistemas } from "@/lib/data";
import { BRL, nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const ROTULO: Record<string, string> = {
  ok: "grátis", perto: "quase no limite", passou: "já paga", pago: "pago", medir: "grátis",
};
const COR: Record<string, string> = {
  ok: "var(--good)", perto: "var(--warn)", passou: "var(--crit)", pago: "var(--accent)", medir: "var(--good)",
};

export default async function Custos() {
  const [{ atualBrl, previstoBrl, itens, manualBrl }, sistemas, custosManuais] = await Promise.all([
    getResumoCusto(),
    getSistemas(),
    listarCustosManuais(),
  ]);
  const diff = previstoBrl - atualBrl;
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          <b>Custo hoje</b> (o que você paga agora) e <b>custo previsto</b> (quando cada serviço passar do plano grátis e entrar no pacote pago). Assim você sabe de antemão para quanto a conta vai quando começar a pagar.
        </span>
      </div>

      <div className="grid-kpi">
        <Kpi icon='<line x1="5" y1="12" x2="19" y2="12"/>' k="Custo de infra hoje" v={atualBrl > 0 ? BRL(atualBrl) : "grátis"} />
        <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Custo previsto (pacotes pagos)" v={BRL(previstoBrl)} />
        <Kpi icon='<path d="M12 5v14M5 12h14"/>' k="Aumento quando pagar tudo" v={BRL(diff)} />
      </div>

      <Card title="Custo por serviço — hoje × previsto" hint="quando o grátis acabar, entra o pacote pago">
        <div className="tablewrap">
          <table>
            <thead>
              <tr><th>Serviço</th><th>Situação</th><th className="r">Custo hoje</th><th>Pacote pago</th><th className="r">Custo previsto</th></tr>
            </thead>
            <tbody>
              {itens.map((g, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{g.servico}</td>
                  <td><Pill s={g.estado === "passou" || g.estado === "pago" ? "ativo" : g.estado === "perto" ? "warn" : "muted"} label={ROTULO[g.estado]} /></td>
                  <td className="r num" style={{ color: g.custoAtualBrl > 0 ? "var(--text)" : "var(--good)", fontWeight: 650 }}>{g.custoAtualBrl > 0 ? BRL(g.custoAtualBrl) : "grátis"}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>{g.pacote}</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{g.custoPrevistoBrl > 0 ? BRL(g.custoPrevistoBrl) : "grátis"}</td>
                </tr>
              ))}
              {manualBrl > 0 && (
                <tr>
                  <td style={{ fontWeight: 600 }}>Custos adicionais (seus)</td>
                  <td><Pill s="ativo" label="pago" /></td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                  <td style={{ color: "var(--muted)", fontSize: 12.5 }}>cadastrados por você</td>
                  <td className="r num" style={{ fontWeight: 650 }}>{BRL(manualBrl)}</td>
                </tr>
              )}
              <tr style={{ borderTop: "2px solid var(--border-strong)" }}>
                <td style={{ fontWeight: 700 }}>Total</td>
                <td />
                <td className="r num" style={{ fontWeight: 700 }}>{atualBrl > 0 ? BRL(atualBrl) : "grátis"}</td>
                <td />
                <td className="r num" style={{ fontWeight: 700, color: "var(--accent)" }}>{BRL(previstoBrl)}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--faint)" }}>
          "Previsto" assume todos os pacotes pagos ativos (Supabase Pro, Vercel Pro, etc.). Câmbio e preços conferidos em {itens[0]?.conferido || "—"} — fontes nas linhas da aba <b>Consumos</b>. Ajuste o câmbio em lib/precos se precisar.
        </div>
      </Card>

      <CustosManuais sistemas={sisSimples} custos={custosManuais} />
    </>
  );
}
