import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/whisper";
import { runAudit, getAuditorModelName } from "@/lib/auditor";
import { mapLLMOutputToFrontend, generateAuditMetadata } from "@/lib/mapping";
import { saveCase, updateCase, saveAudio } from "@/lib/local-storage";
import { getPromptVersion } from "@/lib/prompt";
import { pseudonymize } from "@/lib/pseudonymizer";
import type { AuditCase } from "@/lib/types";

function getFileExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  return ext && ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext) ? ext : "webm";
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio") as File | null;
    const report = formData.get("report") as string | null;
    const preinformeRaw = formData.get("preinforme") as string | null;
    const preinforme =
      preinformeRaw && preinformeRaw.trim().length >= 10
        ? preinformeRaw.trim()
        : undefined;

    const startedAt = Date.now();
    const usedPreinforme = Boolean(preinforme);

    console.log("=== PIPELINE DE AUDITORÍA INICIADO ===");
    console.log("- Audio:", audio ? `${audio.name} (${audio.size} bytes)` : "FALTANTE");
    console.log("- Report length:", report ? report.length : "FALTANTE");
    console.log("- Preinforme:", usedPreinforme ? `${preinforme!.length} chars` : "no incluido");

    if (!audio || !(audio instanceof File)) {
      return NextResponse.json(
        { message: "Archivo de audio faltante o inválido." },
        { status: 400 }
      );
    }

    if (!report || typeof report !== "string" || report.trim().length < 1) {
      return NextResponse.json(
        { message: "Informe faltante o vacío." },
        { status: 400 }
      );
    }

    const audioBuffer = Buffer.from(await audio.arrayBuffer());

    console.log("Paso 2: Transcribiendo con Groq Whisper...");
    const transcriptionData = await transcribeAudio(audio);
    console.log("Transcripción completada:", transcriptionData.text.length, "chars");

    console.log("Paso 3: Seudonimizando textos...");
    const { text: safeReport, tokenCount: reportTokens } = pseudonymize(report);
    let safePreinforme: string | undefined;
    let preinformeTokens = 0;
    if (preinforme) {
      const { text, tokenCount } = pseudonymize(preinforme);
      safePreinforme = text;
      preinformeTokens = tokenCount;
    }
    const pseudonymizedTokens = reportTokens + preinformeTokens;
    if (pseudonymizedTokens > 0) {
      console.log(`Seudonimización: ${pseudonymizedTokens} tokens PHI reemplazados.`);
    }

    console.log(`Paso 4: Auditando con LLM (modo ${usedPreinforme ? "triple" : "dual"})...`);
    const auditResult = await runAudit(
      transcriptionData.text,
      safeReport,
      safePreinforme
    );
    console.log("Auditoría completada:", auditResult.discrepancias.length, "discrepancias");

    const discrepancies = mapLLMOutputToFrontend(
      auditResult,
      report,
      transcriptionData.segments,
      transcriptionData.duration
    );

    const metadata = generateAuditMetadata(
      auditResult,
      discrepancies,
      getPromptVersion(usedPreinforme),
      transcriptionData.duration,
      audio.name,
      audio.size,
      Date.now() - startedAt,
      getAuditorModelName(),
      pseudonymizedTokens,
      usedPreinforme
    );

    console.log("Paso 5: Guardando caso...");
    const caseData: Omit<AuditCase, "id"> = {
      report,
      transcription: transcriptionData.text,
      ...(preinforme && { preinforme }),
      discrepancies,
      metadata,
      audioUrl: "",
      createdAt: new Date().toISOString(),
    };

    const caseId = await saveCase(caseData);

    const ext = getFileExtension(audio.name);
    const audioUrl = await saveAudio(caseId, audioBuffer, ext, audio.type || "audio/" + ext);
    await updateCase(caseId, { audioUrl });

    console.log("=== PIPELINE COMPLETADO: /audit/" + caseId + " ===");

    return NextResponse.json({ caseId, success: true });
  } catch (error) {
    console.error("Error en pipeline de auditoría:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
