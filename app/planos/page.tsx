import { Icon } from "@/components/ui";
import SimuladorPlanos from "@/components/SimuladorPlanos";
import { getSistemas } from "@/lib/data";
import { nomeCurto } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Planos() {
  const sistemas = await getSistemas();
  const sisSimples = sistemas.map((s) => ({ id: s.id, nome: nomeCurto(s.nome), cor: s.cor }));

  return (
    <>
      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>Monte um plano: escolha o <b>sistema</b>, os <b>insumos</b> (logins, armazenamento) e o <b>preço de venda</b> — o Central calcula <b>lucro e margem</b> na hora. O custo começa em R$ 0 (sua infra é quase toda gratuita hoje); ajuste em <b>"custos base"</b> se quiser ratear o Render.</span>
      </div>

      <SimuladorPlanos sistemas={sisSimples} />
    </>
  );
}
