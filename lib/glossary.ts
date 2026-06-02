/**
 * Glosario de términos de ecografía / radiología (español, Chile).
 *
 * Propósito: sesgar la transcripción (Gemini) y opcionalmente la auditoría
 * hacia vocabulario clínico correcto, reduciendo errores STT en términos
 * técnicos (homófonos, prefijos hipo/hiper, etc.).
 *
 * Fuente de la verdad institucional: validar con el radiólogo de Medicenter
 * y enriquecer minando los informes reales con scripts/mine-glossary.ts.
 *
 * Para ampliar el glosario: agregar términos a las categorías existentes o
 * crear nuevas categorías, luego actualizar EXAM_CATEGORY_MAP si corresponde.
 */

// ============================================================
// TÉRMINOS POR CATEGORÍA
// ============================================================

export const GLOSSARY: Record<string, string[]> = {
  descriptores_generales: [
    // Ecogenicidad
    "anecoico", "hipoecoico", "hipoecogénico", "hiperecoico", "hiperecogénico",
    "isoecoico", "ecogenicidad", "ecogénico", "ecoestructura", "ecotextura",
    "hiperecogenicidad", "hipoecogenicidad", "ecorrefringente", "ecorrefringencia",
    // Morfología y estructura
    "homogéneo", "heterogéneo", "lobulado", "irregular", "bien definido",
    "mal definido", "encapsulado", "multiseptado", "multiloculado",
    "tabicado", "septado", "unilocular", "bilocular",
    "quístico", "sólido", "mixto", "complejo", "nodular",
    // Bordes y fenómenos acústicos
    "contornos regulares", "contornos irregulares", "márgenes nítidos",
    "márgenes mal definidos", "bordes bien definidos", "bordes mal definidos",
    "bien delimitado", "mal delimitado",
    "refuerzo acústico posterior", "sombra acústica", "sombra acústica posterior",
    "artefacto en cola de cometa", "imagen en espejo", "reverberación",
    // Tipos de lesión
    "lesión focal", "lesión quística", "lesión sólida", "lesión compleja",
    "lesión ocupante de espacio", "proceso expansivo", "imagen hiperecogénica",
    "masa", "nódulo", "colección", "derrame", "ascitis",
    "calcificación", "calcificaciones", "microcalcificaciones",
    "litiasis", "cálculo",
    // Medidas y dimensiones
    "milímetros", "centímetros", "diámetro", "eje mayor", "eje menor",
    "longitud", "espesor", "grosor", "volumen", "dimensiones", "calibre",
    "diámetro longitudinal", "diámetro anteroposterior", "diámetro transverso",
    // Técnica ecográfica
    "ecografía", "ultrasonido", "transductor", "modo B",
    "Doppler color", "Doppler pulsado", "Doppler espectral", "modo M",
    "ecografía en tiempo real",
    // Vascularización
    "vascularización", "vascularizado", "avascular",
    // Hallazgos normales / negativos
    "sin hallazgos patológicos", "sin evidencia de lesiones focales",
    "dentro de límites normales", "tamaño conservado",
    "de aspecto conservado", "sin alteraciones", "de características benignas",
    "sin signos de", "no se evidencia", "no se observa", "normal",
  ],

  higado: [
    "hígado", "hepático", "parénquima hepático", "arquitectura hepática",
    "ecogenicidad hepática", "lóbulo hepático derecho", "lóbulo hepático izquierdo",
    "lóbulo derecho", "lóbulo izquierdo", "lóbulo caudado",
    "segmento hepático", "segmentos hepáticos",
    // Patología
    "esteatosis", "esteatosis hepática", "hígado graso",
    "esteatosis leve", "esteatosis moderada", "esteatosis severa",
    "esteatohepatitis", "cirrosis hepática", "fibrosis", "fibrosis hepática",
    "hepatomegalia", "hepatomegalia leve", "hepatomegalia moderada",
    "hemangioma", "hemangioma hepático", "quiste hepático", "quiste simple",
    "absceso hepático", "metástasis", "metástasis hepáticas",
    "colangiocarcinoma", "hepatocarcinoma", "carcinoma hepatocelular",
    "conductos biliares intrahepáticos",
    // Vascular hepático
    "vena porta", "vena hepática", "arteria hepática", "venas suprahepáticas",
    "hipertensión portal", "trombosis portal", "cavernoma portal",
    // Normal
    "hígado de tamaño y ecogenicidad normales",
    "hígado sin lesiones focales", "parénquima hepático homogéneo",
    "hígado de tamaño normal con ecogenicidad conservada",
  ],

  vesicula_y_via_biliar: [
    "vesícula biliar", "pared vesicular", "fondo vesicular", "cuello vesicular",
    "paredes vesiculares", "paredes finas", "engrosamiento parietal",
    "contenido vesicular", "bilis",
    // Patología vesicular
    "colelitiasis", "cálculo biliar", "cálculos biliares",
    "litiasis vesicular", "litiasis biliar", "microlitiasis",
    "barro biliar", "lodo biliar", "pólipo vesicular",
    "colecistitis", "colecistitis aguda", "colecistitis crónica",
    "hidropesía vesicular", "distensión vesicular",
    "vesícula distendida", "vesícula contraída", "vesícula escleroatrófica",
    "vesícula alitiásica",
    "imagen hiperecogénica con sombra acústica posterior",
    // Vía biliar
    "vía biliar", "vía biliar intrahepática", "vía biliar extrahepática",
    "colédoco", "conducto hepático común", "confluencia biliar",
    "dilatación de la vía biliar", "coledocolitiasis",
    "vía biliar no dilatada", "calibre normal", "dilatación biliar",
    "colangitis",
  ],

  pancreas: [
    "páncreas", "cabeza del páncreas", "cuerpo del páncreas", "cola del páncreas",
    "proceso uncinado", "conducto de Wirsung", "ducto pancreático principal",
    // Patología
    "pancreatitis", "pancreatitis aguda", "pancreatitis crónica",
    "pseudoquiste pancreático", "quiste pancreático", "tumor quístico pancreático",
    "adenocarcinoma pancreático", "tumor pancreático",
    "dilatación del conducto pancreático", "calcificaciones pancreáticas",
    "tumor neuroendocrino pancreático",
    // Normal
    "páncreas de tamaño y ecogenicidad normales",
    "páncreas sin lesiones focales", "ecogenicidad pancreática normal",
  ],

  bazo: [
    "bazo", "esplénico", "polo superior esplénico", "polo inferior esplénico",
    "hilio esplénico", "parénquima esplénico", "bazo accesorio",
    // Patología
    "esplenomegalia", "esplenomegalia leve", "esplenomegalia moderada",
    "esplenomegalia severa", "infarto esplénico", "quiste esplénico",
    // Normal
    "bazo de tamaño normal", "bazo sin lesiones focales", "eje mayor esplénico",
  ],

  rinon_y_via_urinaria: [
    "riñón", "renal", "riñón derecho", "riñón izquierdo",
    "corteza renal", "médula renal", "seno renal", "pelvis renal",
    "sistema pielocalicial", "cáliz", "cálices", "pielocalicial",
    "parénquima renal", "diferenciación corticomedular",
    // Patología renal
    "litiasis renal", "cálculo renal", "nefrolitiasis", "ureterolitiasis",
    "cálculo ureteral", "hidronefrosis", "ureterohidronefrosis",
    "ectasia pielocalicial", "dilatación pielocalicial",
    "pielonefritis", "absceso renal", "pionefrosis",
    "quiste renal", "quiste simple", "quiste cortical",
    "carcinoma de células renales", "angiomiolipoma",
    "uropatía obstructiva", "riñón hipoplásico",
    // Vejiga
    "vejiga", "vejiga urinaria", "pared vesical", "residuo postmiccional",
    "engrosamiento de pared vesical", "trabeculación vesical",
    // Uréteres
    "uréter", "uréteres", "unión ureteropélvica", "unión ureterovesical",
    // Normal
    "riñón de tamaño y morfología normales",
    "sin signos de litiasis", "sin dilatación de vía excretora",
    "sin uropatía obstructiva", "corteza renal conservada",
  ],

  abdomen_retroperitoneo: [
    // Aorta y grandes vasos
    "aorta abdominal", "arteria mesentérica superior", "arteria mesentérica inferior",
    "tronco celíaco", "arteria renal", "vena cava inferior",
    "aneurisma aórtico", "diámetro aórtico",
    // Retroperitoneo
    "retroperitoneo", "espacio retroperitoneal",
    "adenopatías", "adenopatías retroperitoneales", "adenopatías paraaórticas",
    "ganglios", "linfadenopatías", "ganglio linfático", "conglomerado adenopático",
    // Suprarrenales
    "glándula suprarrenal", "suprarrenal derecha", "suprarrenal izquierda",
    "adenoma suprarrenal",
    // Líquido libre
    "líquido libre", "líquido libre intraabdominal", "líquido libre en cavidad abdominal",
    "ascitis", "derrame peritoneal",
    // Intestino
    "asas intestinales", "apéndice", "apéndice cecal", "apendicitis",
  ],

  tiroides: [
    "tiroides", "glándula tiroides", "istmo", "istmo tiroideo",
    "lóbulo tiroideo derecho", "lóbulo tiroideo izquierdo",
    "parénquima tiroideo", "ecogenicidad tiroidea",
    // Patología
    "nódulo tiroideo", "nódulo sólido", "nódulo quístico", "nódulo mixto",
    "nódulo hipoecoico", "nódulo hiperecogénico",
    "bocio", "bocio multinodular", "bocio simple", "bocio difuso",
    "quiste coloide",
    "tiroiditis", "tiroiditis de Hashimoto", "tiroiditis de De Quervain",
    "carcinoma papilar", "carcinoma folicular", "carcinoma medular",
    "carcinoma anaplásico", "adenoma folicular",
    "microcalcificaciones", "calcificaciones groseras",
    "halo periférico", "vascularización aumentada",
    "vascularización periférica", "vascularización interna",
    // TIRADS
    "TI-RADS", "TIRADS 1", "TIRADS 2", "TIRADS 3", "TIRADS 4", "TIRADS 5",
    // Adenopatías cervicales
    "ganglios cervicales", "adenopatías laterocervicales", "ganglio cervical",
    // Paratiroides
    "paratiroides", "adenoma paratiroideo",
    // Normal
    "tiroides de tamaño y ecogenicidad normales",
    "tiroides sin nódulos",
  ],

  mama: [
    "mama", "mama derecha", "mama izquierda", "glándula mamaria",
    "tejido fibroglandular", "tejido adiposo", "pezón", "areola",
    "cuadrante superoexterno", "cuadrante superointerno",
    "cuadrante inferoexterno", "cuadrante inferointerno",
    "región retroareolar", "axila", "región axilar",
    // Lesiones
    "nódulo mamario", "masa mamaria",
    "quiste simple", "quiste complicado", "quiste complejo", "quiste mamario",
    "fibroadenoma", "quiste sebáceo", "lipoma", "galactocele",
    "conductos galactóforos", "ectasia ductal",
    "carcinoma ductal infiltrante", "carcinoma lobulillar infiltrante",
    "carcinoma ductal in situ",
    "adenopatías axilares", "ganglios axilares",
    // BI-RADS
    "BI-RADS", "BI-RADS 1", "BI-RADS 2", "BI-RADS 3",
    "BI-RADS 4A", "BI-RADS 4B", "BI-RADS 4C", "BI-RADS 5",
    // Descriptores
    "orientación paralela", "orientación no paralela",
    "margen angular", "margen espiculado", "margen circunscrito", "margen microlobulado",
    "lesión sólida", "lesión quística",
  ],

  pelvica_obstetrica: [
    // Útero
    "útero", "cuerpo uterino", "cérvix", "cuello uterino",
    "endometrio", "miometrio", "anexos",
    "grosor endometrial", "línea endometrial",
    "anteversoflexión", "retroversoflexión", "retroversión uterina",
    // Patología uterina
    "mioma", "leiomioma", "mioma intramural", "mioma submucoso", "mioma subseroso",
    "adenomiosis", "adenomioma",
    "pólipo endometrial", "DIU", "dispositivo intrauterino",
    // Ovarios
    "ovario derecho", "ovario izquierdo",
    "folículo", "folículos", "folículos antrales", "folículo dominante",
    "cuerpo amarillo", "cuerpo lúteo",
    "quiste ovárico", "quiste folicular", "quiste luteínico",
    "teratoma quístico maduro", "dermoides",
    "endometrioma", "quiste endometriósico",
    "síndrome de ovario poliquístico", "ovario poliquístico",
    "torsión ovárica",
    // Obstétrico
    "saco gestacional", "vesícula vitelina", "saco vitelino", "embrión", "feto",
    "latido cardíaco fetal", "actividad cardíaca fetal", "frecuencia cardíaca fetal",
    "longitud cráneocaudal", "longitud céfalo-caudal", "CRL",
    "placenta", "placenta anterior", "placenta posterior",
    "cordón umbilical", "líquido amniótico",
    "índice de líquido amniótico", "ILA",
    "biometría fetal", "edad gestacional",
    "semanas de gestación", "semanas de amenorrea",
    "diámetro biparietal", "DBP", "circunferencia cefálica",
    "circunferencia abdominal", "longitud femoral",
    "presentación cefálica", "translucencia nucal",
    // Douglas
    "fondo de saco de Douglas", "líquido en fondo de saco",
    "líquido libre en Douglas",
  ],

  testicular: [
    "testículo", "testículo derecho", "testículo izquierdo", "testículos",
    "escroto", "parénquima testicular", "epidídimo",
    "cabeza del epidídimo", "cuerpo del epidídimo", "cola del epidídimo",
    "mediastino testicular", "rete testis", "túnica albugínea", "cordón espermático",
    // Patología
    "hidrocele", "hidrocele reactivo",
    "varicocele", "varicocele grado I", "varicocele grado II", "varicocele grado III",
    "orquiepididimitis", "orquitis", "epididimitis",
    "quiste epididimario", "quiste de epidídimo", "quiste de la rete testis",
    "torsión testicular", "tumor testicular",
    "tumor germinal", "seminoma", "carcinoma embrionario",
    "microlitosis testicular", "microlitiasis testicular", "espermatocele",
    // Normal
    "testículos de tamaño y ecogenicidad normales",
    "epidídimos sin alteraciones", "sin hidrocele",
  ],

  partes_blandas: [
    "tejidos blandos", "tejido celular subcutáneo",
    "fascia", "aponeurosis", "plano muscular", "tejido muscular",
    "tendón", "ligamento", "bolsa serosa",
    // Lesiones
    "quiste", "lipoma", "fibroma", "liposarcoma",
    "quiste sebáceo", "quiste epidérmico", "quiste de inclusión",
    "hematoma", "seroma", "absceso",
    "colección", "colección encapsulada", "colección organizada",
    "hernia", "granuloma", "cuerpo extraño", "cuerpo extraño ecogénico",
    "adenopatía", "ganglio linfático",
    "pseudoaneurisma", "malformación vascular",
    // Descriptores
    "bien encapsulado", "mal delimitado",
    "compresible", "no compresible",
    "avascular", "hipervascularizado",
  ],

  musculoesqueletico: [
    // Tendones
    "tendón", "tendinitis", "tendinosis", "tenosinovitis",
    "rotura tendinosa", "rotura parcial", "rotura completa",
    "engrosamiento tendinoso", "fibras tendinosas", "fibras musculares",
    "discontinuidad tendinosa", "calcificación tendinosa", "entesopatía",
    // Manguito rotador
    "manguito rotador", "supraespinoso", "infraespinoso",
    "subescapular", "redondo menor", "tendón largo del bíceps",
    // Otros tendones frecuentes
    "tendón de Aquiles", "tendón rotuliano",
    "tibial posterior", "peroneo lateral largo", "peroneo lateral corto",
    // Articulaciones
    "articulación", "espacio articular", "cartílago", "cartílago articular",
    "derrame articular", "sinovitis", "pannus sinovial",
    "menisco medial", "menisco lateral", "ligamento",
    // Bursas
    "bursa", "bursitis", "bolsa subacromial", "bolsa subdeltoidea",
    "bursa prerrotuliana", "bursa retrocalcánea",
    // Nervios
    "nervio mediano", "síndrome del túnel del carpo",
    // Hueso y músculo
    "cortical ósea", "periostio", "fractura de estrés",
    "desgarro", "desgarro muscular",
    "desgarro de grado I", "desgarro de grado II", "desgarro de grado III",
    "hematoma", "hematoma intramuscular", "contractura muscular",
  ],

  vascular_doppler: [
    // Arterias cervicales
    "arteria carótida común", "arteria carótida interna", "arteria carótida externa",
    "bifurcación carotídea", "carótida", "arteria vertebral", "arteria subclavia",
    // Arterias miembros inferiores
    "arteria femoral común", "arteria femoral superficial", "arteria femoral profunda",
    "arteria poplítea", "arteria tibial anterior", "arteria tibial posterior",
    "arteria peronea",
    // Venas
    "vena", "arteria",
    "vena yugular interna", "vena yugular externa", "yugular",
    "vena subclavia", "vena femoral común", "vena femoral", "vena poplítea",
    "safena mayor", "safena menor",
    "vena ilíaca", "vena cava inferior", "vena porta",
    // Parámetros Doppler
    "Doppler", "Doppler color", "Doppler pulsado", "Doppler espectral",
    "flujo", "permeable", "permeabilidad",
    "flujo bifásico", "flujo trifásico", "flujo monofásico", "flujo turbulento",
    "ausencia de flujo", "flujo en ventana espectral",
    "índice de resistencia", "índice de pulsatilidad",
    "velocidad pico sistólico", "velocidad pico sistólica", "velocidad telediastólica",
    "relación sístole/diástole",
    // Patología
    "placa aterosclerótica", "placa de ateroma", "ateromatosis",
    "placa blanda", "placa dura",
    "estenosis", "estenosis carotídea", "estenosis significativa",
    "oclusión", "trombo", "trombosis", "trombosis venosa profunda", "TVP",
    "insuficiencia venosa", "reflujo", "reflujo venoso", "várices",
    "aneurisma", "aneurisma aórtico abdominal",
    "diámetro anteroposterior aórtico",
  ],
};

