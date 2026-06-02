/**
 * Glosario de términos de ecografía / radiología (español, Chile).
 *
 * Propósito: sesgar la transcripción de audio (y opcionalmente la auditoría)
 * hacia vocabulario clínico correcto, para que el modelo no invente ni "agregue"
 * palabras fuera de dominio y resuelva términos técnicos ambiguos.
 *
 * Cómo usarlo:
 *   getGlossaryForExam(examType) → texto plano listo para inyectar en el prompt.
 *
 * Limitación: un glosario sesga, no garantiza. No resuelve confusiones entre dos
 * términos igualmente válidos (p. ej. "calcificación" vs "desgarro"): eso lo
 * cubre el reencuadre del prompt del auditor.
 *
 * Fuente de la verdad institucional: este es un punto de partida. Debe validarse
 * con el radiólogo de Medicenter y enriquecerse minando los informes reales
 * (ver docs/05-roadmap.md → "Glosario institucional de Medicenter").
 */

// ============================================================
// TÉRMINOS POR CATEGORÍA
// ============================================================

/** Descriptores generales de ecogenicidad, morfología y medidas. Siempre se incluyen. */
const DESCRIPTORES_GENERALES = [
  "anecoico", "hipoecoico", "hipoecogénico", "hiperecoico", "hiperecogénico",
  "isoecoico", "ecogenicidad", "ecoestructura", "ecotextura", "homogéneo",
  "heterogéneo", "sombra acústica posterior", "refuerzo acústico posterior",
  "artefacto en cola de cometa", "reverberación", "contornos regulares",
  "contornos irregulares", "bordes bien definidos", "bordes mal definidos",
  "lobulado", "bien delimitado", "mal delimitado", "quístico", "sólido",
  "mixto", "complejo", "septado", "tabicado", "calcificación", "calcificaciones",
  "microcalcificaciones", "litiasis", "cálculo", "nódulo", "nodular", "masa",
  "lesión focal", "lesión ocupante de espacio", "colección", "líquido libre",
  "vascularización", "vascularizado", "avascular", "normal", "sin alteraciones",
  "dentro de límites normales", "de aspecto conservado",
];

const MEDIDAS = [
  "milímetros", "centímetros", "diámetro", "eje mayor", "eje menor", "longitud",
  "espesor", "grosor", "volumen", "dimensiones", "calibre",
];

const CATEGORIAS: Record<string, string[]> = {
  higado: [
    "hígado", "hepático", "lóbulo hepático derecho", "lóbulo hepático izquierdo",
    "lóbulo caudado", "parénquima hepático", "esteatosis", "esteatosis hepática",
    "hígado graso", "hepatomegalia", "vena porta", "venas suprahepáticas",
    "conductos biliares intrahepáticos", "hemangioma", "quiste hepático",
    "metástasis", "cirrosis", "fibrosis", "hipertensión portal",
  ],
  via_biliar: [
    "vesícula biliar", "pared vesicular", "colelitiasis", "microlitiasis",
    "barro biliar", "colecistitis", "pólipo vesicular", "colédoco",
    "vía biliar", "dilatación de la vía biliar", "conducto hepático común",
    "distensión vesicular", "vesícula alitiásica",
  ],
  pancreas: [
    "páncreas", "cabeza del páncreas", "cuerpo del páncreas", "cola del páncreas",
    "conducto de Wirsung", "pancreatitis", "pseudoquiste pancreático",
  ],
  bazo: [
    "bazo", "esplénico", "esplenomegalia", "bazo accesorio",
    "parénquima esplénico", "hilio esplénico",
  ],
  rinon_via_urinaria: [
    "riñón", "renal", "riñón derecho", "riñón izquierdo", "corteza renal",
    "médula renal", "seno renal", "pelvis renal", "sistema pielocalicial",
    "cáliz", "cálices", "pielocalicial", "parénquima renal",
    "diferenciación corticomedular", "litiasis renal", "nefrolitiasis",
    "hidronefrosis", "ureterohidronefrosis", "uropatía obstructiva",
    "ectasia pielocalicial", "quiste renal", "quiste simple", "quiste cortical",
    "angiomiolipoma", "vejiga", "pared vesical", "uréter", "residuo postmiccional",
  ],
  abdomen_general: [
    "aorta abdominal", "vena cava inferior", "retroperitoneo", "adenopatías",
    "ganglios", "ascitis", "líquido libre intraabdominal", "asas intestinales",
    "apéndice", "apendicitis",
  ],
  tiroides: [
    "tiroides", "glándula tiroides", "lóbulo tiroideo derecho",
    "lóbulo tiroideo izquierdo", "istmo", "parénquima tiroideo", "nódulo tiroideo",
    "bocio", "quiste coloide", "microcalcificaciones", "vascularización aumentada",
    "tiroiditis", "TI-RADS", "ganglios cervicales",
  ],
  mama: [
    "mama", "glándula mamaria", "tejido fibroglandular", "nódulo mamario",
    "quiste mamario", "fibroadenoma", "conductos galactóforos", "ectasia ductal",
    "axila", "ganglios axilares", "BI-RADS", "lesión sólida", "lesión quística",
  ],
  pelvica_ginecologica: [
    "útero", "endometrio", "miometrio", "mioma", "leiomioma", "anexos",
    "ovario derecho", "ovario izquierdo", "folículo", "folículos",
    "quiste ovárico", "cuerpo lúteo", "fondo de saco de Douglas",
    "líquido en fondo de saco", "cuello uterino", "DIU", "endometrioma",
  ],
  obstetrica: [
    "saco gestacional", "vesícula vitelina", "embrión", "feto",
    "latido cardíaco fetal", "frecuencia cardíaca fetal", "longitud céfalo-caudal",
    "diámetro biparietal", "circunferencia cefálica", "circunferencia abdominal",
    "longitud femoral", "placenta", "líquido amniótico", "cordón umbilical",
    "edad gestacional", "presentación cefálica", "translucencia nucal",
  ],
  testicular_escrotal: [
    "testículo", "testículo derecho", "testículo izquierdo", "epidídimo",
    "escroto", "cordón espermático", "hidrocele", "varicocele",
    "quiste de epidídimo", "microlitiasis testicular", "túnica albugínea",
    "torsión testicular", "orquitis", "epididimitis",
  ],
  partes_blandas: [
    "tejido celular subcutáneo", "lipoma", "quiste sebáceo", "quiste epidérmico",
    "absceso", "colección", "adenopatía", "ganglio linfático", "hernia",
    "plano muscular", "fascia",
  ],
  musculoesqueletico: [
    "tendón", "tendinitis", "tendinosis", "tenosinovitis", "desgarro",
    "rotura parcial", "rotura completa", "fibras musculares", "hematoma",
    "bursa", "bursitis", "derrame articular", "manguito rotador", "supraespinoso",
    "infraespinoso", "subescapular", "redondo menor", "tendón rotuliano",
    "tendón de Aquiles", "ligamento", "cartílago", "calcificación tendinosa",
    "entesopatía",
  ],
  vascular_doppler: [
    "Doppler", "Doppler color", "Doppler pulsado", "Doppler espectral", "flujo",
    "permeable", "permeabilidad", "trombosis", "trombo", "estenosis",
    "placa de ateroma", "ateromatosis", "índice de resistencia",
    "velocidad pico sistólica", "reflujo", "insuficiencia venosa",
    "trombosis venosa profunda", "vena", "arteria", "carótida", "yugular",
    "ausencia de flujo",
  ],
};

