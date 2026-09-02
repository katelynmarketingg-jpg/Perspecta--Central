export type NavItem = { href: string; label: string; icon: string; badge?: "suporte" | "pagamentos" };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { href: "/", label: "Dashboard", icon: '<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>' },
      { href: "/sistemas", label: "Sistemas", icon: '<rect x="3" y="4" width="18" height="6" rx="1"/><rect x="3" y="14" width="18" height="6" rx="1"/><circle cx="7" cy="7" r=".6" fill="currentColor"/><circle cx="7" cy="17" r=".6" fill="currentColor"/>' },
      { href: "/clientes", label: "Clientes", icon: '<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M18.5 20a5.5 5.5 0 0 0-3-4.9"/>' },
      { href: "/planos", label: "Planos", icon: '<path d="M12 2l3 6 6 .5-4.5 4 1.5 6-6-3.5L6 18.5 7.5 12.5 3 8.5 9 8z"/>' },
      { href: "/consumos", label: "Consumos", icon: '<path d="M3 12h4l3 8 4-16 3 8h4"/>' },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/custos", label: "Custos & Margem", icon: '<path d="M3 3v18h18"/><path d="M7 14l3-3 3 3 4-5"/>' },
      { href: "/pagamentos", label: "Pagamentos", icon: '<rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>', badge: "pagamentos" },
    ],
  },
  {
    label: "Operação",
    items: [
      { href: "/acessos", label: "Acessos", icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="M17 11l2 2 4-4"/>' },
      { href: "/termos", label: "Termos de uso", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>' },
      { href: "/seguranca", label: "Segurança", icon: '<path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z"/>' },
      { href: "/suporte", label: "Suporte", icon: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>', badge: "suporte" },
      { href: "/relatorios", label: "Relatórios", icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>' },
      { href: "/config", label: "Configurações", icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 0 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 0 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>' },
    ],
  },
];

export const PAGE_META: Record<string, { title: string; sub: string }> = {
  "/": { title: "Dashboard Master", sub: "Central de comando de todos os sistemas" },
  "/sistemas": { title: "Sistemas", sub: "Onde cada um roda, banco de dados, custo e saúde" },
  "/clientes": { title: "Clientes / Empresas", sub: "Tenants, consumo e status" },
  "/planos": { title: "Planos", sub: "Valores, nomes e limites por sistema" },
  "/consumos": { title: "Consumos", sub: "Uso real por empresa e por sistema" },
  "/dados": { title: "Dados reais", sub: "Onde estão as tabelas de clientes e logins de cada sistema" },
  "/custos": { title: "Custos & Margem", sub: "Quanto custa manter tudo rodando" },
  "/pagamentos": { title: "Pagamentos & Cobrança", sub: "Mercado Pago, carência e inadimplência" },
  "/acessos": { title: "Acessos", sub: "Tentativas de login por empresa e usuário" },
  "/termos": { title: "Termos de uso", sub: "O termo que cada cliente aceita no primeiro acesso" },
  "/seguranca": { title: "Segurança & Alertas", sub: "Limites, inadimplência e bugs" },
  "/suporte": { title: "Suporte / Atendimento", sub: "Central de tickets" },
  "/relatorios": { title: "Relatórios", sub: "Exportação PDF e CSV" },
  "/config": { title: "Configurações", sub: "Integrações, usuários e dados" },
};