// ============================================================
// PARES FONÉTICAMENTE CONFUNDIBLES
// ============================================================

/**
 * Pares que el STT suele intercambiar. El modelo debe NO sustituir uno por otro.
 * También se exporta para uso en el auditor.
 */
export const CONFUSABLE_PAIRS: Array<[string, string]> = [
  ["bazo", "vaso"],
  ["hipoecoico", "hiperecoico"],
  ["hipoecoico", "hiperecogénico"],
  ["hipoecogénico", "hiperecoico"],
  ["hipodenso", "hiperdenso"],
  ["anecoico", "hipoecoico"],
  ["anecoico", "ecogénico"],
  ["quístico", "sólido"],
  ["derecho", "izquierdo"],
  ["proximal", "distal"],
  ["anterior", "posterior"],
  ["dilatado", "no dilatado"],
  ["vesícula", "vejiga"],
  ["uréter", "uretra"],
  ["colelitiasis", "coledocolitiasis"],
  ["colédoco", "colon"],
  ["tiroides", "paratiroides"],
  ["estenosis", "ectasia"],
  ["esplenomegalia", "hepatomegalia"],
  ["aorta", "porta"],
  ["litiasis", "lesión"],
  ["hidronefrosis", "hidronefrosis bilateral"],
  ["pielonefritis", "pionefrosis"],
  ["endometrioma", "endometrio"],
  ["sombra acústica", "refuerzo acústico posterior"],
  ["nódulo", "módulo"],
  ["adenoma", "adenopatía"],
];

