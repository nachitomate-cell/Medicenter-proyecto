/**
 * Wrapper para Groq Whisper API.
 *
 * Usa el modelo whisper-large-v3.
 * Solicitamos `verbose_json` para mantener compatibilidad con los
 * segmentos y timestamps necesarios para el mapeo.
 */

import Groq from "groq-sdk";
import type { WhisperVerboseResponse } from "./types";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

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

export async function transcribeAudio(
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
