import type { Sistema, Plano, Empresa, Custo, Pagamento, LoginAttempt, Ticket } from "./types";

const GB = 1024;

// Os 6 sistemas reais da Perspecta. supabaseRef aponta para o projeto Supabase
// real quando o sistema usa Supabase; Commerce e Juris compartilham o mesmo projeto.
export const sistemas: Sistema[] = [
  { id: "commerce", nome: "Perspecta Commerce", cor: "#c9954f", url: "perspecta-commerce.vercel.app", repo: "perspecta-commerce", host: "Vercel", supabaseRef: "ndzdhseravwdcdfuroda", status: "sem_dados", statusSource: "mock", uptime: 99.92, versao: "1.8.0", ultimoDeploy: { estado: "sucesso", quando: "há 2 dias" }, bugs: [] },
  { id: "juris", nome: "Perspecta Juris", cor: "#d98a52", url: "perspecta-juris.onrender.com", repo: "perspecta-juris", host: "Render", supabaseRef: "ndzdhseravwdcdfuroda", status: "sem_dados", statusSource: "mock", uptime: 99.97, versao: "2.4.1", ultimoDeploy: null, bugs: [] },
  { id: "creator", nome: "Perspecta Creator", cor: "#e0713a", url: "saas-agency-k9ft.onrender.com", repo: "perspecta-creator", host: "Render", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.40, versao: "3.1.2", ultimoDeploy: null, bugs: [] },
  { id: "bistro", nome: "Perspecta Bistro", cor: "#a64f2e", url: "perspecta-bistro.web.app", repo: "perspecta-bistro", host: "Firebase", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.88, versao: "0.6.2", ultimoDeploy: { estado: "sucesso", quando: "há 5 dias" }, bugs: [] },
  { id: "hub", nome: "Perspecta Hub (CRM)", cor: "#8a6f4f", url: "perspectahub.com.br", repo: "perspecta-hub-crm", host: "Vercel", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.95, versao: "0.4.0", ultimoDeploy: { estado: "sucesso", quando: "há 1 dia" }, bugs: [] },
];

// Planos-modelo por sistema (ponto de partida do onboarding). Ajuste os valores reais.
export const planos: Plano[] = [
  { id: "p1", sis: "juris", nome: "Essencial", valor: 197, storage: 5 * GB, logins: 5, registros: 2000 },
  { id: "p2", sis: "juris", nome: "Pro", valor: 497, storage: 20 * GB, logins: 15, registros: 10000 },
  { id: "p3", sis: "juris", nome: "Enterprise", valor: 997, storage: 100 * GB, logins: 50, registros: 100000 },
  { id: "p4", sis: "commerce", nome: "Essencial", valor: 149, storage: 3 * GB, logins: 4, registros: 1500 },
  { id: "p5", sis: "commerce", nome: "Pro", valor: 397, storage: 15 * GB, logins: 12, registros: 8000 },
  { id: "p7", sis: "creator", nome: "Starter", valor: 129, storage: 5 * GB, logins: 3, registros: 3000 },
  { id: "p8", sis: "creator", nome: "Studio", valor: 349, storage: 25 * GB, logins: 10, registros: 15000 },
  { id: "p9", sis: "creator", nome: "Agência", valor: 699, storage: 60 * GB, logins: 30, registros: 60000 },
  { id: "p12", sis: "bistro", nome: "Casa", valor: 189, storage: 8 * GB, logins: 6, registros: 4000 },
  { id: "p13", sis: "hub", nome: "Hub Pro", valor: 259, storage: 12 * GB, logins: 8, registros: 6000 },
];

// Clientes, cobranças, logins, tickets e custos: começam VAZIOS — nada de dado
// inventado. Vão sendo preenchidos com o que é real dos bancos conectados
// (Supabase, Firebase) e com o que a equipe cadastrar no Central.
export const empresas: Empresa[] = [];
export const custos: Custo[] = [];
export const pagamentos: Pagamento[] = [];
export const loginAttempts: LoginAttempt[] = [];
export const tickets: Ticket[] = [];

// Série histórica (gráficos). Zerada até haver dados financeiros reais.
export const serie = {
  meses: ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
  receita: [0, 0, 0, 0, 0, 0, 0],
  despesa: [0, 0, 0, 0, 0, 0, 0],
  growth: [0, 0, 0, 0, 0, 0, 0],
};
