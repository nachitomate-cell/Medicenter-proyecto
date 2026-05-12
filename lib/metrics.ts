/**
 * Métricas de auditoría — cálculos determinísticos sobre texto.
 *
 * Todas las funciones son puras: mismo input → mismo output.
 * Sin efectos secundarios, sin llamadas al LLM.
 */

/**
 * Formatea segundos como "m:ss" para mostrar duración de audio.
 * Ejemplo: 225 → "3:45".
 */
export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Cuenta palabras de un texto.
 * Robusto ante espacios múltiples y texto vacío.
 */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Normaliza un texto para comparación textual:
 * minúsculas, sin puntuación, descartando tokens de 2 letras o menos.
 *
 * Se descartan tokens cortos porque "de", "la", "el" aparecen en ambas
 * versiones y distorsionarían el porcentaje al alza artificialmente.
 */
function normalizeToTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.,;:()¿?¡!"]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

/**
 * Porcentaje de palabras del INFORME que también aparecen en la
 * TRANSCRIPCIÓN del audio (después de normalización).
 *
 * Responde la pregunta clínica: "¿qué fracción de lo que escribió la
 * tipeadora está respaldada por lo que dijo el médico en el audio?"
 *
 * Es direccional (no simétrica): mide cobertura del informe por el audio.
 * Un informe con términos técnicos que Whisper no capturó bien dará un
 * porcentaje bajo, aunque el contenido sea equivalente — eso es información
 * útil, no un defecto del algoritmo.
 *
 * Por qué no Jaccard: Jaccard mide similitud de conjuntos (simétrica,
 * interpretable como "overlap de vocabulario"), pero no responde qué
 * porcentaje del trabajo de la tipeadora está verificado por el audio.
 * Para la audiencia del demo (dirección médica, gerencia, coordinadora),
 * "92% del informe aparece en el audio" es una frase interpretable.
 * "Jaccard = 0.87" no lo es.
 */
export function textualMatchPercent(report: string, transcript: string): number {
  const reportWords = normalizeToTokens(report);
  const transcriptSet = new Set(normalizeToTokens(transcript));
  if (reportWords.length === 0) return 0;
  const matching = reportWords.filter((w) => transcriptSet.has(w)).length;
  return Math.round((matching / reportWords.length) * 100);
}
