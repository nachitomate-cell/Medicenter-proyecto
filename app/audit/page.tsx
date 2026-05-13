"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { computeScore } from "@/lib/scoring";
import type { CaseSummary, CaseStatus } from "@/lib/types";

// ============================================================
// UTILIDADES
// ============================================================
function formatTime(seconds: number): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatProcessingMs(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

// ============================================================
// STATUS BADGE
// ============================================================
const STATUS_CONFIG: Record<CaseStatus, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-slate-100 text-slate-600" },
  attention: { label: "Requiere atención", classes: "bg-red-100 text-red-700" },
  approved: { label: "Aprobado", classes: "bg-[#8BC53D]/20 text-[#4a7a1e]" },
};

function StatusBadge({ status }: { status: CaseStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.classes}`}>
      {cfg.label}
    </span>
  );
}

// ============================================================
// CONFIG DE NIVEL
// ============================================================
const NIVEL_STYLES = {
  verde: { bg: "bg-[#8BC53D]", text: "text-[#6FA02C]", label: "Óptimo" },
  amarillo: { bg: "bg-amber-500", text: "text-amber-700", label: "Revisar" },
  rojo: { bg: "bg-red-500", text: "text-red-700", label: "Atención" },
} as const;

// ============================================================
// KPI CARD
// ============================================================
function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 text-3xl font-bold ${accent ?? "text-slate-900"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cases")
      .then((r) => {
        if (!r.ok) throw new Error("No se pudieron cargar los casos.");
        return r.json();
      })
      .then((data) => setCases(data))
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const weekStart = startOfWeek();
    const thisWeek = cases.filter((c) => new Date(c.createdAt) >= weekStart).length;
    const approved = cases.filter((c) => c.status === "approved").length;
    const attention = cases.filter((c) => c.status === "attention").length;
    const scores = cases.map((c) => computeScore(c.counts).score);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    return { thisWeek, approved, attention, avgScore };
  }, [cases]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-6 w-6 text-blue-600"
            >
              <path d="M2 12h2" />
              <path d="M6 8v8" />
              <path d="M10 6v12" />
              <path d="M14 10l2 2 4-4" />
              <path d="M14 18l2 2 4-4" />
            </svg>
            <h1 className="text-base font-semibold text-slate-900">
              Auditor Clínico
            </h1>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium tracking-wide text-slate-600 uppercase">
              DEMO
            </span>
          </div>
          <div className="flex items-center gap-3 text-right">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0B3B5C]">
              <span className="text-[10px] font-bold text-white">MC</span>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-slate-900">
                Medicenter
              </span>
              <span className="text-xs text-slate-400">
                powered by SynapTech
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <nav className="mb-3 text-xs text-slate-400">Inicio · Casos</nav>

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">
              Historial de auditorías
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading
                ? "Cargando..."
                : `${cases.length} caso${cases.length !== 1 ? "s" : ""} procesado${cases.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            + Nuevo caso
          </button>
        </div>

        {/* ── KPI DASHBOARD ─────────────────────────────────── */}
        {!isLoading && !error && cases.length > 0 && (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard
              label="Esta semana"
              value={kpis.thisWeek}
              sub="auditorías iniciadas"
            />
            <KpiCard
              label="Score promedio"
              value={`${kpis.avgScore}`}
              sub="sobre 100 puntos"
              accent={
                kpis.avgScore >= 80
                  ? "text-[#6FA02C]"
                  : kpis.avgScore >= 60
                  ? "text-amber-600"
                  : "text-red-600"
              }
            />
            <KpiCard
              label="Aprobados"
              value={kpis.approved}
              sub={`de ${cases.length} casos`}
              accent="text-[#6FA02C]"
            />
            <KpiCard
              label="Requieren atención"
              value={kpis.attention}
              sub="con hallazgos críticos"
              accent={kpis.attention > 0 ? "text-red-600" : "text-slate-900"}
            />
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {!isLoading && !error && cases.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white py-24 text-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mb-4 h-12 w-12 text-slate-300"
            >
              <path d="M9 12h6M9 16h4M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
            </svg>
            <p className="text-sm font-medium text-slate-600">
              Sin auditorías aún
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Cargue un audio y un informe para comenzar.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Crear primera auditoría
            </button>
          </div>
        )}

        {!isLoading && !error && cases.length > 0 && (
          <div className="space-y-3">
            {cases.map((c) => {
              const score = computeScore(c.counts);
              const nivel = NIVEL_STYLES[score.nivel];
              return (
                <button
                  key={c.id}
                  onClick={() => router.push(`/audit/${c.id}`)}
                  className="group w-full rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    {/* Izquierda: info del caso */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-medium text-slate-400">
                          #{c.id.slice(0, 8).toUpperCase()}
                        </span>
                        <StatusBadge status={c.status} />
                        {c.modelName && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                            {c.modelName}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-slate-900 group-hover:text-blue-700">
                        {c.examType !== "—" ? c.examType : c.audioFileName}
                      </p>
                      {c.patientCode !== "—" && (
                        <p className="mt-0.5 font-mono text-xs text-slate-500">
                          {c.patientCode}
                          {c.radiologist !== "—" && ` · Dr/a. ${c.radiologist}`}
                        </p>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {formatDate(c.createdAt)} · {formatTime(c.audioDurationSeconds)} · {formatProcessingMs(c.processingMs)}
                      </p>
                    </div>

                    {/* Centro: conteo de discrepancias */}
                    <div className="flex items-center gap-3">
                      <DiscrepancyBadge
                        label="Crítico"
                        count={c.counts.critical}
                        color="text-red-700 bg-red-50 border-red-200"
                      />
                      <DiscrepancyBadge
                        label="Adv."
                        count={c.counts.warning}
                        color="text-amber-700 bg-amber-50 border-amber-200"
                      />
                      <DiscrepancyBadge
                        label="Estilo"
                        count={c.counts.style}
                        color="text-emerald-700 bg-emerald-50 border-emerald-200"
                      />
                    </div>

                    {/* Derecha: score */}
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={`inline-block h-3 w-3 rounded-full ${nivel.bg}`}
                      />
                      <span className={`text-sm font-bold ${nivel.text}`}>
                        {score.score}
                        <span className="text-xs font-normal text-slate-400">
                          /100
                        </span>
                      </span>
                      <span className={`text-xs ${nivel.text}`}>
                        {nivel.label}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="ml-1 h-4 w-4 text-slate-300 group-hover:text-blue-400"
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

function DiscrepancyBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      className={`flex flex-col items-center rounded-md border px-2.5 py-1.5 text-xs ${color}`}
    >
      <span className="font-bold leading-none">{count}</span>
      <span className="mt-0.5 leading-none opacity-80">{label}</span>
    </div>
  );
}
