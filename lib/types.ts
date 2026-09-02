// Fonte de um dado exibido: ao vivo (integração), estimativa manual, ou mock (sem chave)
export type Source = "live" | "manual" | "mock";

export type Sistema = {
  id: string;
  nome: string;
  cor: string;
  url: string;
  repo: string;
  host: "Vercel" | "Render" | "Firebase";
  supabaseRef: string | null; // null = não usa Supabase (ex.: Creator/SQLite)
  status: "operacional" | "degradado" | "com_erro" | "sem_dados";
  statusSource: Source;
  uptime: number;
  versao: string;
  ultimoDeploy: { estado: "sucesso" | "erro"; quando: string } | null;
  bugs: { t: string; sev: "alta" | "media" | "baixa"; st: string; d: string }[];
  // Storage real (MB) do projeto quando vem ao vivo do Supabase; ausente = usar estimativa.
  storageLiveMb?: number;
  // Onde o banco de dados desse sistema vive de verdade (ex.: "Firebase Realtime Database",
  // "Supabase (Postgres)", "nenhum"). Vem de central.sistemas — texto livre, já pronto pra exibir.
  banco?: string | null;
};

export type Plano = {
  id: string; sis: string; nome: string; valor: number;
  storage: number; logins: number; registros: number;
};

export type Empresa = {
  id: string; nome: string; email: string; sis: string; plano: string;
  adeptos: number; status: "ativo" | "inad" | "pend" | "canc"; venc: string;
  usoStorage: number; usoReg: number; usoLogins: number;
  // cobrança / carência
  carenciaDias?: number; carenciaRestante?: number | null;
};

export type Custo = {
  sis: string | null; // null = custo geral (não atribuído a um sistema)
  nome: string;
  valor: number;
  fonte: "Supabase" | "Vercel" | "Render" | "Anthropic" | "Outro";
  source: Source;
};

export type Pagamento = {
  id: string; emp: string; valor: number;
  status: "pago" | "falhou" | "vencido" | "pendente";
  metodo: string; data: string; motivo?: string;
  tentativas?: { data: string; resultado: string }[];
};

export type LoginAttempt = {
  emp: string; usuario: string; sis: string;
  resultado: "sucesso" | "falha"; motivo?: string; quando: string; ip: string;
};

export type Ticket = {
  id: string; emp: string; sis: string; subj: string; prev: string;
  prio: "alta" | "media" | "baixa"; st: "aberto" | "em_andamento" | "resolvido";
};
