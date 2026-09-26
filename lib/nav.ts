export type NavItem = { href: string; label: string; icon: string; badge?: "suporte" | "pagamentos" | "convites" };
export type NavGroup = { label: string; items: NavItem[] };

// Menu organizado pelas tarefas do dono da Perspecta, na ordem do dia a dia:
// ver o panorama → vender/ativar clientes → receber e controlar dinheiro →
// manter os sistemas rodando → ajustes que mudam pouco.
export const NAV: NavGroup[] = [
  {
    label: "Início",
    items: [
      { href: "/", label: "Visão geral", icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' },
    ],
  },
  {
    label: "Clientes & vendas",
    items: [
      { href: "/convites", label: "Novo cliente", icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M19 8v6M16 11h6"/>', badge: "convites" },
      { href: "/clientes", label: "Carteira de clientes", icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 20a5.5 5.5 0 0 0-3-4.9"/>' },
      { href: "/planos", label: "Planos & cupons", icon: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.2"/>' },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/pagamentos", label: "Cobranças", icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>', badge: "pagamentos" },
      { href: "/custos", label: "Custos & despesas", icon: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
      { href: "/relatorios", label: "Relatórios", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/acessos", label: "Acessos & logins", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M17 11l2 2 4-4"/>' },
      { href: "/consumos", label: "Uso & limites", icon: '<path d="M3 12h4l3 8 4-16 3 8h4"/>' },
      { href: "/sistemas", label: "Sistemas", icon: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r=".6" fill="currentColor"/><circle cx="7" cy="17" r=".6" fill="currentColor"/>' },
      { href: "/seguranca", label: "Segurança & alertas", icon: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>' },
      { href: "/suporte", label: "Suporte", icon: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', badge: "suporte" },
    ],
  },
  {
    label: "Ajustes",
    items: [
      { href: "/termos", label: "Termos de uso", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>' },
      { href: "/config", label: "Configurações", icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>' },
      { href: "/dados", label: "Diagnóstico de dados", icon: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>' },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/": { title: "Visão geral", sub: "O panorama da Perspecta: clientes, dinheiro, custos e o que precisa de você" },
  "/convites": { title: "Novo cliente", sub: "Gere o convite e acompanhe cada cliente: 1º acesso → teste grátis → pagando" },
  "/clientes": { title: "Carteira de clientes", sub: "Todas as empresas de todos os sistemas: contato, plano, valor e situação" },
  "/planos": { title: "Planos & cupons", sub: "O que você vende: simule preço × custo, salve planos e crie cupons" },
  "/pagamentos": { title: "Cobranças", sub: "Quem paga, quem está em teste, quem atrasou — e o botão de cobrar" },
  "/custos": { title: "Custos & despesas", sub: "Quanto custa manter tudo rodando: infra hoje × previsto e suas despesas" },
  "/relatorios": { title: "Relatórios", sub: "Receita, custo e lucro — exporte em CSV ou PDF" },
  "/acessos": { title: "Acessos & logins", sub: "Criar acesso direto em cada sistema, gerenciar logins e ver o histórico" },
  "/consumos": { title: "Uso & limites", sub: "Quanto cada serviço e cada cliente já usa do limite" },
  "/sistemas": { title: "Sistemas", sub: "Onde cada um roda, banco de dados, custo e saúde" },
  "/seguranca": { title: "Segurança & alertas", sub: "Inadimplência, limites, acessos suspeitos e bugs" },
  "/suporte": { title: "Suporte", sub: "Seus chamados: problemas, sugestões, erros e dúvidas" },
  "/termos": { title: "Termos de uso", sub: "O termo que cada cliente aceita no primeiro acesso" },
  "/config": { title: "Configurações", sub: "Integrações, provedor de pagamento e preços de referência" },
  "/dados": { title: "Diagnóstico de dados", sub: "Onde estão as tabelas de clientes e logins de cada sistema" },
};
