/**
 * Evaluador de calidad de transcripción: BASELINE vs. ENRIQUECIDO.
 *
 * Uso: node --env-file=.env.local scripts/eval-transcription.mjs [carpeta]
 * Default: ./audios-eval
 *
 * Por cada .mp3 de la carpeta, transcribe con Gemini en dos variantes:
 *   A) BASELINE  — prompt mínimo
 *   B) ENRIQUECIDO — prompt con instrucción clínica + glosario de referencia
 *
 * Muestra ambas transcripciones lado a lado y guarda todo en
 * scripts/eval-output.txt.
 *
 * NOTA sobre el glosario: esta función `buildGlossary()` replica la salida de
 * `getFullGlossary()` de lib/glossary.ts (mismos términos, mismo formato).
 * Como este script corre con `node` puro (sin tsx), no puede importar archivos
 * .ts directamente. Si ampliás lib/glossary.ts, actualizá también esta función.
 */

import { GoogleGenAI } from "@google/genai";
import * as fs from "node:fs";
import * as path from "node:path";

// ============================================================
// GLOSARIO (mirror de lib/glossary.ts → getFullGlossary())
// ============================================================

function buildGlossary() {
  /** @type {Record<string, string[]>} */
  const GLOSSARY = {
    descriptores_generales: [
      "anecoico","hipoecoico","hiperecogénico","isoecoico","hiperecoico",
      "hiperecogenicidad","hipoecogenicidad","ecogenicidad","ecogénico","ecorrefringente",
      "homogéneo","heterogéneo","lobulado","irregular","bien definido","mal definido",
      "encapsulado","multiseptado","multiloculado","tabicado","septado","unilocular",
      "contornos regulares","contornos irregulares","márgenes nítidos","márgenes mal definidos",
      "refuerzo acústico posterior","sombra acústica","sombra acústica posterior",
      "lesión focal","lesión quística","lesión sólida","lesión compleja",
      "masa","nódulo","colección","derrame","ascitis",
      "calcificación","calcificaciones","microcalcificaciones","proceso expansivo",
      "milímetros","centímetros","eje mayor","eje menor",
      "diámetro longitudinal","diámetro anteroposterior","diámetro transverso",
      "ecografía","ultrasonido","transductor","modo B",
      "Doppler color","Doppler pulsado","Doppler espectral","modo M",
      "sin hallazgos patológicos","sin evidencia de lesiones focales",
      "dentro de límites normales","tamaño conservado",
      "sin signos de","no se evidencia","no se observa","sin alteraciones",
    ],
    higado: [
      "hígado","parénquima hepático","arquitectura hepática","ecogenicidad hepática",
      "lóbulo derecho","lóbulo izquierdo","lóbulo caudado","segmento hepático",
      "esteatosis hepática","esteatosis leve","esteatosis moderada","esteatosis severa",
      "cirrosis hepática","fibrosis hepática","hepatomegalia",
      "hemangioma","hemangioma hepático","quiste hepático","quiste simple",
      "colangiocarcinoma","hepatocarcinoma","carcinoma hepatocelular","metástasis hepáticas",
      "vena porta","vena hepática","arteria hepática","venas suprahepáticas",
      "hipertensión portal","trombosis portal",
    ],
    vesicula_y_via_biliar: [
      "vesícula biliar","fondo vesicular","cuello vesicular","paredes vesiculares",
      "paredes finas","engrosamiento parietal","contenido vesicular","bilis",
      "colelitiasis","cálculo biliar","cálculos biliares","litiasis vesicular",
      "litiasis biliar","microlitiasis","barro biliar","lodo biliar","pólipo vesicular",
      "colecistitis","colecistitis aguda","colecistitis crónica",
      "hidropesía vesicular","vesícula distendida","vesícula contraída","vesícula escleroatrófica",
      "imagen hiperecogénica con sombra acústica posterior",
      "vía biliar intrahepática","vía biliar extrahepática",
      "colédoco","conducto hepático común","confluencia biliar",
      "dilatación de la vía biliar","coledocolitiasis","vía biliar no dilatada","colangitis",
    ],
    pancreas: [
      "páncreas","cabeza del páncreas","cuerpo del páncreas","cola del páncreas",
      "proceso uncinado","conducto de Wirsung","ducto pancreático principal",
      "pancreatitis aguda","pancreatitis crónica","pseudoquiste pancreático",
      "adenocarcinoma pancreático","tumor pancreático",
      "dilatación del conducto pancreático","calcificaciones pancreáticas",
    ],
    bazo: [
      "bazo","polo superior esplénico","polo inferior esplénico","hilio esplénico","parénquima esplénico",
      "esplenomegalia","esplenomegalia leve","esplenomegalia moderada","esplenomegalia severa",
      "infarto esplénico","quiste esplénico","bazo de tamaño normal","eje mayor esplénico",
    ],
    rinon_y_via_urinaria: [
      "riñón","riñón derecho","riñón izquierdo","corteza renal","médula renal",
      "seno renal","pelvis renal","sistema pielocalicial",
      "litiasis renal","cálculo renal","nefrolitiasis","ureterolitiasis","cálculo ureteral",
      "hidronefrosis","ectasia pielocalicial","dilatación pielocalicial",
      "pielonefritis","absceso renal","pionefrosis",
      "quiste renal","quiste simple","quiste cortical",
      "carcinoma de células renales","angiomiolipoma","uropatía obstructiva",
      "vejiga urinaria","pared vesical","residuo postmiccional",
      "uréteres","unión ureteropélvica","unión ureterovesical",
      "sin signos de litiasis","sin dilatación de vía excretora","sin uropatía obstructiva",
    ],
    tiroides: [
      "tiroides","glándula tiroides","istmo tiroideo",
      "lóbulo tiroideo derecho","lóbulo tiroideo izquierdo","parénquima tiroideo",
      "nódulo tiroideo","nódulo sólido","nódulo quístico","nódulo mixto",
      "bocio multinodular","bocio simple","bocio difuso",
      "tiroiditis","tiroiditis de Hashimoto","carcinoma papilar","carcinoma folicular",
      "microcalcificaciones","halo periférico",
      "TIRADS 1","TIRADS 2","TIRADS 3","TIRADS 4","TIRADS 5",
      "adenopatías laterocervicales","paratiroides","adenoma paratiroideo",
    ],
    mama: [
      "mama derecha","mama izquierda","glándula mamaria","tejido fibroglandular",
      "cuadrante superoexterno","cuadrante superointerno","región retroareolar","axila",
      "nódulo mamario","masa mamaria","quiste simple","quiste complicado",
      "fibroadenoma","carcinoma ductal infiltrante","carcinoma lobulillar infiltrante",
      "adenopatías axilares",
      "BI-RADS 1","BI-RADS 2","BI-RADS 3","BI-RADS 4A","BI-RADS 4B","BI-RADS 4C","BI-RADS 5",
      "orientación paralela","margen espiculado","margen circunscrito",
      "sombra acústica posterior","refuerzo acústico posterior",
    ],
    pelvica_obstetrica: [
      "útero","cuerpo uterino","cérvix","cuello uterino","endometrio","miometrio",
      "grosor endometrial","anteversoflexión","retroversoflexión",
      "mioma","mioma intramural","mioma submucoso","mioma subseroso","leiomioma","adenomiosis",
      "pólipo endometrial","DIU",
      "ovario derecho","ovario izquierdo","folículo dominante","cuerpo lúteo",
      "quiste ovárico","quiste folicular","endometrioma","torsión ovárica",
      "síndrome de ovario poliquístico",
      "gestación","embrión","feto","saco gestacional","saco vitelino",
      "latido cardíaco fetal","actividad cardíaca fetal","frecuencia cardíaca fetal",
      "longitud cráneocaudal","CRL","placenta","cordón umbilical",
      "líquido amniótico","índice de líquido amniótico","ILA",
      "biometría fetal","edad gestacional","semanas de gestación",
      "diámetro biparietal","DBP","circunferencia cefálica","longitud femoral",
      "fondo de saco de Douglas","líquido libre en Douglas",
    ],
    testicular: [
      "testículo derecho","testículo izquierdo","parénquima testicular",
      "epidídimo","cabeza del epidídimo","cola del epidídimo","cordón espermático",
      "hidrocele","varicocele","orquiepididimitis","epididimitis",
      "quiste epididimario","torsión testicular","tumor testicular","seminoma",
      "microlitosis testicular","espermatocele",
    ],
    partes_blandas: [
      "tejidos blandos","tejido celular subcutáneo","fascia","plano muscular",
      "tendón","ligamento","bolsa serosa",
      "quiste","lipoma","fibroma","hematoma","seroma","absceso",
      "colección","colección encapsulada","quiste epidérmico","cuerpo extraño",
      "pseudoaneurisma","malformación vascular",
      "compresible","no compresible","avascular","hipervascularizado",
    ],
    musculoesqueletico: [
      "tendón","rotura tendinosa","rotura parcial","rotura completa",
      "tendinopatía","tendinosis","tenosinovitis","engrosamiento tendinoso",
      "manguito rotador","supraespinoso","infraespinoso","subescapular",
      "tendón largo del bíceps","tendón de Aquiles","tendón rotuliano",
      "articulación","espacio articular","cartílago articular","derrame articular","sinovitis",
      "bursa","bursitis","bolsa subacromial",
      "desgarro muscular","desgarro de grado I","desgarro de grado II","desgarro de grado III",
      "hematoma intramuscular",
    ],
    vascular_doppler: [
      "arteria carótida común","arteria carótida interna","arteria carótida externa",
      "bifurcación carotídea","arteria vertebral","arteria subclavia",
      "arteria femoral común","arteria femoral superficial","arteria poplítea",
      "arteria tibial anterior","arteria tibial posterior",
      "vena yugular interna","vena femoral","vena poplítea","safena mayor","safena menor",
      "vena cava inferior","vena porta",
      "placa aterosclerótica","placa de ateroma","estenosis","estenosis carotídea",
      "oclusión","trombosis venosa profunda","TVP",
      "insuficiencia venosa","várices","reflujo venoso",
      "aneurisma","aneurisma aórtico abdominal",
      "índice de resistencia","índice de pulsatilidad",
      "velocidad pico sistólico","velocidad telediastólica",
      "flujo bifásico","flujo trifásico","flujo monofásico","flujo turbulento",
    ],
  };

  const CONFUSABLE_PAIRS = [
    ["bazo","vaso"], ["hipoecoico","hiperecoico"],
    ["hipoecoico","hiperecogénico"], ["hipodenso","hiperdenso"],
    ["anecoico","hipoecoico"], ["dilatado","no dilatado"],
    ["vesícula","vejiga"], ["uréter","uretra"],
    ["colelitiasis","coledocolitiasis"], ["tiroides","paratiroides"],
    ["esplenomegalia","hepatomegalia"], ["pielonefritis","pionefrosis"],
    ["sombra acústica","refuerzo acústico posterior"],
    ["nódulo","módulo"], ["adenoma","adenopatía"],
  ];

  const seen = new Set();
  const terms = [];
  for (const arr of Object.values(GLOSSARY)) {
    for (const t of arr) {
      if (!seen.has(t)) { seen.add(t); terms.push(t); }
    }
  }
  for (const [a, b] of CONFUSABLE_PAIRS) {
    if (!seen.has(a)) { seen.add(a); terms.push(a); }
    if (!seen.has(b)) { seen.add(b); terms.push(b); }
  }
  return terms.join("\n");
}

