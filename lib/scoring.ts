/**
 * Cálculo del Score de Concordancia Clínica.
 *
 * Algoritmo determinístico — no involucra LLM.
 * Los pesos y umbrales son ajustables aquí sin modificar la UI.
 * Cambiar PESOS o UMBRALES afecta toda la app.
 */

export type NivelConcordancia = "verde" | "amarillo" | "rojo";

export interface ScoringResult {
  /** Puntuación 0-100. */
  score: number;
  /** Nivel calculado (con override clínico aplicado). */
  nivel: NivelConcordancia;
  /** True si hay al menos una discrepancia crítica. Controla el override. */
  hasCritical: boolean;
  /** Conteo desagregado de discrepancias por tipo. */
  breakdown: {
    critical: number;
    warning: number;
    style: number;
  };
}

const PESOS = {
  critical: 15,
  warning: 5,
  style: 1,
} as const;

/**
 * Verde: 95-100 · Amarillo: 80-94 · Rojo: 0-79.
 */
const UMBRALES = {
  verde: 95,
  amarillo: 80,
} as const;

const ETIQUETAS: Record<NivelConcordancia, string> = {
  verde: "Concordancia óptima",
  amarillo: "Revisar",
  rojo: "Atención requerida",
};

export { ETIQUETAS };

/**
 * Calcula el Score de Concordancia Clínica a partir de los conteos de
 * discrepancias.
 *
 * Fórmula: 100 − (críticas × 15) − (advertencias × 5) − (estilo × 1),
 * con floor en 0 y ceil en 100.
 */
export function computeScore(counts: {
  critical: number;
  warning: number;
  style: number;
}): ScoringResult {
  const raw =
    100 -
    counts.critical * PESOS.critical -
    counts.warning * PESOS.warning -
    counts.style * PESOS.style;

  const score = Math.max(0, Math.min(100, raw));
  const hasCritical = counts.critical > 0;

  let nivel: NivelConcordancia;
  if (score >= UMBRALES.verde) {
    nivel = "verde";
  } else if (score >= UMBRALES.amarillo) {
    nivel = "amarillo";
  } else {
    nivel = "rojo";
  }

  // Override clínico: un caso con al menos un crítico nunca se muestra como
  // "verde óptimo". Aunque el cálculo aritmético dé verde, forzamos amarillo.
  // Esto refleja el principio de precaución clínica documentado en
  // docs/04-clasificacion-clinica.md (Principio 1: ante duda, elegir el nivel
  // más grave). Un score aritmético de 95+ con un error crítico activo es un
  // falso positivo de seguridad que no podemos mostrarle al cliente.
  if (hasCritical && nivel === "verde") {
    nivel = "amarillo";
  }

  return {
    score,
    nivel,
    hasCritical,
    breakdown: {
      critical: counts.critical,
      warning: counts.warning,
      style: counts.style,
    },
  };
}
