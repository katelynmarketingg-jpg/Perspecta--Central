import { Card, Icon } from "@/components/ui";
import TermosUso from "@/components/TermosUso";
import { getSistemas } from "@/lib/data";
import { listarTermos } from "@/lib/termos";
import { nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Termos() {
  const [sistemas, termos] = await Promise.all([getSistemas(), listarTermos()]);
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));
  const termosSimples: Record<string, { texto: string; atualizadoEm: string | null }> = {};
  for (const s of sistemas) termosSimples[s.id] = { texto: termos[s.id]?.texto || "", atualizadoEm: termos[s.id]?.atualizadoEm || null };

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Cada sistema tem o seu <b>termo de uso</b>. Quando você gera um convite de <b>primeiro acesso</b> (aba Acessos), o cliente vê exatamente este texto e precisa aceitar antes do teste grátis começar a contar.
        </span>
      </div>

      <TermosUso sistemas={sisSimples} termos={termosSimples} />

      <Card title="Sem chave do Supabase configurada?" hint="onde isso fica salvo">
        <div style={{ color: "var(--muted)", fontSize: 12.5 }}>
          O texto é salvo no banco (schema <code>central</code>) — precisa da <code>SUPABASE_MANAGEMENT_TOKEN</code> configurada na Vercel pra funcionar de verdade. Sem ela, o botão Salvar não vai persistir.
        </div>
      </Card>
    </>
  );
}
