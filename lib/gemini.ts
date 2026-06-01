/**
 * Cliente compartido de Google Gemini (@google/genai).
 *
 * Lo usan tanto el auditor (lib/auditor.ts) como la transcripción
 * (lib/whisper.ts), para no duplicar la inicialización ni la lectura de env.
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Modelo de Gemini para la AUDITORÍA. flash = barato/rápido; pro = mejor calidad.
 * Ver https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

/**
 * Modelo de Gemini para la TRANSCRIPCIÓN de audio. La transcripción de audio
 * clínico exige bastante más calidad que la auditoría: los modelos flash
 * producen transcripciones pobres. Recomendado: gemini-3.1-pro-preview.
 * Por defecto usa el mismo que la auditoría (GEMINI_MODEL).
 */
export const GEMINI_TRANSCRIPTION_MODEL =
  process.env.GEMINI_TRANSCRIPTION_MODEL ?? GEMINI_MODEL;

let client: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY (o GOOGLE_API_KEY) environment variable is not set."
    );
  }
  client = new GoogleGenAI({ apiKey });
  return client;
}
