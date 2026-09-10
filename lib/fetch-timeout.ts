// fetch com timeout: se um serviço externo (ex.: Render dormindo) demora demais,
// a gente desiste rápido em vez de deixar a PÁGINA INTEIRA pendurada até o limite
// de 60s. Melhor mostrar "conectando…" na hora do que travar tudo.
export async function fetchT(url: string, opts: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}
