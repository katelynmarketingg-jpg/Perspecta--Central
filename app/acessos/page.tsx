import { Icon } from "@/components/ui";
import AcessosView from "@/components/AcessosView";
import { getEmpresas, getLoginAttempts, sysById } from "@/lib/data";
import { nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Acessos() {
  const empresas = getEmpresas();
  const attempts = getLoginAttempts();

  const groups = empresas
    .map((e) => {
      const atts = attempts.filter((a) => a.emp === e.id);
      if (atts.length === 0) return null;
      const sys = sysById(e.sis);
      return {
        id: e.id,
        nome: e.nome,
        cor: sys?.cor || "var(--accent)",
        sisNome: nomeCurto(sys?.nome || ""),
        ultima: atts[atts.length - 1].quando,
        falhas: atts.filter((a) => a.resultado === "falha").length,
        ativos: atts.filter((a) => a.resultado === "sucesso").length,
        attempts: atts.map((a) => ({ usuario: a.usuario, sis: a.sis, resultado: a.resultado, motivo: a.motivo, quando: a.quando, ip: a.ip })),
      };
    })
    .filter(Boolean) as any[];

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Cada sistema grava suas tentativas de login (sucesso/falha + motivo) numa tabela <b>login_attempts</b>; o Central lê via Supabase (ou API do sistema, para os que não usam Supabase, como o Creator). Enquanto não conectado, mostra <b>exemplos</b>.</span>
      </div>
      <AcessosView groups={groups} />
    </>
  );
}