// Alias para compatibilidad con código que use el nombre del remoto
export const PARES_CONFUNDIBLES = CONFUSABLE_PAIRS;

// ============================================================
// MAPEO TIPO DE EXAMEN → CATEGORÍAS
// ============================================================

const EXAM_CATEGORY_MAP: Record<string, string[]> = {
  "Ecografía abdominal": [
    "higado",
    "vesicula_y_via_biliar",
    "pancreas",
    "bazo",
    "rinon_y_via_urinaria",
    "abdomen_retroperitoneo",
  ],
  "Ecografía obstétrica": ["pelvica_obstetrica"],
  "Ecografía tiroidea": ["tiroides"],
  "Ecografía mamaria": ["mama"],
  "Ecografía renal": ["rinon_y_via_urinaria", "abdomen_retroperitoneo"],
  "Ecografía pélvica": ["pelvica_obstetrica"],
  "Ecografía testicular": ["testicular"],
  "Ecografía partes blandas": ["partes_blandas", "musculoesqueletico"],
  "Ecografía vascular": ["vascular_doppler", "abdomen_retroperitoneo"],
  "Doppler": ["vascular_doppler"],
};

// ============================================================
// FUNCIONES EXPORTADAS
// ============================================================

/**
 * Devuelve todos los términos del glosario como texto plano (un término por línea).
 * Útil para inyectar el vocabulario completo en prompts de transcripción o para
 * scripts de minería que necesitan comparar candidatos contra el glosario actual.
 */
