import { Card, Kpi, Icon } from "@/components/ui";
import { ClientesView } from "@/components/ClientesView";
import { getClientesUnificados, fontesConectadas } from "@/lib/clientes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export default async function Clientes() {
  const clientes = await getClientesUnificados();
  const fontes = fontesConectadas();

  return (
    <>
      <div className="grid-kpi">
        <Kpi icon='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' k="Empresas (suas clientes)" v={clientes.length} />
        <Kpi icon='<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/>' k="Fontes conectadas" v={fontes} />
        <Kpi icon='<path d="M12 2l3 6 6 .5-4.5 4 1.5 6-6-3.5L6 18.5 7.5 12.5 3 8.5 9 8z"/>' k="Sistemas com empresas" v={new Set(clientes.map((c) => c.sistema)).size} />
      </div>

      <div className="banner">
        <Icon path='<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>' />
        <span>As <b>empresas que usam cada sistema</b> (suas clientes): tenants do Supabase, estabelecimentos do Bistro e escritórios do Creator. O Creator mostra todos quando conectar a conta master; o Hub entra quando plugarmos o banco dele.</span>
      </div>

      {clientes.length === 0 ? (
        <Card>
          <div className="placeholder">
            <div className="pi"><Icon path='<circle cx="9" cy="8" r="3"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/>' size={24} /></div>
            <h3>Nenhum cliente encontrado ainda</h3>
            <p>Veja em <b>Dados reais</b> quais tabelas existem e me diga qual é a de clientes.</p>
          </div>
        </Card>
      ) : (
        <ClientesView clientes={clientes} />
      )}
    </>
  );
}
