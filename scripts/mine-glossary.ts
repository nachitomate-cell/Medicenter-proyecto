/**
 * Minería de términos médicos desde informes reales de Medicenter.
 *
 * Uso: npx tsx scripts/mine-glossary.ts [carpeta]
 * Default: ./reports-input
 *
 * Lee .txt / .md / .json, pseudonimiza PHI, extrae n-gramas frecuentes y
 * filtra los ya cubiertos por lib/glossary.ts.
 * Salida: scripts/glossary-candidates.txt + top 40 en consola.
 */

import * as fs from "fs";
import * as path from "path";
import { getFullGlossary } from "../lib/glossary";
import { pseudonymize } from "../lib/pseudonymizer";

// ============================================================
// STOPWORDS
// ============================================================

const STOPWORDS = new Set([
  // Artículos
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  // Preposiciones
  "a", "ante", "bajo", "con", "contra", "de", "desde", "durante",
  "en", "entre", "hacia", "hasta", "para", "por", "según", "sin",
  "sobre", "tras", "al", "del",
  // Conjunciones
  "y", "e", "o", "u", "ni", "pero", "sino", "que", "si", "aunque",
  "como", "cuando", "donde", "mientras", "porque", "pues", "ya",
  // Pronombres / determinantes
  "se", "su", "sus", "le", "lo", "les", "me", "te", "nos",
  "yo", "mi", "tu", "él", "ella", "ellos", "ellas", "usted", "ustedes",
  "este", "esta", "estos", "estas", "ese", "esa", "esos", "esas",
  "aquel", "aquella", "aquellos", "aquellas",
  "cual", "cuál", "cuales", "quién", "quienes",
  // Verbos comunes cortos / auxiliares
  "es", "son", "está", "están", "fue", "ser", "hay", "no", "si",
  "ha", "han", "había", "haber", "tiene", "tienen", "tenía",
  "puede", "pueden", "podría",
  // Adverbios y otros
  "más", "muy", "bien", "también", "además", "solo", "todo", "toda",
  "todos", "todas", "tanto", "tal", "cada", "otro", "otra", "otros",
  "así", "aquí", "allí", "ahora", "hoy", "etc",
]);

// ============================================================
// LECTURA DE ARCHIVOS
// ============================================================

interface SourceFile {
  filePath: string;
  text: string;
}

function extractTextFromValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractTextFromValue).join(" ");
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map(extractTextFromValue)
      .join(" ");
  }
  return "";
}

function extractTextFromJson(raw: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return raw; // fallback: treat as plain text
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return extractTextFromValue(parsed);
  }

  const obj = parsed as Record<string, unknown>;

  // Si parece un AuditCase, usar los campos clínicos.
  if (obj.report || obj.transcription || obj.preinforme) {
    return [obj.report, obj.transcription, obj.preinforme]
      .filter((v) => typeof v === "string" && v.trim().length > 0)
      .join(" ");
  }

  // Fallback: concatenar todos los valores string.
  return Object.values(obj)
    .filter((v) => typeof v === "string")
    .join(" ");
}

function readFilesRecursive(dir: string): SourceFile[] {
  const results: SourceFile[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...readFilesRecursive(fullPath));
      continue;
    }
    if (!entry.isFile()) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (![".txt", ".md", ".json"].includes(ext)) continue;

    try {
      const raw = fs.readFileSync(fullPath, "utf-8");
      const text = ext === ".json" ? extractTextFromJson(raw) : raw;
      if (text.trim().length > 0) {
        results.push({ filePath: fullPath, text });
      }
    } catch (err) {
      console.warn(`⚠  No se pudo leer ${fullPath}:`, (err as Error).message);
    }
  }

  return results;
}

// ============================================================
// TOKENIZACIÓN Y N-GRAMAS
// ============================================================

// Separa en tokens conservando acentos y guiones compuestos.
const SPLIT_RE = /[^\p{L}\p{N}'\-]+/u;

function rawTokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(SPLIT_RE)
    .map((t) => t.replace(/^['\-]+|['\-]+$/g, "")) // quita apóstrofos/guiones extremos
    .filter((t) => t.length > 0);
}

function isPhiToken(t: string): boolean {
  // El pseudonimizador genera tokens como [PACIENTE_1], [RUT_1], etc.
  return t.startsWith("[") && t.endsWith("]");
}

function isUsable(t: string): boolean {
  return (
    !isPhiToken(t) &&
    !STOPWORDS.has(t) &&
    t.length > 2 &&
    !/^\d+$/.test(t)
  );
}

/**
 * Genera uni, bi y trigramas candidatos desde el texto ya pseudonimizado.
 * Descarta n-gramas que:
 *   - Contengan cualquier token PHI.
 *   - Comiencen o terminen con stopword/token corto/número.
 */
function generateCandidates(text: string): string[] {
  const tokens = rawTokenize(text);
  const candidates: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const t0 = tokens[i];
    if (isPhiToken(t0)) continue;

    // Unigrama
    if (isUsable(t0)) {
      candidates.push(t0);
    }

    // Bigrama
    if (i + 1 < tokens.length) {
      const t1 = tokens[i + 1];
      if (!isPhiToken(t1) && isUsable(t0) && isUsable(t1)) {
        candidates.push(`${t0} ${t1}`);
      }
    }

    // Trigrama
    if (i + 2 < tokens.length) {
      const t1 = tokens[i + 1];
      const t2 = tokens[i + 2];
      if (!isPhiToken(t1) && !isPhiToken(t2) && isUsable(t0) && isUsable(t2)) {
        candidates.push(`${t0} ${t1} ${t2}`);
      }
    }
  }

  return candidates;
}

