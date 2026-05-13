import { NextResponse } from "next/server";
import { loadCase, updateCase } from "@/lib/local-storage";
import type { AuditCase, CaseStatus } from "@/lib/types";

const VALID_STATUSES: CaseStatus[] = ["pending", "attention", "approved"];

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caseData = await loadCase(id);

    if (!caseData) {
      return NextResponse.json(
        { message: "Caso no encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(caseData);
  } catch (error) {
    console.error("Error al obtener el caso:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";

    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: CaseStatus };

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { message: "Estado inválido." },
        { status: 400 }
      );
    }

    const updates: Partial<AuditCase> = { status };
    if (status === "approved") {
      updates.approvedAt = new Date().toISOString();
    }

    await updateCase(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar el caso:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
