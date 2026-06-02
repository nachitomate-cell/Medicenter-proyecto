import { NextResponse } from "next/server";
import { transcribeAudio, getTranscriptionModelName } from "@/lib/whisper";
import { runAudit, getAuditorModelName } from "@/lib/auditor";
import { mapLLMOutputToFrontend, generateAuditMetadata } from "@/lib/mapping";
import { saveCase, updateCase } from "@/lib/firestore";
import { getBucket } from "@/lib/firebase-admin";
import { getPromptVersion } from "@/lib/prompt";
import { pseudonymize } from "@/lib/pseudonymizer";
import type { AuditCase } from "@/lib/types";

function validateExt(ext: string): boolean {
  return ["mp3", "wav", "m4a", "webm", "ogg"].includes(ext);
}

export async function POST(request: Request) {
  let storagePath: string | undefined;

  try {
    const body = await request.json();

    storagePath = body.storagePath as string | undefined;
    const uploadExt = (body.uploadExt as string | undefined) ?? "webm";
    const uploadFileName = (body.uploadFileName as string | undefined) ?? "audio";
    const uploadContentType =
      (body.uploadContentType as string | undefined) ?? "audio/webm";
    const report = body.report as string | undefined;
    const preinformeRaw = body.preinforme as string | undefined;
    const preinforme =
      preinformeRaw && preinformeRaw.trim().length >= 10
        ? preinformeRaw.trim()
        : undefined;
    const preinformeRadiologoRaw = body.preinformeRadiologo as string | undefined;
    const preinformeRadiologo =
      preinformeRadiologoRaw && preinformeRadiologoRaw.trim().length >= 10
        ? preinformeRadiologoRaw.trim()
        : undefined;
    const examType = (body.examType as string | undefined) || "Sin especificar";
    const patientCode =
      (body.patientCode as string | undefined) ||
      `ECO-${Date.now().toString(36).toUpperCase()}`;
    const technologist =
      (body.technologist as string | undefined) || "Sin especificar";
    const radiologist =
      (body.radiologist as string | undefined) || "Sin especificar";
    // Duración medida en el navegador; fallback cuando el transcriptor no la
    // devuelve (p. ej. Gemini, que no entrega duración ni segmentos).
    const clientDuration =
      typeof body.audioDurationSeconds === "number" &&
      isFinite(body.audioDurationSeconds) &&
      body.audioDurationSeconds > 0
        ? Math.round(body.audioDurationSeconds)
        : undefined;

    if (!storagePath || typeof storagePath !== "string" || storagePath.trim() === "") {
      return NextResponse.json(
        { message: "storagePath de audio inválido o faltante." },
        { status: 400 }
      );
    }
    if (!validateExt(uploadExt)) {
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
    console.log("- StoragePath:", storagePath, "ext:", uploadExt);
    console.log("- Report length:", report.length);
    console.log(
      "- Preinforme:",
      usedPreinforme ? `${preinforme!.length} chars` : "no incluido"
    );

    // Step 1: Download audio from Firebase Storage
    const bucket = getBucket();
    const tempFile = bucket.file(storagePath);
    const [audioBuffer] = await tempFile.download();

    // Buffer is a valid BlobPart at runtime; cast needed due to ArrayBufferLike vs ArrayBuffer TS strictness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const audioFile = new File([audioBuffer as any], uploadFileName, {
      type: uploadContentType,
    });

    console.log(
      "Paso 2: Transcribiendo con Groq Whisper...",
      `(${audioBuffer.length} bytes)`
    );
    const transcriptionData = await transcribeAudio(audioFile, examType);
    console.log(
      "Transcripción completada:",
      transcriptionData.text.length,
      "chars"
    );

    // Duración efectiva: la del transcriptor si la entrega (Whisper), si no la
    // medida en el navegador. Evita mostrar 0:00 cuando se transcribe con Gemini.
    const effectiveDuration =
      transcriptionData.duration && transcriptionData.duration > 0
        ? transcriptionData.duration
        : clientDuration ?? 0;

    console.log("Paso 3: Seudonimizando textos (informe, transcripción y preinforme)...");
    // Seudonimizamos TODO lo que se envía al LLM y lo que se persiste/muestra:
    // informe, transcripción del audio (puede contener nombre/RUT dictados en
    // voz alta) y preinformes. Así no sale PHI hacia proveedores externos ni
    // queda PHI en reposo, y la comparación textual se ve consistente.
    const { text: safeReport, tokenCount: reportTokens } = pseudonymize(report);
    // leadingName: el dictado suele abrir con el nombre del paciente sin etiqueta.
    const { text: safeTranscription, tokenCount: transcriptionTokens } =
      pseudonymize(transcriptionData.text, { leadingName: true });

    let safePreinforme: string | undefined;
    let preinformeTokens = 0;
    if (preinforme) {
      const { text, tokenCount } = pseudonymize(preinforme);
      safePreinforme = text;
      preinformeTokens = tokenCount;
    }

    let safePreinformeRadiologo: string | undefined;
    if (preinformeRadiologo) {
      safePreinformeRadiologo = pseudonymize(preinformeRadiologo).text;
    }

    const pseudonymizedTokens =
      reportTokens + transcriptionTokens + preinformeTokens;
    if (pseudonymizedTokens > 0) {
      console.log(
        `Seudonimización: ${pseudonymizedTokens} tokens PHI reemplazados ` +
          `(informe ${reportTokens}, audio ${transcriptionTokens}, preinforme ${preinformeTokens}).`
      );
    }

    console.log(
      `Paso 4: Auditando con LLM (modo ${usedPreinforme ? "triple" : "dual"})...`
    );
    const auditResult = await runAudit(
      safeTranscription,
      safeReport,
      safePreinforme
    );
    console.log(
      "Auditoría completada:",
      auditResult.discrepancias.length,
      "discrepancias"
    );

    // Mapeamos contra el informe seudonimizado: es el texto que vio el LLM, así
    // los rangos/citas (fragmento_informe) calzan con lo que se persiste y muestra.
    const discrepancies = mapLLMOutputToFrontend(
      auditResult,
      safeReport,
      transcriptionData.segments,
      effectiveDuration
    );

    const metadata = generateAuditMetadata(
      auditResult,
      discrepancies,
      getPromptVersion(usedPreinforme),
      effectiveDuration,
      uploadFileName,
      audioBuffer.length,
      Date.now() - startedAt,
      getAuditorModelName(),
      pseudonymizedTokens,
      usedPreinforme,
      getTranscriptionModelName()
    );

    console.log("Paso 5: Guardando caso en Firestore...");
    const caseData: Omit<AuditCase, "id"> = {
      report: safeReport,
      transcription: safeTranscription,
      ...(transcriptionData.segments.length > 0 && {
        transcriptionSegments: transcriptionData.segments,
      }),
      ...(safePreinforme && { preinforme: safePreinforme }),
      ...(safePreinformeRadiologo && { preinformeRadiologo: safePreinformeRadiologo }),
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

    // Step 6: Copy audio to permanent path in Firebase Storage
    console.log("Paso 6: Guardando audio permanente en Firebase Storage...");
    const permanentPath = `audios/${caseId}.${uploadExt}`;
    const permanentFile = bucket.file(permanentPath);
    await permanentFile.save(audioBuffer, { contentType: uploadContentType });
    const [audioUrl] = await permanentFile.getSignedUrl({
      action: "read",
      expires: "2099-01-01",
    });

    await updateCase(caseId, { audioUrl });

    // Step 7: Delete temp upload (best-effort)
    try {
      await bucket.file(storagePath).delete();
    } catch {
      // best-effort cleanup
    }

    console.log("=== PIPELINE COMPLETADO: /audit/" + caseId + " ===");

    return NextResponse.json({ caseId, success: true });
  } catch (error) {
    console.error("Error en pipeline de auditoría:", error);
    const message =
      error instanceof Error ? error.message : "Error interno del servidor.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
