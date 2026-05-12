import type {
  LLMOutput,
  LLMDiscrepancy,
  Discrepancy,
  Severity,
  WhisperSegment,
  AuditMetadata,
} from "./types";

/**
 * Normaliza un texto para comparaciones "fuzzy".
 * Remueve espacios extra, puntuación y convierte a minúsculas.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Encuentra el rango [inicio, fin] de un fragmento dentro de un texto,
 * siendo tolerante a pequeñas diferencias de formato.
 */
function findReportRange(
  report: string,
  fragment: string
): [number, number] {
  // Intento 1: Match exacto
  const exactIdx = report.indexOf(fragment);
  if (exactIdx !== -1) {
    return [exactIdx, exactIdx + fragment.length];
  }

  // Intento 2: Match exacto ignorando case
  const lowerReport = report.toLowerCase();
  const lowerFragment = fragment.toLowerCase();
  const caseIdx = lowerReport.indexOf(lowerFragment);
  if (caseIdx !== -1) {
    return [caseIdx, caseIdx + fragment.length];
  }

  // Intento 3: Fuzzy match simplificado
  // Buscamos la secuencia de palabras del fragmento
  const words = fragment.split(/\s+/).filter((w) => w.length > 2);
  if (words.length > 0) {
    const firstWordIdx = lowerReport.indexOf(words[0].toLowerCase());
    if (firstWordIdx !== -1) {
      const lastWord = words[words.length - 1].toLowerCase();
      const lastWordIdx = lowerReport.indexOf(lastWord, firstWordIdx);
      if (lastWordIdx !== -1) {
        return [firstWordIdx, lastWordIdx + lastWord.length];
      }
    }
  }

  return [-1, -1];
}

/**
 * Estima el timestamp del audio para una discrepancia basándose en los segmentos de Whisper.
 */
function estimateAudioTimestamp(
  audioQuote: string,
  segments: WhisperSegment[]
): number {
  if (segments.length === 0) return 0;

  const normalizedQuote = normalizeText(audioQuote);
  let bestMatchIdx = 0;
  let highestScore = 0;

  // Si el quote es muy corto, no intentamos match complejo
  if (normalizedQuote.length < 5) return segments[0].start;

  segments.forEach((segment, idx) => {
    const normalizedSegment = normalizeText(segment.text);
    
    // Puntuación simple: ¿Contiene el segmento parte del quote o viceversa?
    let score = 0;
    if (normalizedSegment.includes(normalizedQuote)) score = 100;
    else if (normalizedQuote.includes(normalizedSegment)) score = 50;
    
    // Bonus por cercanía de palabras
    const quoteWords = normalizedQuote.split(" ");
    const segmentWords = normalizedSegment.split(" ");
    const commonWords = quoteWords.filter(w => segmentWords.includes(w));
    score += (commonWords.length / quoteWords.length) * 40;

    if (score > highestScore) {
      highestScore = score;
      bestMatchIdx = idx;
    }
  });

  return segments[bestMatchIdx].start;
}

/**
 * Mapea la salida del LLM al formato que espera el frontend.
 */
export function mapLLMOutputToFrontend(
  llmOutput: LLMOutput,
  report: string,
  segments: WhisperSegment[],
  audioDuration: number
): Discrepancy[] {
  const severityMap: Record<string, Severity> = {
    critico: "critical",
    advertencia: "warning",
    estilo: "style",
  };

  return llmOutput.discrepancias.map((d) => {
    const reportRange = findReportRange(report, d.fragmento_informe);
    const audioTimestamp = estimateAudioTimestamp(d.fragmento_audio, segments);

    return {
      id: d.id,
      severity: severityMap[d.severidad] || "warning",
      audioTimestamp: Math.min(audioTimestamp, audioDuration),
      audioQuote: d.fragmento_audio,
      reportQuote: d.fragmento_informe,
      reportRange,
      explanation: d.explicacion,
      confidence: d.confianza,
      type: d.tipo,
      reportSection: d.ubicacion_informe,
      ...(d.fuente && { source: d.fuente }),
      ...(d.fragmento_preinforme && { preinformeQuote: d.fragmento_preinforme }),
    };
  });
}

/**
 * Genera la metadata del caso para persistencia.
 */
export function generateAuditMetadata(
  llmOutput: LLMOutput,
  discrepancies: Discrepancy[],
  promptVersion: string,
  audioDuration: number,
  fileName: string,
  fileSize: number,
  processingMs?: number,
  modelName?: string,
  pseudonymizedTokens?: number,
  usedPreinforme?: boolean
): AuditMetadata {
  const counts = {
    critical: discrepancies.filter((d) => d.severity === "critical").length,
    warning: discrepancies.filter((d) => d.severity === "warning").length,
    style: discrepancies.filter((d) => d.severity === "style").length,
    total: discrepancies.length,
  };

  return {
    promptVersion,
    audioDurationSeconds: audioDuration,
    audioFileName: fileName,
    audioSizeBytes: fileSize,
    reasoning: llmOutput.razonamiento,
    generalObservations: llmOutput.observaciones_generales,
    counts,
    ...(processingMs !== undefined && { processingMs }),
    ...(modelName !== undefined && { modelName }),
    ...(pseudonymizedTokens !== undefined && { pseudonymizedTokens }),
    ...(usedPreinforme !== undefined && { usedPreinforme }),
  };
}
