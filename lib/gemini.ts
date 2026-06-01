/**
 * Cliente compartido de Google Gemini (@google/genai).
 *
 * Lo usan tanto el auditor (lib/auditor.ts) como la transcripción
 * (lib/whisper.ts), para no duplicar la inicialización ni la lectura de env.
 */

import { GoogleGenAI } from "@google/genai";

/**
 * Modelo de Gemini. flash = barato/rápido para pruebas; pro = mejor calidad.
 * Ver https://ai.google.dev/gemini-api/docs/models
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

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
