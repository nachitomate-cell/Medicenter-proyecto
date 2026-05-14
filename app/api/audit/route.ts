import { NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/whisper";
import { runAudit, getAuditorModelName } from "@/lib/auditor";
import { mapLLMOutputToFrontend, generateAuditMetadata } from "@/lib/mapping";
import {
  saveCase,
  updateCase,
  saveAudio,
  loadTempAudio,
  deleteTempAudio,
} from "@/lib/local-storage";
import { getPromptVersion } from "@/lib/prompt";
import { pseudonymize } from "@/lib/pseudonymizer";
import type { AuditCase } from "@/lib/types";

function validateUploadId(id: string): boolean {
  return /^[a-f0-9]{20}$/i.test(id);
}

function validateExt(ext: string): boolean {
  return ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext);
}

export async function POST(request: Request) {
  let uploadId: string | undefined;
  let uploadExt: string | undefined;

  try {
    const body = await request.json();

    uploadId = body.uploadId as string | undefined;
    uploadExt = body.uploadExt as string | undefined;
    const uploadFileName = (body.uploadFileName as string | undefined) ?? "audio";
    const uploadContentType = (body.uploadContentType as string | undefined) ?? "audio/webm";
    const report = body.report as string | undefined;
    const preinformeRaw = body.preinforme as string | undefined;
    const preinforme =
      preinformeRaw && preinformeRaw.trim().length >= 10
        ? preinformeRaw.trim()
        : undefined;
    const examType = (body.examType as string | undefined) || "Sin especificar";
    const patientCode =
      (body.patientCode as string | undefined) ||
      `ECO-${Date.now().toString(36).toUpperCase()}`;
    const technologist =
      (body.technologist as string | undefined) || "Sin especificar";
    const radiologist =
      (body.radiologist as string | undefined) || "Sin especificar";

    if (!uploadId || !validateUploadId(uploadId)) {
      return NextResponse.json(
        { message: "ID de audio inválido o faltante." },
        { status: 400 }
      );
    }
    if (!uploadExt || !validateExt(uploadExt)) {
      return NextResponse.json(
        { message: "Extensión de audio inválida." },
        { status: 400 }
      );
    }
    if (!report || typeof report !== "string" || report.trim().length < 1) {
      return NextResponse.json(
        { message: "Informe faltante o vacío." },
        { status: 400 }
      );
    }

    const startedAt = Date.now();
    const usedPreinforme = Boolean(preinforme);

    console.log("=== PIPELINE DE AUDITORÍA INICIADO ===");
    console.log("- UploadId:", uploadId, "ext:", uploadExt);
    console.log("- Report length:", report.length);
    console.log(
      "- Preinforme:",
      usedPreinforme ? `${preinforme!.length} chars` : "no incluido"
    );

    const audioBuffer = loadTempAudio(uploadId, uploadExt);
    if (!audioBuffer) {
      return NextResponse.json(
        { message: "Audio temporal no encontrado. Intente subir el archivo de nuevo." },
        { status: 400 }
      );
    }

    // Buffer is a valid BlobPart at runtime; cast needed due to ArrayBufferLike vs ArrayBuffer TS strictness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioFile = new File([audioBuffer as any], uploadFileName, {
      type: uploadContentType,
    });

    console.log(
      "Paso 2: Transcribiendo con Groq Whisper...",
      `(${audioBuffer.length} bytes)`
    );
    const transcriptionData = await transcribeAudio(audioFile);
    console.log(
      "Transcripción completada:",
      transcriptionData.text.length,
      "chars"
    );

    console.log("Paso 3: Seudonimizando textos...");
    const { text: safeReport, tokenCount: reportTokens } =
      pseudonymize(report);
    let safePreinforme: string | undefined;
    let preinformeTokens = 0;
    if (preinforme) {
      const { text, tokenCount } = pseudonymize(preinforme);
      safePreinforme = text;
      preinformeTokens = tokenCount;
    }
    const pseudonymizedTokens = reportTokens + preinformeTokens;
    if (pseudonymizedTokens > 0) {
      console.log(
        `Seudonimización: ${pseudonymizedTokens} tokens PHI reemplazados.`
      );
    }

    console.log(
      `Paso 4: Auditando con LLM (modo ${usedPreinforme ? "triple" : "dual"})...`
    );
    const auditResult = await runAudit(
      transcriptionData.text,
      safeReport,
      safePreinforme
    );
    console.log(
      "Auditoría completada:",
      auditResult.discrepancias.length,
      "discrepancias"
    );

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
      uploadFileName,
      audioBuffer.length,
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
      status: metadata.counts.critical > 0 ? "attention" : "pending",
      examType,
      patientCode,
      technologist,
      radiologist,
    };

    const caseId = await saveCase(caseData);

    const audioUrl = await saveAudio(
      caseId,
      audioBuffer,
      uploadExt,
      uploadContentType
    );
    await updateCase(caseId, { audioUrl });

    deleteTempAudio(uploadId, uploadExt);

    console.log("=== PIPELINE COMPLETADO: /audit/" + caseId + " ===");

    return NextResponse.json({ caseId, success: true });
  } catch (error) {
    console.error("Error en pipeline de auditoría:", error);
    if (uploadId && uploadExt) {
      try {
        deleteTempAudio(uploadId, uploadExt);
      } catch {
        // best-effort cleanup
      }
    }
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
