import { NextResponse } from "next/server";
import { listCases } from "@/lib/local-storage";

export async function GET() {
  try {
    const cases = await listCases();
    return NextResponse.json(cases);
  } catch (error) {
    console.error("Error al listar casos:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
