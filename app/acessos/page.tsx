import { Icon, Kpi } from "@/components/ui";
import AcessosCreator from "@/components/AcessosCreator";
import { getSistemas } from "@/lib/data";
import { creatorMe, getCreatorOrgs, getCreatorReceita, creatorConfigured } from "@/lib/integrations/creator";
import { BRL } from "@/lib/format";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Acessos() {
  const [sistemas, me, orgsRes, recRes] = await Promise.all([
    getSistemas(),
    creatorConfigured() ? creatorMe() : Promise.resolve({ ok: false, superadmin: false, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorReceita() : Promise.resolve({ receita: null }),
  ]);
  const creator = sistemas.find((s) => s.id === "creator");
  const cor = creator?.cor || "var(--accent)";
  const r = recRes.receita;

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Gerencie os <b>acessos de cada sistema</b> em um lugar só. O que você criar aqui é criado <b>de verdade</b> no sistema, e a lista é lida <b>ao vivo</b> (mudou lá, aparece aqui). Começando pelo <b>Creator</b>; os outros sistemas entram em seguida.
        </span>
      </div>

      {r && (
        <div className="grid-kpi">
          <Kpi icon='<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' k="Receita/mês (Creator)" v={BRL(r.mrr)} />
          <Kpi icon='<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>' k="Previsto (se testes virarem)" v={BRL(r.previsto)} />
          <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Pagantes" v={r.pagantes} />
          <Kpi icon='<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>' k="Em teste" v={r.emTeste} />
        </div>
      )}

      <AcessosCreator me={me} orgs={orgsRes.orgs} orgsErro={orgsRes.erro} cor={cor} />
    </>
  );
}