/**
 * Pares de términos fonéticamente confundibles. Útiles tanto para sesgar la
 * transcripción como para que el auditor entienda errores fonéticos típicos.
 */
export const PARES_CONFUNDIBLES: [string, string][] = [
  ["bazo", "vaso"],
  ["hipoecoico", "hiperecoico"],
  ["hipoecogénico", "hiperecogénico"],
  ["hipodenso", "hiperdenso"],
  ["anecoico", "ecogénico"],
  ["quístico", "sólido"],
  ["derecho", "izquierdo"],
  ["proximal", "distal"],
  ["anterior", "posterior"],
  ["estenosis", "ectasia"],
  ["aorta", "porta"],
  ["litiasis", "lesión"],
];

// ============================================================
// MAPEO TIPO DE EXAMEN → CATEGORÍAS
// ============================================================

/**
 * Devuelve las claves de categoría relevantes para un tipo de examen.
 * Se basa en coincidencias de palabra clave para tolerar variantes de escritura.
 */
function categoriesForExam(examType: string): string[] {
  const t = examType.toLowerCase();

  if (t.includes("abdominal"))
    return ["higado", "via_biliar", "pancreas", "bazo", "rinon_via_urinaria", "abdomen_general"];
  if (t.includes("obst"))
    return ["obstetrica", "pelvica_ginecologica"];
  if (t.includes("tiroid"))
    return ["tiroides"];
  if (t.includes("mam"))
    return ["mama"];
  if (t.includes("renal") || t.includes("urinar"))
    return ["rinon_via_urinaria", "abdomen_general"];
  if (t.includes("pélv") || t.includes("pelv"))
    return ["pelvica_ginecologica", "rinon_via_urinaria"];
  if (t.includes("test") || t.includes("escrot"))
    return ["testicular_escrotal"];
  if (t.includes("blandas"))
    return ["partes_blandas", "musculoesqueletico"];
  if (t.includes("vascular") || t.includes("doppler"))
    return ["vascular_doppler"];

  // Desconocido: devolvemos las categorías más comunes (abdominal) como base.
  return ["higado", "via_biliar", "rinon_via_urinaria", "abdomen_general"];
}

// ============================================================
// API PÚBLICA
// ============================================================

/**
 * Devuelve el glosario relevante para un tipo de examen, como texto plano listo
 * para inyectar en el prompt de transcripción o auditoría.
 *
 * Incluye siempre los descriptores generales y de medidas, más las categorías
 * propias del examen y los pares confundibles.
 */
export function getGlossaryForExam(examType: string): string {
  const keys = categoriesForExam(examType ?? "");
  const lines: string[] = [];

  lines.push(`Descriptores: ${DESCRIPTORES_GENERALES.join(", ")}.`);
  lines.push(`Medidas: ${MEDIDAS.join(", ")}.`);

  for (const key of keys) {
    const terms = CATEGORIAS[key];
    if (terms) {
      const label = key.replace(/_/g, " ");
      lines.push(`${label}: ${terms.join(", ")}.`);
    }
  }

  const pares = PARES_CONFUNDIBLES.map(([a, b]) => `${a}/${b}`).join(", ");
  lines.push(`Pares fácilmente confundibles (distínguelos con cuidado): ${pares}.`);

  return lines.join("\n");
}

/** Glosario completo (todas las categorías) como texto plano. */
export function getFullGlossary(): string {
  const lines: string[] = [
    `Descriptores: ${DESCRIPTORES_GENERALES.join(", ")}.`,
    `Medidas: ${MEDIDAS.join(", ")}.`,
  ];
  for (const [key, terms] of Object.entries(CATEGORIAS)) {
    lines.push(`${key.replace(/_/g, " ")}: ${terms.join(", ")}.`);
  }
  return lines.join("\n");
}
