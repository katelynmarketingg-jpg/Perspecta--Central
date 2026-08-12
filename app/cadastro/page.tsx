import { getSistemas, getPlanos } from "@/lib/data";
import { Onboarding } from "@/components/Onboarding";

export const dynamic = "force-dynamic";

export default async function Cadastro() {
  const sistemas = (await getSistemas()).map((s) => ({ id: s.id, nome: s.nome, cor: s.cor }));
  const planos = getPlanos();
  return <Onboarding sistemas={sistemas} planos={planos} />;
}
