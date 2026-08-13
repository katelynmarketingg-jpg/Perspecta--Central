import type { Sistema, Plano, Empresa, Custo, Pagamento, LoginAttempt, Ticket } from "./types";

const GB = 1024;

// Os 7 sistemas do spec. status/statusSource ficam "sem_dados"/"mock" enquanto
// as integrações (Supabase Mgmt / Vercel) não estão configuradas.
// Os 6 sistemas reais da Perspecta. supabaseRef aponta para o projeto Supabase
// real quando o sistema usa Supabase; Commerce e Juris compartilham o mesmo projeto.
export const sistemas: Sistema[] = [
  { id: "commerce", nome: "Perspecta Commerce", cor: "#c9954f", url: "perspecta-commerce.vercel.app", repo: "perspecta-commerce", host: "Vercel", supabaseRef: "ndzdhseravwdcdfuroda", status: "sem_dados", statusSource: "mock", uptime: 99.92, versao: "1.8.0", ultimoDeploy: { estado: "sucesso", quando: "há 2 dias" }, bugs: [{ t: "Sincronização de estoque com atraso de ~3min", sev: "media", st: "aberto", d: "há 1 dia" }] },
  { id: "central", nome: "Perspecta Central", cor: "#e0713a", url: "perspecta-central.vercel.app", repo: "perspecta-central", host: "Vercel", supabaseRef: null, status: "operacional", statusSource: "mock", uptime: 100, versao: "0.1.0", ultimoDeploy: { estado: "sucesso", quando: "hoje" }, bugs: [] },
  { id: "juris", nome: "Perspecta Juris", cor: "#d98a52", url: "perspecta-juris.onrender.com", repo: "perspecta-juris", host: "Render", supabaseRef: "ndzdhseravwdcdfuroda", status: "sem_dados", statusSource: "mock", uptime: 99.97, versao: "2.4.1", ultimoDeploy: null, bugs: [{ t: "Exportação de PDF trava em processos > 200 págs", sev: "alta", st: "aberto", d: "há 2 dias" }] },
  { id: "creator", nome: "Perspecta Creator", cor: "#e0713a", url: "não publicado · só no GitHub", repo: "perspecta-creator", host: "Vercel", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.40, versao: "3.1.2", ultimoDeploy: null, bugs: [] },
  { id: "bistro", nome: "Perspecta Bistro", cor: "#a64f2e", url: "perspecta-bistro.web.app", repo: "perspecta-bistro", host: "Firebase", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.88, versao: "0.6.2", ultimoDeploy: { estado: "sucesso", quando: "há 5 dias" }, bugs: [] },
  { id: "hub", nome: "Perspecta Hub (CRM)", cor: "#8a6f4f", url: "perspectahub.com.br", repo: "perspecta-hub-crm", host: "Vercel", supabaseRef: null, status: "sem_dados", statusSource: "mock", uptime: 99.95, versao: "0.4.0", ultimoDeploy: { estado: "sucesso", quando: "há 1 dia" }, bugs: [] },
];

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

export const empresas: Empresa[] = [
  { id: "e1", nome: "Advocacia Menezes", email: "contato@menezesadv.com.br", sis: "juris", plano: "p2", adeptos: 14, status: "ativo", venc: "12/08", usoStorage: 17.2 * GB, usoReg: 8600, usoLogins: 13 },
  { id: "e2", nome: "Ferreira & Costa", email: "adm@ferreiracosta.adv.br", sis: "juris", plano: "p3", adeptos: 38, status: "inad", venc: "28/07", usoStorage: 91 * GB, usoReg: 74000, usoLogins: 41, carenciaDias: 7, carenciaRestante: 2 },
  { id: "e3", nome: "Souza Advogados", email: "contato@souzaadv.com.br", sis: "juris", plano: "p1", adeptos: 5, status: "ativo", venc: "22/08", usoStorage: 1.6 * GB, usoReg: 640, usoLogins: 4 },
  { id: "e4", nome: "Boutique Lila", email: "financeiro@lila.com.br", sis: "commerce", plano: "p4", adeptos: 6, status: "ativo", venc: "05/08", usoStorage: 1.2 * GB, usoReg: 900, usoLogins: 4 },
  { id: "e5", nome: "Mercado Bom Preço", email: "ti@bompreco.com.br", sis: "commerce", plano: "p5", adeptos: 22, status: "ativo", venc: "18/08", usoStorage: 10 * GB, usoReg: 6100, usoLogins: 11 },
  { id: "e7", nome: "Gelo Patrulha", email: "contato@gelopatrulha.com", sis: "creator", plano: "p8", adeptos: 9, status: "ativo", venc: "15/08", usoStorage: 19 * GB, usoReg: 11200, usoLogins: 8 },
  { id: "e8", nome: "Marcelo Lemos Advocacia", email: "marcelo@lemosadv.com.br", sis: "creator", plano: "p9", adeptos: 24, status: "ativo", venc: "20/08", usoStorage: 38 * GB, usoReg: 41000, usoLogins: 22 },
  { id: "e9", nome: "Perfume Prateado", email: "adm@perfumeprateado.com", sis: "creator", plano: "p7", adeptos: 3, status: "pend", venc: "10/08", usoStorage: 2.1 * GB, usoReg: 1400, usoLogins: 2 },
  { id: "e12", nome: "Cantina do Porto", email: "contato@cantinaporto.com.br", sis: "bistro", plano: "p12", adeptos: 7, status: "ativo", venc: "14/08", usoStorage: 3.4 * GB, usoReg: 2600, usoLogins: 6 },
  { id: "e13", nome: "Studio Vega", email: "ola@studiovega.com.br", sis: "hub", plano: "p13", adeptos: 8, status: "ativo", venc: "16/08", usoStorage: 5.1 * GB, usoReg: 3400, usoLogins: 7 },
];

