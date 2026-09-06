import { NextResponse } from "next/server";
import { historicoUso } from "@/lib/uso-consumo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sistemaId = url.searchParams.get("sistemaId");
  const empresaRef = url.searchParams.get("empresaRef");
  const metrica = url.searchParams.get("metrica");
  if (!sistemaId || !empresaRef || !metrica) return NextResponse.json({ error: "Informe sistemaId, empresaRef e metrica." }, { status: 400 });
  const historico = await historicoUso(sistemaId, empresaRef, metrica, 60);
  return NextResponse.json({ historico });
}
