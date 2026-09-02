import { NextResponse } from "next/server";
import { getWebhookSecret, assinaturaValida, registrarEvento, marcarProcessado, processarEvento } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// PÚBLICA — é assim que CADA SISTEMA PERSPECTA avisa o Central de um evento.
// Contrato:
//   POST /api/webhooks/<sistema_id>
//   Header  X-Perspecta-Signature: HMAC-SHA256(corpo, webhook_secret do sistema), hex
//   Header  X-Idempotency-Key: qualquer string única por evento (evita duplicar em retry)
//   Body    { "tipo": "login.novo" | "cadastro.novo" | "pagamento.confirmado" |
//                     "limite.atingido" | "acesso.suspeito" | "suporte.mensagem",
//             "empresa_ref": "id da empresa no sistema de origem",
//             "dados": { ...específico de cada tipo } }
// Resposta: sempre 200 se a assinatura bater (mesmo que o processamento
// falhe depois) — evita retry infinito do lado do sistema-cliente; o motivo
// real de qualquer falha fica em central.webhook_eventos.erro.
export async function POST(req: Request, { params }: { params: { sistema: string } }) {
  const sistemaId = params.sistema;
  const corpoRaw = await req.text();
  let body: any = null;
  try { body = JSON.parse(corpoRaw); } catch { return NextResponse.json({ error: "Corpo inválido (JSON esperado)." }, { status: 400 }); }

  const segredo = await getWebhookSecret(sistemaId);
  if (!segredo) return NextResponse.json({ error: `Sistema "${sistemaId}" não configurado (sem webhook_secret).` }, { status: 404 });

  const assinatura = req.headers.get("x-perspecta-signature");
  const idempotencyKey = req.headers.get("x-idempotency-key");
  if (!idempotencyKey) return NextResponse.json({ error: "Falta o header X-Idempotency-Key." }, { status: 400 });

  const valida = assinaturaValida(corpoRaw, assinatura, segredo);
  if (!valida) return NextResponse.json({ error: "Assinatura inválida." }, { status: 401 });

  const { tipo, dados } = body || {};
  if (!tipo) return NextResponse.json({ error: "Falta o campo 'tipo'." }, { status: 400 });

  const reg = await registrarEvento(sistemaId, tipo, body, idempotencyKey, valida);
  if (!reg.ok) return NextResponse.json({ error: "Não foi possível registrar o evento." }, { status: 500 });
  if (reg.duplicado) return NextResponse.json({ recebido: true, duplicado: true });

  const r = await processarEvento(sistemaId, tipo, dados);
  await marcarProcessado(idempotencyKey, r.ok ? undefined : r.erro);

  return NextResponse.json({ recebido: true });
}