// ============================================================
// PROMPTS
// ============================================================

const PROMPT_BASELINE =
  "Transcribe este audio en español, de forma literal.";

const PROMPT_ENRICHED =
  "Dictado clínico de ecografía en español (Chile), posible dicción difícil. " +
  "Transcribe literal, palabra por palabra. " +
  "Si una palabra es ininteligible, marcala [inaudible] en vez de adivinar. " +
  "No inventes términos.\n\n" +
  "Vocabulario clínico de referencia (usalo para resolver términos ambiguos; " +
  "no inventes palabras fuera de este dominio):\n" +
  buildGlossary();

// ============================================================
// TRANSCRIPCIÓN
// ============================================================

const MODEL = process.env.GEMINI_TRANSCRIPTION_MODEL ?? "gemini-3.1-pro-preview";

/**
 * @param {GoogleGenAI} ai
 * @param {string} base64
 * @param {string} mimeType
 * @param {string} prompt
 * @returns {Promise<string>}
 */
async function transcribe(ai, base64, mimeType, prompt) {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [
      { text: prompt },
      { inlineData: { mimeType, data: base64 } },
    ],
    config: { temperature: 0 },
  });
  return (res.text ?? "").trim();
}

// ============================================================
// FORMATO DE SALIDA
// ============================================================

