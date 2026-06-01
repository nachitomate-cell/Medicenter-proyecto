/**
 * Motor de Auditoría Clínica — Multi-Proveedor.
 *
 * Soporta Groq, Anthropic y OpenAI vía AUDITOR_PROVIDER.
 * Soporta comparación dual (audio vs informe) y triple (audio + preinforme + informe).
 */

import Groq from "groq-sdk";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { loadAuditorPrompt, loadAuditorPromptWithPreinforme } from "./prompt";
import type { LLMOutput } from "./types";

const PROVIDER = process.env.AUDITOR_PROVIDER ?? "groq";

// Modelo de Gemini configurable. flash = barato/rápido para pruebas;
// pro = mejor calidad clínica. Ver https://ai.google.dev/gemini-api/docs/models
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

const MODEL_NAMES: Record<string, string> = {
  groq: "Llama 3.3 70B (Groq)",
  anthropic: "Claude Sonnet 4.6",
  openai: "GPT-4o mini",
  gemini: `Gemini (${GEMINI_MODEL})`,
};

/** Nombre legible del modelo activo. Usar en metadata del caso. */
export function getAuditorModelName(): string {
  return MODEL_NAMES[PROVIDER] ?? PROVIDER;
}

// ============================================================
// CLIENT LAZY INITIALIZERS
// ============================================================

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (groqClient) return groqClient;
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set.");
  groqClient = new Groq({ apiKey });
  return groqClient;
}

let anthropicClient: Anthropic | null = null;
function getAnthropicClient(): Anthropic {
  if (anthropicClient) return anthropicClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY environment variable is not set.");
  anthropicClient = new Anthropic({ apiKey });
  return anthropicClient;
}

let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY environment variable is not set.");
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (geminiClient) return geminiClient;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY (o GOOGLE_API_KEY) environment variable is not set.");
  }
  geminiClient = new GoogleGenAI({ apiKey });
  return geminiClient;
}

// ============================================================
// ZOD SCHEMAS
// ============================================================

// Schema base (v1.0) — comparación dual
const LLMDiscrepancyBaseSchema = z.object({
  id: z.string(),
  severidad: z.enum(["critico", "advertencia", "estilo"]),
  confianza: z.enum(["alta", "media", "baja"]),
  fragmento_audio: z.string(),
  fragmento_informe: z.string(),
  ubicacion_informe: z.string(),
  tipo: z.enum([
    "medida", "descriptor", "omision", "adicion",
    "lateralidad", "ubicacion", "conclusion",
    "terminologia", "redaccion", "otro",
  ]),
  explicacion: z.string(),
});

// Schema extendido (v1.1) — comparación triple
const LLMDiscrepancyExtendedSchema = LLMDiscrepancyBaseSchema.extend({
  fuente: z.enum(["audio_informe", "preinforme_informe", "audio_preinforme", "triple"]).optional(),
  fragmento_preinforme: z.string().optional(),
});

const LLMOutputSchema = z.object({
  version_prompt: z.string(),
  razonamiento: z.string(),
  discrepancias: z.array(LLMDiscrepancyExtendedSchema),
  observaciones_generales: z.string(),
});

// ============================================================
// MAIN FUNCTION
// ============================================================

export async function runAudit(
  transcription: string,
  report: string,
  preinforme?: string
): Promise<LLMOutput> {
  const withPreinforme = Boolean(preinforme && preinforme.trim().length > 0);
  const systemPrompt = withPreinforme
    ? loadAuditorPromptWithPreinforme()
    : loadAuditorPrompt();

  const userMessage = withPreinforme
    ? `TRANSCRIPCIÓN_AUDIO:\n${transcription}\n\nPREINFORME_TECNÓLOGO:\n${preinforme}\n\nINFORME_ESCRITO:\n${report}`
    : `TRANSCRIPCIÓN_AUDIO:\n${transcription}\n\nINFORME_ESCRITO:\n${report}`;

  let rawText: string | null = null;

  if (PROVIDER === "groq") {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });
    rawText = response.choices[0]?.message?.content || null;

  } else if (PROVIDER === "anthropic") {
    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      temperature: 0,
      max_tokens: 4000,
    });
    if (response.content[0] && response.content[0].type === "text") {
      rawText = response.content[0].text;
    }

  } else if (PROVIDER === "openai") {
    const openai = getOpenAIClient();
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0,
      response_format: { type: "json_object" },
    });
    rawText = response.choices[0]?.message?.content || null;

  } else if (PROVIDER === "gemini") {
    const gemini = getGeminiClient();
    const response = await gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: userMessage,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0,
        // Fuerza salida JSON, igual que Groq/OpenAI con response_format.
        responseMimeType: "application/json",
      },
    });
    rawText = response.text ?? null;

  } else {
    throw new Error(`Unsupported AUDITOR_PROVIDER: ${PROVIDER}`);
  }

  if (!rawText) {
    throw new Error(`${PROVIDER} returned an empty response.`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    throw new Error(
      `${PROVIDER} returned invalid JSON. Raw response:\n${rawText.slice(0, 500)}`
    );
  }

  const result = LLMOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `${PROVIDER} JSON failed Zod validation:\n${issues}\n\nRaw:\n${rawText.slice(0, 500)}`
    );
  }

  return result.data;
}
