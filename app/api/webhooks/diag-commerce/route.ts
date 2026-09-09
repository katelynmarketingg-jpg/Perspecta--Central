import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// DIAGNÓSTICO TEMPORÁRIO — não expõe chaves, só host e contagens. Remover depois.
export async function GET() {
  const url = (process.env.COMMERCE_SUPABASE_URL || "").replace(/\/+$/, "");
  const svc = process.env.COMMERCE_SUPABASE_SERVICE_ROLE_KEY || "";
  const anon = process.env.COMMERCE_SUPABASE_ANON_KEY || "";
  const host = (() => { try { return new URL(url).host; } catch { return "(url inválida)"; } })();
  const out: any = {
    host,
    temUrl: Boolean(url), temService: Boolean(svc), temAnon: Boolean(anon),
    serviceLen: svc.length, anonLen: anon.length,
  };
  const h = { apikey: svc, Authorization: `Bearer ${svc}` };
  try {
    const r = await fetch(`${url}/rest/v1/tenants?select=name,slug&limit=100`, { headers: h, cache: "no-store" });
    out.tenantsStatus = r.status;
    const t = await r.text();
    try { const j = JSON.parse(t); out.tenantsCount = Array.isArray(j) ? j.length : null; out.tenantsAmostra = Array.isArray(j) ? j.slice(0, 5).map((x: any) => x.name || x.slug) : t.slice(0, 200); }
    catch { out.tenantsRaw = t.slice(0, 200); }
  } catch (e: any) { out.tenantsErro = e?.message || "rede"; }
  try {
    const r = await fetch(`${url}/auth/v1/admin/users?per_page=100`, { headers: h, cache: "no-store" });
    out.usersStatus = r.status;
    const t = await r.text();
    try {
      const j = JSON.parse(t);
      const users = Array.isArray(j) ? j : j?.users || [];
      out.usersCount = users.length;
      out.usersAmostra = users.slice(0, 8).map((u: any) => ({ email: u.email, empresa: u?.user_metadata?.empresa || null }));
    } catch { out.usersRaw = t.slice(0, 200); }
  } catch (e: any) { out.usersErro = e?.message || "rede"; }
  return NextResponse.json(out);
}
