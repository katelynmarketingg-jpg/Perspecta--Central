import { Icon } from "@/components/ui";
import AcessosCreator from "@/components/AcessosCreator";
import { getSistemas } from "@/lib/data";
import { creatorMe, getCreatorOrgs, creatorConfigured } from "@/lib/integrations/creator";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Acessos() {
  const [sistemas, me, orgsRes] = await Promise.all([
    getSistemas(),
    creatorConfigured() ? creatorMe() : Promise.resolve({ ok: false, superadmin: false, erro: "Creator não configurado" }),
    creatorConfigured() ? getCreatorOrgs() : Promise.resolve({ orgs: null as any[] | null, erro: "Creator não configurado" }),
  ]);
  const creator = sistemas.find((s) => s.id === "creator");
  const cor = creator?.cor || "var(--accent)";

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>
          Gerencie os <b>acessos de cada sistema</b> em um lugar só. O que você criar aqui é criado <b>de verdade</b> no sistema, e a lista é lida <b>ao vivo</b> (mudou lá, aparece aqui). Começando pelo <b>Creator</b>; os outros sistemas entram em seguida.
        </span>
      </div>

      <AcessosCreator me={me} orgs={orgsRes.orgs} orgsErro={orgsRes.erro} cor={cor} />
    </>
  );
}