const SEP = "=".repeat(72);
const DIV = "-".repeat(72);

function formatResult(audioName, baseline, enriched) {
  return [
    SEP,
    `AUDIO: ${audioName}`,
    SEP,
    "── A) BASELINE ──────────────────────────────────────────",
    baseline || "(sin texto)",
    "",
    "── B) ENRIQUECIDO ───────────────────────────────────────",
    enriched || "(sin texto)",
    "",
  ].join("\n");
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const inputDir = path.resolve(process.argv[2] ?? "./audios-eval");
  const outFile  = path.resolve("scripts", "eval-output.txt");

  if (!fs.existsSync(inputDir)) {
    console.error(`
❌  La carpeta "${inputDir}" no existe.

Creala y agrega tus archivos de audio .mp3:

  mkdir audios-eval
  # Copia tus audios reales aquí

⚠  IMPORTANTE: "audios-eval/" está en .gitignore — no la commitees.
    `.trim());
    process.exit(1);
  }

  const mp3Files = fs
    .readdirSync(inputDir)
    .filter((f) => f.toLowerCase().endsWith(".mp3"))
    .map((f) => path.join(inputDir, f));

  if (mp3Files.length === 0) {
    console.error(`❌  No se encontraron archivos .mp3 en "${inputDir}".`);
    process.exit(1);
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("❌  GEMINI_API_KEY no está configurada en .env.local.");
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });

  console.log(`📂  ${mp3Files.length} audio(s) en "${inputDir}"`);
  console.log(`🤖  Modelo: ${MODEL}\n`);

  const allResults = [
    `# Evaluación de transcripción Gemini — ${new Date().toISOString()}`,
    `# Modelo: ${MODEL}`,
    `# Audios: ${mp3Files.length}`,
    "",
  ];

  for (const [idx, filePath] of mp3Files.entries()) {
    const audioName = path.basename(filePath);
    console.log(`[${idx + 1}/${mp3Files.length}] ${audioName}`);

    let baseline = "(error)";
    let enriched = "(error)";

    try {
      const buffer = fs.readFileSync(filePath);
      const base64 = buffer.toString("base64");
      const mimeType = "audio/mpeg";

      process.stdout.write("  ▶ Baseline… ");
      baseline = await transcribe(ai, base64, mimeType, PROMPT_BASELINE);
      console.log(`OK (${baseline.length} chars)`);

      process.stdout.write("  ▶ Enriquecido… ");
      enriched = await transcribe(ai, base64, mimeType, PROMPT_ENRICHED);
      console.log(`OK (${enriched.length} chars)`);
    } catch (err) {
      console.error(`\n  ⚠  Error en ${audioName}:`, err.message);
      const msg = `(error: ${err.message})`;
      if (baseline === "(error)") baseline = msg;
      if (enriched === "(error)") enriched = msg;
    }

    const block = formatResult(audioName, baseline, enriched);
    allResults.push(block);

    // Mostrar en consola también
    console.log();
    console.log(block);
  }

  fs.writeFileSync(outFile, allResults.join("\n") + "\n", "utf-8");
  console.log(`\n✅  Resultados guardados en: ${outFile}`);
}

main().catch((err) => {
  console.error("Error fatal:", err);
  process.exit(1);
});
