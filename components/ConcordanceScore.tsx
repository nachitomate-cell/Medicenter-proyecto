"use client";

import type { ScoringResult, NivelConcordancia } from "@/lib/scoring";
import { ETIQUETAS } from "@/lib/scoring";

// ── Configuración visual por nivel ────────────────────────────────────────────
// Separada del componente para que sea fácil de ajustar sin tocar el markup.
const NIVEL_STYLES: Record<
  NivelConcordancia,
  { circle: string; scoreText: string; labelText: string }
> = {
  verde: {
    circle: "bg-[#8BC53D]",
    scoreText: "text-[#6FA02C]",
    labelText: "text-[#6FA02C]",
  },
  amarillo: {
    circle: "bg-amber-500",
    scoreText: "text-amber-700",
    labelText: "text-amber-700",
  },
  rojo: {
    circle: "bg-red-500",
    scoreText: "text-red-700",
    labelText: "text-red-700",
  },
};

interface ConcordanceScoreProps {
  result: ScoringResult;
}

/**
 * Card de Score de Concordancia Clínica.
 *
 * Recibe el resultado de computeScore() y lo renderiza.
 * No hace ningún cálculo propio — es pura presentación.
 *
 * Nota de UX: lenguaje intencionalmente observacional ("Revisar",
 * "Atención requerida"), no imperativo. Consistente con el principio
 * de "asistencia, no reemplazo" del posicionamiento del producto.
 */
export function ConcordanceScore({ result }: ConcordanceScoreProps) {
  const { score, nivel, breakdown } = result;
  const styles = NIVEL_STYLES[nivel];

  const breakdownText = [
    `${breakdown.critical} crítica${breakdown.critical !== 1 ? "s" : ""}`,
    `${breakdown.warning} advertencia${breakdown.warning !== 1 ? "s" : ""}`,
    `${breakdown.style} estilo`,
  ].join(" · ");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      {/* Label */}
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Concordancia clínica
      </p>

      {/* Score numérico */}
      <p className={`mt-1 text-3xl font-bold leading-none ${styles.scoreText}`}>
        {score}{" "}
        <span className="text-base font-normal text-slate-400">/ 100</span>
      </p>

      {/* Indicador de nivel */}
      <div className="mt-2 flex items-center gap-1.5">
        {/* Círculo de 14px de color */}
        <span
          className={`inline-block h-[14px] w-[14px] shrink-0 rounded-full ${styles.circle}`}
          aria-hidden="true"
        />
        <span className={`text-sm font-medium ${styles.labelText}`}>
          {ETIQUETAS[nivel]}
        </span>
      </div>

      {/* Breakdown desagregado */}
      <p className="mt-2 text-xs text-slate-400">{breakdownText}</p>
    </div>
  );
}
