/**
 * Loader del system prompt del auditor.
 *
 * v1.0 — comparación dual: audio vs informe.
 * v1.1 — comparación triple: audio + preinforme tecnólogo + informe.
 *
 * Usa caché por versión para no releer disco en cada request.
 */

import fs from "fs";
import path from "path";

const PROMPT_FILES: Record<string, string> = {
  "1.0": "auditor-v1.0.md",
  "1.1": "auditor-v1.1.md",
};

const promptCache = new Map<string, string>();

function loadPromptByVersion(version: string): string {
  if (promptCache.has(version)) return promptCache.get(version)!;

  const fileName = PROMPT_FILES[version];
  if (!fileName) throw new Error(`Prompt version ${version} not configured.`);

  const filePath = path.join(process.cwd(), "prompts", fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `Prompt file not found: ${filePath}. Ensure prompts/${fileName} exists.`
    );
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const startMarker = "<!-- PROMPT START -->";
  const endMarker = "<!-- PROMPT END -->";

  const startIdx = raw.indexOf(startMarker);
  const endIdx = raw.indexOf(endMarker);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error(
      `Prompt file ${fileName} missing markers (<!-- PROMPT START --> / <!-- PROMPT END -->).`
    );
  }

  const content = raw.slice(startIdx + startMarker.length, endIdx).trim();

  if (content.length < 100) {
    throw new Error(
      `Prompt v${version} suspiciously short (${content.length} chars). Check markers.`
    );
  }

  promptCache.set(version, content);
  return content;
}

/** Carga el prompt estándar (comparación dual audio vs informe). */
export function loadAuditorPrompt(): string {
  return loadPromptByVersion("1.0");
}

/** Carga el prompt para comparación triple (audio + preinforme + informe). */
export function loadAuditorPromptWithPreinforme(): string {
  return loadPromptByVersion("1.1");
}

export function getPromptVersion(withPreinforme = false): string {
  return withPreinforme ? "1.1" : "1.0";
}