// Custos: Supabase seria "live" quando a integração estiver configurada; hoje mock/estimado.
export const custos: Custo[] = [
  { sis: "commerce", nome: "Supabase (projeto Commerce)", valor: 98, fonte: "Supabase", source: "mock" },
  { sis: "commerce", nome: "Vercel (hospedagem)", valor: 40, fonte: "Vercel", source: "mock" },
  { sis: "juris", nome: "Render (web service)", valor: 85, fonte: "Render", source: "manual" },
  { sis: "creator", nome: "Render (web service)", valor: 92, fonte: "Render", source: "manual" },
  { sis: "bistro", nome: "Supabase (projeto Bistro)", valor: 45, fonte: "Supabase", source: "mock" },
  { sis: "hub", nome: "Supabase (projeto Hub)", valor: 50, fonte: "Supabase", source: "mock" },
  { sis: null, nome: "Anthropic / Claude (IA)", valor: 120, fonte: "Anthropic", source: "manual" },
  { sis: null, nome: "Resend (e-mail)", valor: 48, fonte: "Outro", source: "manual" },
];

export const pagamentos: Pagamento[] = [
  { id: "pg1", emp: "e1", valor: 497, status: "pago", metodo: "Cartão", data: "08/08" },
  { id: "pg2", emp: "e2", valor: 997, status: "vencido", metodo: "Boleto", data: "28/07", motivo: "Boleto não compensado há 13 dias", tentativas: [{ data: "28/07", resultado: "gerado" }, { data: "04/08", resultado: "sem baixa" }] },
  { id: "pg3", emp: "e5", valor: 397, status: "pago", metodo: "Cartão", data: "06/08" },
  { id: "pg4", emp: "e8", valor: 699, status: "falhou", metodo: "Cartão", data: "07/08", motivo: "Cartão recusado — saldo insuficiente", tentativas: [{ data: "07/08", resultado: "recusado" }, { data: "09/08", resultado: "recusado" }] },
  { id: "pg6", emp: "e9", valor: 129, status: "pendente", metodo: "Cartão", data: "10/08", motivo: "Aguardando 1º pagamento" },
  { id: "pg7", emp: "e7", valor: 349, status: "pago", metodo: "Cartão", data: "05/08" },
];

export const loginAttempts: LoginAttempt[] = [
  { emp: "e2", usuario: "joao@ferreiracosta.adv.br", sis: "juris", resultado: "falha", motivo: "senha incorreta", quando: "11/08 09:42", ip: "189.40.12.7" },
  { emp: "e2", usuario: "joao@ferreiracosta.adv.br", sis: "juris", resultado: "falha", motivo: "senha incorreta", quando: "11/08 09:43", ip: "189.40.12.7" },
  { emp: "e2", usuario: "joao@ferreiracosta.adv.br", sis: "juris", resultado: "sucesso", quando: "11/08 09:45", ip: "189.40.12.7" },
  { emp: "e1", usuario: "ana@menezesadv.com.br", sis: "juris", resultado: "sucesso", quando: "11/08 08:10", ip: "201.17.9.55" },
  { emp: "e8", usuario: "marcelo@lemosadv.com.br", sis: "creator", resultado: "falha", motivo: "usuário bloqueado", quando: "10/08 22:01", ip: "45.7.201.9" },
  { emp: "e8", usuario: "equipe@lemosadv.com.br", sis: "creator", resultado: "sucesso", quando: "11/08 07:30", ip: "45.7.201.9" },
  { emp: "e5", usuario: "ti@bompreco.com.br", sis: "commerce", resultado: "sucesso", quando: "11/08 10:15", ip: "177.9.44.2" },
];

export const tickets: Ticket[] = [
  { id: "t1", emp: "e1", sis: "juris", subj: "Erro ao exportar processo em PDF", prev: "Quando tento gerar o PDF do processo aparece um erro…", prio: "alta", st: "aberto" },
  { id: "t2", emp: "e5", sis: "commerce", subj: "Integração com NF-e", prev: "Preciso de ajuda para configurar a emissão…", prio: "media", st: "aberto" },
  { id: "t3", emp: "e8", sis: "creator", subj: "Gráfico não carrega no primeiro acesso", prev: "O gráfico de receitas aparece vazio até eu recarregar…", prio: "alta", st: "em_andamento" },
];

export const serie = {
  meses: ["Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago"],
  receita: [12800, 13900, 14600, 15200, 16400, 17300, 18420],
  despesa: [4200, 4400, 4300, 4700, 4600, 4900, 4980],
  growth: [31, 34, 37, 39, 42, 44, 47],
};
