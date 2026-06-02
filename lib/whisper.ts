/**
 * Transcripción de audio — multi-proveedor.
 *
 * Por defecto usa Groq Whisper (whisper-large-v3) con `verbose_json`, que
 * devuelve segmentos con timestamps (necesarios para los marcadores de audio).
 *
 * Alternativa: Gemini (TRANSCRIPTION_PROVIDER=gemini), que transcribe audio
 * nativamente y permite operar con un único proveedor. Limitación: Gemini NO
 * devuelve segmentos con timestamps, así que los marcadores de audio quedan
 * en 0:00. Para la demo con marcadores clicleables, preferir Groq.
 */

import Groq from "groq-sdk";
import { getGeminiClient, GEMINI_TRANSCRIPTION_MODEL } from "./gemini";
import type { WhisperSegment, WhisperVerboseResponse } from "./types";
import { getGlossaryForExam } from "./glossary";

const TRANSCRIPTION_PROVIDER = process.env.TRANSCRIPTION_PROVIDER ?? "groq";

/** Nombre legible del transcriptor activo. Se guarda en la metadata del caso. */
export function getTranscriptionModelName(): string {
  return TRANSCRIPTION_PROVIDER === "gemini"
    ? `Gemini (${GEMINI_TRANSCRIPTION_MODEL})`
    : "Whisper large-v3 (Groq)";
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
// Gemini recibe el audio inline (base64). El base64 infla ~33%, y el límite
// de request inline ronda los 20 MB; acotamos para fallar con un mensaje claro.
const GEMINI_MAX_INLINE_BYTES = 14 * 1024 * 1024;

let client: Groq | null = null;

function getClient(): Groq {
  if (client) return client;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set.");
  }

  client = new Groq({ apiKey });
  return client;
}

/**
 * Punto de entrada: despacha al proveedor configurado.
 * examType es opcional; cuando se provee y el proveedor es Gemini,
 * se inyecta el glosario clínico en el prompt de transcripción.
 */
export async function transcribeAudio(
  audioFile: File,
  examType?: string
): Promise<WhisperVerboseResponse> {
  if (TRANSCRIPTION_PROVIDER === "gemini") {
    return transcribeWithGemini(audioFile, examType);
  }
  return transcribeWithGroq(audioFile);
}

async function transcribeWithGroq(
  audioFile: File
): Promise<WhisperVerboseResponse> {
  if (audioFile.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `Audio file exceeds Groq API limit of 25 MB. ` +
        `Size: ${(audioFile.size / (1024 * 1024)).toFixed(1)} MB.`
    );
  }

  const groq = getClient();

  console.log(`DEBUG - Iniciando transcripción con Groq (${audioFile.name})...`);

  const response = await groq.audio.transcriptions.create({
    model: "whisper-large-v3",
    file: audioFile,
    language: "es",
    response_format: "verbose_json",
  });

  // The Groq SDK returns a similar structure for verbose_json
  const data = response as unknown as WhisperVerboseResponse;

  if (!data.text || typeof data.text !== "string") {
    throw new Error("Groq returned an empty or invalid transcription.");
  }

  return {
    text: data.text,
    segments: data.segments ?? [],
    language: data.language ?? "es",
    duration: data.duration ?? 0,
  };
}

const TRANSCRIPTION_PROMPT_BASE =
  "Transcribe este audio de un dictado clínico en español (Chile), palabra " +
  "por palabra y de forma literal. Devuelve ÚNICAMENTE un array JSON válido " +
  "con objetos { \"start\": <segundos como número>, \"text\": <fragmento> }. " +
  "Cada objeto debe cubrir entre 5 y 15 segundos de audio. El array debe " +
  "cubrir todo el audio de principio a fin, en orden cronológico. " +
  "No agregues explicaciones, markdown ni texto fuera del JSON.";

function buildTranscriptionPrompt(examType?: string): string {
  if (!examType) return TRANSCRIPTION_PROMPT_BASE;
  const glossary = getGlossaryForExam(examType);
  return (
    TRANSCRIPTION_PROMPT_BASE +
    "\n\nVocabulario clínico de referencia (úsalo para resolver términos " +
    "ambiguos; no inventes palabras fuera de este dominio):\n" +
    glossary
  );
}

interface GeminiSegment {
  start: number;
  text: string;
}

/**
 * Transcribe con Gemini enviando el audio inline (base64).
 *
 * Pide JSON con timestamps. Si el parse falla, hace fallback a texto plano
 * sin segmentos para no romper el flujo.
 *
 * Formatos soportados por Gemini: WAV, MP3, AIFF, AAC, OGG, FLAC.
 * (webm puede no estar soportado; para grabaciones del navegador preferir Groq.)
 */
async function transcribeWithGemini(
  audioFile: File,
  examType?: string
): Promise<WhisperVerboseResponse> {
  if (audioFile.size > GEMINI_MAX_INLINE_BYTES) {
    throw new Error(
      `Audio demasiado grande para envío inline a Gemini ` +
        `(${(audioFile.size / (1024 * 1024)).toFixed(1)} MB). ` +
        `Usar Groq (TRANSCRIPTION_PROVIDER=groq) para archivos grandes.`
    );
  }

  const ai = getGeminiClient();
  const base64 = Buffer.from(await audioFile.arrayBuffer()).toString("base64");
  const mimeType = audioFile.type || "audio/mpeg";

  console.log(
    `DEBUG - Iniciando transcripción con Gemini (${GEMINI_TRANSCRIPTION_MODEL}, ${mimeType})...`
  );

  const prompt = buildTranscriptionPrompt(examType);
  if (examType) {
    console.log(`DEBUG - Glosario clínico inyectado para: "${examType}"`);
  }

  const response = await ai.models.generateContent({
    model: GEMINI_TRANSCRIPTION_MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ],
    config: { temperature: 0, responseMimeType: "application/json" },
  });

  const raw = response.text?.trim();
  if (!raw) {
    throw new Error("Gemini returned an empty transcription.");
  }

  // Intentar parsear JSON con timestamps; fallback a texto plano si falla.
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      typeof (parsed[0] as GeminiSegment).start === "number" &&
      typeof (parsed[0] as GeminiSegment).text === "string"
    ) {
      const geminiSegs = parsed as GeminiSegment[];
      const segments: WhisperSegment[] = geminiSegs.map((seg, i) => {
        const next = geminiSegs[i + 1];
        const end = next ? next.start : seg.start + 2;
        return { id: i, seek: 0, start: seg.start, end, text: seg.text };
      });
      const text = segments.map((s) => s.text).join(" ").trim();
      const duration = segments[segments.length - 1].end;
      console.log(`DEBUG - Gemini devolvió ${segments.length} segmentos con timestamps.`);
      return { text, segments, language: "es", duration };
    }
  } catch {
    // JSON inválido — caemos al fallback
  }

  // Fallback: texto plano sin timestamps
  console.warn("DEBUG - Gemini no devolvió JSON válido; usando texto plano sin timestamps.");
  const text = raw;
  return { text, segments: [], language: "es", duration: 0 };
}