// ============================================================
// COMPARACIÓN CON GLOSARIO ACTUAL
// ============================================================

function buildGlossarySet(): Set<string> {
  const raw = getFullGlossary();
  const known = new Set<string>();
  for (const line of raw.split(/\n/)) {
    const term = line.trim().toLowerCase();
    if (term.length > 0) known.add(term);
  }
  return known;
}

// ============================================================
// MAIN
// ============================================================

const MIN_FREQ = 3;
const TOP_N = 40;
const OUT_FILE = path.resolve("scripts", "glossary-candidates.txt");

function main(): void {
  const inputDir = path.resolve(process.argv[2] ?? "./reports-input");

  if (!fs.existsSync(inputDir)) {
    console.error(`
❌  La carpeta "${inputDir}" no existe.

Creala y agrega archivos con informes reales antes de correr el script:

  mkdir reports-input

Formatos soportados:
  • .txt / .md  — texto libre (se usa todo el contenido)
  • .json       — si tiene campos "report" / "transcription" / "preinforme",
                  se usan esos; si no, se concatenan todos los valores string.

Ejemplo de .json compatible (AuditCase):
  {
    "report":         "Hígado de tamaño normal...",
    "transcription":  "Dictado del radiólogo...",
    "preinforme":     "Preinforme del tecnólogo..." (opcional)
  }

⚠  IMPORTANTE: los archivos pueden contener datos clínicos reales.
   La carpeta "reports-input/" está en .gitignore; no la commitees.
    `.trim());
    process.exit(1);
  }

  // ── Lectura ──────────────────────────────────────────────
  const files = readFilesRecursive(inputDir);
  if (files.length === 0) {
    console.error(
      `❌  No se encontraron archivos .txt, .md o .json en "${inputDir}".`
    );
    process.exit(1);
  }
  console.log(
    `📂  ${files.length} archivo(s) encontrado(s) en "${inputDir}"`
  );

  // ── Minería ───────────────────────────────────────────────
  const freqMap = new Map<string, number>();
  let totalTokens = 0;

  for (const { filePath, text } of files) {
    const { text: safeText, tokenCount } = pseudonymize(text);
    if (tokenCount > 0) {
      console.log(
        `  🔒 ${path.basename(filePath)}: ${tokenCount} tokens PHI reemplazados`
      );
    }
    const candidates = generateCandidates(safeText);
    totalTokens += candidates.length;
    for (const c of candidates) {
      freqMap.set(c, (freqMap.get(c) ?? 0) + 1);
    }
  }

  console.log(
    `\n📊  ${totalTokens.toLocaleString()} tokens extraídos, ` +
    `${freqMap.size.toLocaleString()} n-gramas únicos`
  );

  // ── Filtrado por frecuencia ───────────────────────────────
  const frequent = [...freqMap.entries()].filter(([, freq]) => freq >= MIN_FREQ);
  console.log(
    `   → ${frequent.length.toLocaleString()} con frecuencia ≥ ${MIN_FREQ}`
  );

  // ── Filtrado contra glosario actual ──────────────────────
  const knownTerms = buildGlossarySet();
  const newCandidates = frequent
    .filter(([term]) => !knownTerms.has(term))
    .sort((a, b) => b[1] - a[1]);

  console.log(
    `   → ${newCandidates.length.toLocaleString()} candidatos NUEVOS ` +
    `(no cubiertos por el glosario actual)`
  );

  // ── Escritura de archivo ──────────────────────────────────
  const now = new Date().toISOString();
  const headerLines = [
    `# Candidatos de glosario institucional — generado ${now}`,
    `# Fuente: ${inputDir} (${files.length} archivo(s))`,
    `# Total candidatos nuevos: ${newCandidates.length} | Frecuencia mínima: ${MIN_FREQ}`,
    `# Para agregar al glosario: revisar manualmente y copiar a lib/glossary.ts`,
    ``,
    `Frec. | Término`,
    `------+------------------------------------------------------------`,
  ];
  const dataLines = newCandidates.map(
    ([term, freq]) => `${String(freq).padStart(5)} | ${term}`
  );

  fs.writeFileSync(
    OUT_FILE,
    [...headerLines, ...dataLines].join("\n") + "\n",
    "utf-8"
  );
  console.log(`\n✅  Candidatos escritos en: ${OUT_FILE}`);

  // ── Top N en consola ──────────────────────────────────────
  const top = newCandidates.slice(0, TOP_N);
  if (top.length === 0) {
    console.log("\n🎉  ¡El glosario ya cubre todos los términos frecuentes!");
    return;
  }

  console.log(`\n📋  Top ${Math.min(TOP_N, top.length)} candidatos nuevos:\n`);
  console.log("Frec. | Término");
  console.log("------+------------------------------------------------------------");
  for (const [term, freq] of top) {
    console.log(`${String(freq).padStart(5)} | ${term}`);
  }
}

main();
