/**
 * Tipos compartidos entre frontend y backend.
 *
 * IMPORTANTE: Si modificás estos tipos, verificá que el frontend
 * (app/audit/[id]/page.tsx) siga renderizando correctamente.
 */

// ============================================================
// FRONTEND TYPES (lo que consume la UI)
// ============================================================

export type Severity = "critical" | "warning" | "style";

export type DiscrepancySource =
  | "audio_informe"
  | "preinforme_informe"
  | "audio_preinforme"
  | "triple";

export interface Discrepancy {
  id: string;
  severity: Severity;
  audioTimestamp: number;
  audioQuote: string;
  reportQuote: string;
  reportRange: [number, number];
  explanation: string;
  /** Campos extra del LLM, persistidos y usados por la UI */
  confidence?: "alta" | "media" | "baja";
  type?: string;
  reportSection?: string;
  /** Presente solo cuando se usó preinforme (v1.1+) */
  source?: DiscrepancySource;
  preinformeQuote?: string;
}

export interface AuditCase {
  id: string;
  report: string;
  transcription: string;
  preinforme?: string;
  discrepancies: Discrepancy[];
  metadata: AuditMetadata;
  audioUrl: string;
  createdAt: string;
}

export interface AuditMetadata {
  promptVersion: string;
  audioDurationSeconds: number;
  audioFileName: string;
  audioSizeBytes: number;
  reasoning: string;
  generalObservations: string;
  counts: {
    critical: number;
    warning: number;
    style: number;
    total: number;
  };
  processingMs?: number;
  modelName?: string;
  pseudonymizedTokens?: number;
  /** True si el caso incluye preinforme del tecnólogo (comparación triple). */
  usedPreinforme?: boolean;
}

// ============================================================
// CASE SUMMARY (para listados — sin report/transcription completos)
// ============================================================

export interface CaseSummary {
  id: string;
  audioFileName: string;
  audioDurationSeconds: number;
  createdAt: string;
  counts: {
    critical: number;
    warning: number;
    style: number;
    total: number;
  };
  promptVersion: string;
  processingMs?: number;
  modelName?: string;
}

// ============================================================
// LLM OUTPUT TYPES (lo que devuelve Claude)
// ============================================================

export type LLMSeverity = "critico" | "advertencia" | "estilo";
export type LLMConfidence = "alta" | "media" | "baja";
export type LLMDiscrepancyType =
  | "medida"
  | "descriptor"
  | "omision"
  | "adicion"
  | "lateralidad"
  | "ubicacion"
  | "conclusion"
  | "terminologia"
  | "redaccion"
  | "otro";

export type LLMDiscrepancySource =
  | "audio_informe"
  | "preinforme_informe"
  | "audio_preinforme"
  | "triple";

export interface LLMDiscrepancy {
  id: string;
  severidad: LLMSeverity;
  confianza: LLMConfidence;
  fragmento_audio: string;
  fragmento_informe: string;
  ubicacion_informe: string;
  tipo: LLMDiscrepancyType;
  explicacion: string;
  /** Presente solo en comparación triple (prompt v1.1). */
  fuente?: LLMDiscrepancySource;
  fragmento_preinforme?: string;
}

export interface LLMOutput {
  version_prompt: string;
  razonamiento: string;
  discrepancias: LLMDiscrepancy[];
  observaciones_generales: string;
}

// ============================================================
// WHISPER TYPES
// ============================================================

export interface WhisperSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
}

export interface WhisperVerboseResponse {
  text: string;
  segments: WhisperSegment[];
  language: string;
  duration: number;
}
