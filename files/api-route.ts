/**
 * API Route: POST /api/audit
 *
 * ESTADO: MOCK TEMPORAL
 *
 * Esta es una implementación stub que devuelve un caseId falso después de
 * una pausa simulada. Sirve para que la UI de upload funcione end-to-end
 * durante la fase de demo.
 *
 * TODO (próximo paso del roadmap):
 * - Validar input con zod (audio y report).
 * - Seudonimizar el informe antes de enviar a APIs externas.
 * - Subir audio a Firebase Storage.
 * - Llamar a Whisper API para obtener transcripción de referencia.
 * - Llamar a Claude API con el prompt de `prompts/auditor-v1.0.md`.
 * - Guardar caso en Firestore con metadata de auditoría.
 * - Devolver caseId real.
 *
 * Ver docs/05-roadmap.md para prioridades.
 */

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const report = formData.get("report");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { message: "Archivo de audio faltante o inválido." },
        { status: 400 }
      );
    }

    if (!report || typeof report !== "string" || report.trim().length < 50) {
      return NextResponse.json(
        { message: "Informe faltante o demasiado corto." },
        { status: 400 }
      );
    }

    // Simular procesamiento
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Por ahora devolvemos un caseId estático. La página /audit usa mocks
    // hardcodeados y ignora este id.
    return NextResponse.json({ caseId: "demo-case-001" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error desconocido.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
