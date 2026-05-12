"use client";

import { formatDuration, countWords, textualMatchPercent } from "@/lib/metrics";

// ── Subcomponente interno ─────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CaseMetricsProps {
  audioDurationSeconds: number;
  report: string;
  transcript: string;
  /** Tiempo de pipeline en ms. null → campo no disponible en este caso. */
  processingMs: number | null;
}

// ── Componente ────────────────────────────────────────────────────────────────

/**
 * Grilla de 4 métricas del caso de auditoría.
 *
 * Todas las métricas son determinísticas — no llaman al LLM.
 * El componente es pura presentación; los cálculos se delegan a lib/metrics.ts.
 */
export function CaseMetrics({
  audioDurationSeconds,
  report,
  transcript,
  processingMs,
}: CaseMetricsProps) {
  const duration = formatDuration(audioDurationSeconds);
  const wordCount = countWords(report);
  const matchPct = textualMatchPercent(report, transcript);

  const processingValue =
    processingMs !== null
      ? processingMs >= 1000
        ? `${(processingMs / 1000).toFixed(1)} s`
        : `${processingMs} ms`
      : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <MetricCard
        label="Duración audio"
        value={duration}
        sub="min:seg"
      />
      <MetricCard
        label="Palabras informe"
        value={String(wordCount)}
        sub="palabras"
      />
      <MetricCard
        label="Concordancia textual"
        value={`${matchPct}%`}
        sub="informe cubierto por audio"
      />
      <MetricCard
        label="Tiempo de proceso"
        value={processingValue}
        sub={processingMs !== null ? "pipeline completo" : "no disponible"}
      />
    </div>
  );
}
