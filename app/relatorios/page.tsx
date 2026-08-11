import { Icon } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function Relatorios() {
  return (
    <div className="card">
      <div className="placeholder">
        <div className="pi"><Icon path='<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' size={24} /></div>
        <h3>Relatórios</h3>
        <p>Relatórios por sistema ou geral, com filtro de período, exportáveis em PDF/CSV. Tipos: financeiro, clientes/crescimento, uso/consumo, acessos e suporte. Entra na próxima fase, sobre os dados já conectados.</p>
      </div>
    </div>
  );
}
