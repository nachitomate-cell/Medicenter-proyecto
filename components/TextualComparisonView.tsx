"use client";

import React, { useMemo } from "react";
import { diffWordsWithSpace } from "diff";
import type { Change } from "diff";

// ── Clasificación de cambios ───────────────────────────────────────────────────

interface ClassifiedChange extends Change {
  kind: "unchanged" | "removed" | "added" | "changed";
}

function classifyChanges(changes: Change[]): ClassifiedChange[] {
  const result: ClassifiedChange[] = [];
  for (let i = 0; i < changes.length; i++) {
    const cur = changes[i];
    const next = changes[i + 1];
    if (cur.removed && next?.added) {
      result.push({ ...cur, kind: "changed" });
      result.push({ ...next, kind: "changed" });
      i++;
    } else if (cur.added) {
      result.push({ ...cur, kind: "added" });
    } else if (cur.removed) {
      result.push({ ...cur, kind: "removed" });
    } else {
      result.push({ ...cur, kind: "unchanged" });
    }
  }
  return result;
}

const DIFF_CLASSES: Record<
  ClassifiedChange["kind"],
  { left: string; right: string }
> = {
  unchanged: { left: "", right: "" },
  removed: {
    left: "bg-red-100 text-red-800 rounded px-0.5",
    right: "",
  },
  added: {
    left: "",
    right: "bg-green-100 text-green-800 rounded px-0.5",
  },
  changed: {
    left: "bg-amber-100 text-amber-800 rounded px-0.5",
    right: "bg-amber-100 text-amber-800 rounded px-0.5",
  },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface TextualComparisonViewProps {
  transcription: string;
  report: string;
  preinforme?: string;
  /** Etiqueta de la columna de audio (modelo/proveedor de transcripción). */
  transcriptionLabel?: string;
}

// ── Columna de diff ───────────────────────────────────────────────────────────

function DiffColumn({
  title,
  subtitle,
  tokens,
  side,
}: {
  title: string;
  subtitle: React.ReactNode;
  tokens: ClassifiedChange[];
  side: "left" | "right";
}) {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
          {title}
        </p>
        <p className="text-xs text-slate-400">{subtitle}</p>
      </div>
      <div className="flex-1 overflow-auto p-5">
        <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
          {tokens.map((c, i) => (
            <span key={i} className={DIFF_CLASSES[c.kind][side]}>
              {c.value}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function TextualComparisonView({
  transcription,
  report,
  preinforme,
  transcriptionLabel = "Audio (transcripción)",
}: TextualComparisonViewProps) {
  const audioVsReport = useMemo(
    () => classifyChanges(diffWordsWithSpace(transcription, report)),
    [transcription, report]
  );

  const preinformeVsReport = useMemo(
    () =>
      preinforme
        ? classifyChanges(diffWordsWithSpace(preinforme, report))
        : null,
    [preinforme, report]
  );

  const audioLeft = audioVsReport.filter(
    (c) => c.kind === "unchanged" || c.kind === "removed" || c.kind === "changed"
  );
  const reportRight = audioVsReport.filter(
    (c) => c.kind === "unchanged" || c.kind === "added" || c.kind === "changed"
  );

  const preLeft = preinformeVsReport?.filter(
    (c) => c.kind === "unchanged" || c.kind === "removed" || c.kind === "changed"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Leyenda */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p className="font-semibold text-slate-700">¿Cómo leer esta vista?</p>
        <p className="mt-1 leading-relaxed">
          Comparación palabra a palabra.{" "}
          <span className="inline-block rounded bg-red-100 px-1 text-red-700">
            Rojo
          </span>{" "}
          = texto en la fuente izquierda omitido en el informe.{" "}
          <span className="inline-block rounded bg-green-100 px-1 text-green-700">
            Verde
          </span>{" "}
          = texto agregado en el informe.{" "}
          <span className="inline-block rounded bg-amber-100 px-1 text-amber-700">
            Amarillo
          </span>{" "}
          = palabra distinta. Sin color = coincide exactamente.
        </p>
        <p className="mt-2 leading-relaxed text-slate-500">
          Vista diagnóstica. Parte de las diferencias son ruido de la
          transcripción automática (homófonos, términos técnicos), no errores de
          la transcriptora. Las discrepancias <strong>clínicamente relevantes</strong>,
          ya filtradas por el auditor, están en la pestaña{" "}
          <strong>Discrepancias</strong>.
        </p>
      </div>

      {/* Panel: Audio vs Informe */}
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        Audio vs Informe
      </p>
      <div className="flex min-h-[400px] gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 shadow-sm">
        <DiffColumn
          title={transcriptionLabel}
          subtitle="rojo = omitido en el informe"
          tokens={audioLeft}
          side="left"
        />
        <DiffColumn
          title="Informe escrito"
          subtitle="verde = agregado · amarillo = modificado"
          tokens={reportRight}
          side="right"
        />
      </div>

      {/* Panel: Preinforme vs Informe (solo si existe preinforme) */}
      {preLeft && preinformeVsReport && (
        <>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Preinforme tecnólogo vs Informe
          </p>
          <div className="flex min-h-[400px] gap-px overflow-hidden rounded-lg border border-blue-200 bg-blue-200 shadow-sm">
            <DiffColumn
              title="Preinforme tecnólogo"
              subtitle="rojo = omitido en el informe"
              tokens={preLeft}
              side="left"
            />
            <DiffColumn
              title="Informe escrito"
              subtitle="verde = agregado · amarillo = modificado"
              tokens={preinformeVsReport.filter(
                (c) =>
                  c.kind === "unchanged" ||
                  c.kind === "added" ||
                  c.kind === "changed"
              )}
              side="right"
            />
          </div>
        </>
      )}
    </div>
  );
}
