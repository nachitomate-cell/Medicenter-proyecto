import { NextResponse } from "next/server";
import { loadCase } from "@/lib/local-storage";

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