export function getFullGlossary(): string {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const categoryTerms of Object.values(GLOSSARY)) {
    for (const term of categoryTerms) {
      if (!seen.has(term)) {
        seen.add(term);
        terms.push(term);
      }
    }
  }
  for (const [a, b] of CONFUSABLE_PAIRS) {
    if (!seen.has(a)) { seen.add(a); terms.push(a); }
    if (!seen.has(b)) { seen.add(b); terms.push(b); }
  }
  return terms.join("\n");
}

/**
 * Devuelve el glosario como texto plano listo para inyectar en el prompt.
 * Incluye siempre los descriptores generales + las categorías del tipo de examen.
 * Si examType no coincide con ningún tipo conocido, devuelve solo el glosario general.
 */
export function getGlossaryForExam(examType: string): string {
  const specificCategories = EXAM_CATEGORY_MAP[examType] ?? [];
  const categories = ["descriptores_generales", ...specificCategories];

  const sections: string[] = [];
  for (const cat of categories) {
    const terms = GLOSSARY[cat];
    if (!terms) continue;
    const label = cat
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    sections.push(`[${label}]\n${terms.join(", ")}`);
  }

  const confusables = CONFUSABLE_PAIRS.map(([a, b]) => `"${a}" ≠ "${b}"`).join(
    " | "
  );

  return (
    sections.join("\n\n") +
    `\n\n[Pares fonéticamente confundibles — NO intercambiar]\n${confusables}`
  );
}
