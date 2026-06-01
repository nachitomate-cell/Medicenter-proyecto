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
import { getGeminiClient, GEMINI_MODEL } from "./gemini";
import type { WhisperVerboseResponse } from "./types";

const TRANSCRIPTION_PROVIDER = process.env.TRANSCRIPTION_PROVIDER ?? "groq";

/** Nombre legible del transcriptor activo. Se guarda en la metadata del caso. */
export function getTranscriptionModelName(): string {
  return TRANSCRIPTION_PROVIDER === "gemini"
    ? `Gemini (${GEMINI_MODEL})`
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
 */
export async function transcribeAudio(
  audioFile: File
): Promise<WhisperVerboseResponse> {
  if (TRANSCRIPTION_PROVIDER === "gemini") {
    return transcribeWithGemini(audioFile);
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

const TRANSCRIPTION_PROMPT =
  "Transcribe este audio de un dictado clínico en español (Chile), palabra " +
  "por palabra y de forma literal. No resumas, no corrijas, no agregues " +
  "comentarios ni encabezados: devuelve únicamente el texto transcrito.";

/**
 * Transcribe con Gemini enviando el audio inline (base64).
 *
 * Formatos de audio soportados por Gemini: WAV, MP3, AIFF, AAC, OGG, FLAC.
 * (webm puede no estar soportado; para grabaciones del navegador preferir Groq.)
 *
 * No devuelve segmentos con timestamps → `segments: []` y `duration: 0`.
 */
async function transcribeWithGemini(
  audioFile: File
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
    `DEBUG - Iniciando transcripción con Gemini (${GEMINI_MODEL}, ${mimeType})...`
  );

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      { text: TRANSCRIPTION_PROMPT },
      { inlineData: { mimeType, data: base64 } },
    ],
    config: { temperature: 0 },
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("Gemini returned an empty transcription.");
  }

  return { text, segments: [], language: "es", duration: 0 };
}
