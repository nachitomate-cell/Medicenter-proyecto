"use client";

import { use, useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { AuditCase, Discrepancy, Severity } from "@/lib/types";
import { computeScore } from "@/lib/scoring";
import { ConcordanceScore } from "@/components/ConcordanceScore";
import { CaseMetrics } from "@/components/CaseMetrics";
import { TextualComparisonView } from "@/components/TextualComparisonView";
import { FlowStepper } from "@/components/FlowStepper";

// ============================================================
// CONFIG DE SEVERIDAD
// ============================================================
const SEVERITY_CONFIG: Record<
  Severity,
  {
    label: string;
    dot: string;
    bg: string;
    bgSoft: string;
    border: string;
    text: string;
    highlight: string;
  }
> = {
  critical: {
    label: "Crítico",
    dot: "bg-red-500",
    bg: "bg-red-50",
    bgSoft: "bg-red-100",
    border: "border-red-200",
    text: "text-red-700",
    highlight: "bg-red-100 border-b-2 border-red-500",
  },
  warning: {
    label: "Advertencia",
    dot: "bg-amber-500",
    bg: "bg-amber-50",
    bgSoft: "bg-amber-100",
    border: "border-amber-200",
    text: "text-amber-700",
    highlight: "bg-amber-100 border-b-2 border-amber-500",
  },
  style: {
    label: "Estilo",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50",
    bgSoft: "bg-emerald-100",
    border: "border-emerald-200",
    text: "text-emerald-700",
    highlight: "bg-emerald-100 border-b-2 border-emerald-500",
  },
};

// ============================================================
// UTILIDADES
// ============================================================
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatProcessingMs(ms?: number): string {
  if (!ms) return "tiempo desconocido";
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  return `${min} min ${sec} s`;
}

// ConcordanceBadge extraído a components/ConcordanceScore.tsx (Feature 1)
// MetricCard / MetricsRow extraídos a components/CaseMetrics.tsx (Feature 2)
// classifyChanges / DiffPanel extraídos a components/TextualComparisonView.tsx (Feature 3)

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
type ViewMode = "discrepancias" | "diff";

export default function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [caseData, setCaseData] = useState<AuditCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [viewMode, setViewMode] = useState<ViewMode>("discrepancias");

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    async function fetchCase() {
      try {
        const res = await fetch(`/api/cases/${id}`);
        if (!res.ok) throw new Error("No se pudo cargar el caso.");
        const data = await res.json();
        setCaseData(data);
        setDuration(data.metadata?.audioDurationSeconds || 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchCase();
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () =>
      setDuration(
        audio.duration || (caseData?.metadata?.audioDurationSeconds ?? 0)
      );
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended", onEnd);
    };
  }, [caseData]);

  const discrepancies = useMemo(
    () => caseData?.discrepancies || [],
    [caseData]
  );
  const reportText = useMemo(() => caseData?.report || "", [caseData]);
  const transcriptionText = useMemo(
    () => caseData?.transcription || "",
    [caseData]
  );
  const preinformeText = useMemo(() => caseData?.preinforme || "", [caseData]);

  const counts = useMemo(
    () => ({
      critical: discrepancies.filter((d) => d.severity === "critical").length,
      warning: discrepancies.filter((d) => d.severity === "warning").length,
      style: discrepancies.filter((d) => d.severity === "style").length,
      total: discrepancies.length,
    }),
    [discrepancies]
  );

  const filtered = useMemo(() => {
    if (filter === "all") return discrepancies;
    return discrepancies.filter((d) => d.severity === filter);
  }, [discrepancies, filter]);

  const scoringResult = useMemo(() => computeScore(counts), [counts]);

  const handleDiscrepancyClick = (d: Discrepancy) => {
    setActiveId(d.id);
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = d.audioTimestamp;
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
    setTimeout(() => {
      const el = document.getElementById(`hl-${d.id}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const seek = (t: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const handleApprove = useCallback(async () => {
    if (!caseData) return;
    setIsApproving(true);
    setApprovalError(null);
    try {
      const res = await fetch(`/api/cases/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      setCaseData((prev) => prev ? { ...prev, status: "approved", approvedAt: new Date().toISOString() } : prev);
      setShowApprovalModal(false);
    } catch (err) {
      setApprovalError(err instanceof Error ? err.message : "Error desconocido.");
    } finally {
      setIsApproving(false);
    }
  }, [caseData, id]);

  const renderedReport = useMemo(() => {
    const ranges = discrepancies
      .filter((d) => d.reportRange[0] >= 0)
      .map((d) => ({ ...d, start: d.reportRange[0], end: d.reportRange[1] }))
      .sort((a, b) => a.start - b.start);

    const parts: Array<
      | { type: "text"; content: string }
      | { type: "highlight"; d: Discrepancy; content: string }
    > = [];

    let cursor = 0;
    for (const r of ranges) {
      if (r.start < cursor) continue;
      if (r.start > cursor) {
        parts.push({ type: "text", content: reportText.slice(cursor, r.start) });
      }
      parts.push({
        type: "highlight",
        d: r,
        content: reportText.slice(r.start, r.end),
      });
      cursor = r.end;
    }
    if (cursor < reportText.length) {
      parts.push({ type: "text", content: reportText.slice(cursor) });
    }

    return parts;
  }, [reportText, discrepancies]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">
            Cargando auditoría...
          </p>
        </div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Error al cargar el caso
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {error || "El caso no existe o no se pudo recuperar."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      {/* ── HEADER ────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6 text-blue-600">
              <path d="M2 12h2"/>
              <path d="M6 8v8"/>
              <path d="M10 6v12"/>
              <path d="M14 10l2 2 4-4"/>
              <path d="M14 18l2 2 4-4"/>
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
              <span className="text-sm font-semibold text-slate-900">Medicenter</span>
              <span className="text-xs text-slate-400">powered by SynapTech</span>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <div className="mx-auto max-w-[1400px]">
            <FlowStepper activeStep={4} allComplete={caseData?.status === "approved"} />
          </div>
        </div>
      </header>

      {/* ── MODAL APROBACIÓN ─────────────────────────────────── */}
      {showApprovalModal && caseData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Aprobar informe</h3>
            <p className="mt-1 text-sm text-slate-500">
              Al aprobar, el informe quedará marcado como revisado y validado por el radiólogo.
            </p>

            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Tipo de examen</span>
                <span className="font-medium text-slate-900">{caseData.examType ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Paciente</span>
                <span className="font-mono font-medium text-slate-900">{caseData.patientCode ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Radiólogo</span>
                <span className="font-medium text-slate-900">{caseData.radiologist ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hallazgos críticos</span>
                <span className={`font-medium ${counts.critical > 0 ? "text-red-600" : "text-[#6FA02C]"}`}>
                  {counts.critical}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Score de concordancia</span>
                <span className="font-medium text-slate-900">{scoringResult.score}/100</span>
              </div>
            </div>

            {counts.critical > 0 && (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Este caso tiene hallazgos críticos. Asegúrese de haberlos revisado antes de aprobar.
              </div>
            )}

            {approvalError && (
              <p className="mt-3 text-xs text-red-600">{approvalError}</p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setShowApprovalModal(false); setApprovalError(null); }}
                disabled={isApproving}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="rounded-md bg-[#8BC53D] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#6FA02C] disabled:opacity-50"
              >
                {isApproving ? "Aprobando..." : "Confirmar aprobación"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6 pb-32">
        <nav className="mb-3 text-xs text-slate-400">
          Inicio · Casos · {id.slice(0, 8).toUpperCase()}
        </nav>
        
        {/* ── BANNER APROBADO ───────────────────────────────────── */}
        {caseData.status === "approved" && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-[#8BC53D]/40 bg-[#8BC53D]/10 px-4 py-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4a7a1e" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p className="text-sm font-medium text-[#4a7a1e]">
              Informe aprobado
              {caseData.approvedAt && (
                <span className="ml-2 font-normal text-[#6FA02C]">
                  · {new Date(caseData.approvedAt).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </p>
          </div>
        )}

        {/* ── INFO DEL CASO ──────────────────────────────────────── */}
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">
                Caso #{id.slice(0, 8).toUpperCase()}
              </h2>
              {(caseData.examType || caseData.patientCode) && (
                <p className="mt-1 text-sm font-medium text-slate-700">
                  {caseData.examType ?? "—"}
                  {caseData.patientCode && (
                    <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                      {caseData.patientCode}
                    </span>
                  )}
                </p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500">
                {caseData.technologist && caseData.technologist !== "Sin especificar" && (
                  <span>Tecnólogo: <span className="font-medium text-slate-700">{caseData.technologist}</span></span>
                )}
                {caseData.radiologist && caseData.radiologist !== "Sin especificar" && (
                  <span>Radiólogo: <span className="font-medium text-slate-700">{caseData.radiologist}</span></span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {caseData.metadata.audioFileName} · {formatTime(duration)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">
                Procesado en {formatProcessingMs(caseData.metadata.processingMs)} · Modelo: {caseData.metadata.modelName ?? "Desconocido"} · Prompt v{caseData.metadata.promptVersion}
              </p>
            </div>

            {/* Feature 1 — Score de Concordancia */}
            <div className="shrink-0 md:w-[280px]">
              <ConcordanceScore result={scoringResult} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              onClick={() => router.push("/audit")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Ver todos los casos
            </button>
            <button
              onClick={() => router.push("/")}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-50"
            >
              Nuevo caso
            </button>
            {caseData.status === "approved" ? (
              <div className="flex items-center gap-1.5 rounded-md border border-[#8BC53D]/40 bg-[#8BC53D]/10 px-3 py-1.5 text-sm font-medium text-[#4a7a1e]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Aprobado
              </div>
            ) : (
              <button
                onClick={() => setShowApprovalModal(true)}
                className="rounded-md bg-[#8BC53D] px-3 py-1.5 text-sm font-medium text-white transition hover:bg-[#6FA02C]"
              >
                Aprobar informe
              </button>
            )}
          </div>
        </div>

        {/* Feature 2 — Panel de Métricas */}
        <div className="mb-6">
          <CaseMetrics
            audioDurationSeconds={caseData.metadata.audioDurationSeconds}
            report={reportText}
            transcript={transcriptionText}
            processingMs={caseData.metadata.processingMs ?? null}
          />
        </div>

        {/* Feature 3 — Toggle de vista + contenido */}
        {viewMode === "diff" ? (
          /* Vista diff: full-width */
          <div className="flex flex-col gap-3">
            <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
            <TextualComparisonView
              transcription={transcriptionText}
              report={reportText}
              preinforme={preinformeText || undefined}
            />
          </div>
        ) : (
          /* Vista discrepancias: 2 columnas */
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
            {/* Panel izquierdo — Informe */}
            <section className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Informe transcrito
                  </h2>
                  <p className="text-xs text-slate-500">
                    Transcriptora: M. González · Revisar marcas del auditor
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">
                    {reportText.split(/\s+/).filter(Boolean).length} palabras
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
                  {renderedReport.map((part, i) => {
                    if (part.type === "text") {
                      return <span key={i}>{part.content}</span>;
                    }
                    const cfg = SEVERITY_CONFIG[part.d.severity];
                    const isActive = activeId === part.d.id;
                    return (
                      <span
                        key={i}
                        id={`hl-${part.d.id}`}
                        onClick={() => handleDiscrepancyClick(part.d)}
                        className={`cursor-pointer rounded px-0.5 transition ${cfg.highlight} ${
                          isActive ? "ring-2 ring-offset-1 ring-slate-400" : ""
                        }`}
                        title="Click para escuchar el audio original"
                      >
                        {part.content}
                      </span>
                    );
                  })}
                </pre>
              </div>
            </section>

            {/* Panel derecho — Discrepancias */}
            <aside className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Discrepancias detectadas
                    </h2>
                    <p className="text-xs text-slate-500">
                      {counts.total} hallazgos · Ordenados por severidad
                    </p>
                  </div>
                  <ViewToggle viewMode={viewMode} onToggle={setViewMode} />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 border-b border-slate-200 px-3 py-3">
                <FilterPill
                  label="Todos"
                  count={counts.total}
                  active={filter === "all"}
                  onClick={() => setFilter("all")}
                  dotClass="bg-slate-400"
                />
                <FilterPill
                  label="Crítico"
                  count={counts.critical}
                  active={filter === "critical"}
                  onClick={() => setFilter("critical")}
                  dotClass={SEVERITY_CONFIG.critical.dot}
                />
                <FilterPill
                  label="Adv."
                  count={counts.warning}
                  active={filter === "warning"}
                  onClick={() => setFilter("warning")}
                  dotClass={SEVERITY_CONFIG.warning.dot}
                />
                <FilterPill
                  label="Estilo"
                  count={counts.style}
                  active={filter === "style"}
                  onClick={() => setFilter("style")}
                  dotClass={SEVERITY_CONFIG.style.dot}
                />
              </div>

              <div className="flex-1 overflow-auto p-3">
                <ul className="space-y-2">
                  {filtered.map((d) => {
                    const cfg = SEVERITY_CONFIG[d.severity];
                    const isActive = activeId === d.id;
                    return (
                      <li key={d.id}>
                        <button
                          onClick={() => handleDiscrepancyClick(d)}
                          className={`w-full rounded-lg border p-3 text-left transition hover:shadow-sm ${cfg.border} ${cfg.bg} ${
                            isActive ? "ring-2 ring-slate-400" : ""
                          }`}
                        >
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className={`h-2 w-2 rounded-full ${cfg.dot}`}
                              />
                              <span
                                className={`text-xs font-semibold ${cfg.text}`}
                              >
                                {cfg.label}
                              </span>
                              {d.source && (
                                <SourceBadge source={d.source} />
                              )}
                            </div>
                            <span className="font-mono text-xs text-slate-500">
                              {formatTime(d.audioTimestamp)}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {d.audioQuote && (
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-slate-500">
                                  Audio:
                                </span>
                                <span className="text-slate-700">
                                  &ldquo;{d.audioQuote}&rdquo;
                                </span>
                              </div>
                            )}
                            {d.preinformeQuote && (
                              <div className="flex gap-2">
                                <span className="shrink-0 font-semibold text-blue-500">
                                  Preinforme:
                                </span>
                                <span className="text-slate-700">
                                  &ldquo;{d.preinformeQuote}&rdquo;
                                </span>
                              </div>
                            )}
                            <div className="flex gap-2">
                              <span className="shrink-0 font-semibold text-slate-500">
                                Informe:
                              </span>
                              <span className="text-slate-700">
                                &ldquo;{d.reportQuote}&rdquo;
                              </span>
                            </div>
                          </div>

                          <p className="mt-2 border-t border-slate-200 pt-2 text-xs leading-relaxed text-slate-600">
                            {d.explanation}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                  {filtered.length === 0 && (
                    <li className="py-8 text-center text-sm text-slate-400">
                      Sin discrepancias en este filtro.
                    </li>
                  )}
                </ul>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ── PLAYER FLOTANTE ───────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-6 py-3">
          <button
            onClick={togglePlay}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition hover:bg-slate-700"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            {isPlaying ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="5" width="4" height="14" />
                <rect x="14" y="5" width="4" height="14" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div className="flex flex-1 items-center gap-3">
            <span className="w-12 font-mono text-xs text-slate-600">
              {formatTime(currentTime)}
            </span>

            <div className="relative flex-1">
              <div className="relative h-2 rounded-full bg-slate-200">
                <div
                  className="absolute left-0 top-0 h-full rounded-full bg-slate-900"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                {duration > 0 && discrepancies.map((d) => {
                  const cfg = SEVERITY_CONFIG[d.severity];
                  return (
                    <button
                      key={d.id}
                      onClick={() => handleDiscrepancyClick(d)}
                      className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white ${cfg.dot} transition hover:scale-125`}
                      style={{
                        left: `${(d.audioTimestamp / duration) * 100}%`,
                      }}
                      title={`${cfg.label} · ${formatTime(d.audioTimestamp)}`}
                    />
                  );
                })}
              </div>
              <input
                type="range"
                min={0}
                max={duration}
                value={currentTime}
                onChange={(e) => seek(Number(e.target.value))}
                className="absolute inset-0 h-2 w-full cursor-pointer opacity-0"
              />
            </div>

            <span className="w-12 font-mono text-xs text-slate-500">
              {formatTime(duration)}
            </span>
          </div>

          <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
            <span>Dr. P. Muñoz · Radiología</span>
          </div>
        </div>
        <audio ref={audioRef} src={caseData.audioUrl || ""} preload="metadata" />
      </div>
    </main>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================

const SOURCE_LABELS: Record<string, { label: string; color: string }> = {
  audio_informe: { label: "Audio↔Informe", color: "bg-slate-100 text-slate-600" },
  preinforme_informe: { label: "Preinforme↔Informe", color: "bg-blue-100 text-blue-700" },
  audio_preinforme: { label: "Audio↔Preinforme", color: "bg-purple-100 text-purple-700" },
  triple: { label: "Triple", color: "bg-orange-100 text-orange-700" },
};

function SourceBadge({ source }: { source: string }) {
  const config = SOURCE_LABELS[source];
  if (!config) return null;
  return (
    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}

function FilterPill({
  label,
  count,
  active,
  onClick,
  dotClass,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dotClass: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center rounded-md border px-2 py-2 text-xs transition ${
        active
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      }`}
    >
      <div className="flex items-center gap-1">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <span className="font-medium">{label}</span>
      </div>
      <span className={active ? "text-white" : "font-semibold text-slate-900"}>
        {count}
      </span>
    </button>
  );
}

function ViewToggle({
  viewMode,
  onToggle,
}: {
  viewMode: ViewMode;
  onToggle: (v: ViewMode) => void;
}) {
  return (
    <div className="flex shrink-0 items-center rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs">
      <button
        onClick={() => onToggle("discrepancias")}
        className={`rounded px-2.5 py-1 font-medium transition ${
          viewMode === "discrepancias"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Discrepancias
      </button>
      <button
        onClick={() => onToggle("diff")}
        className={`rounded px-2.5 py-1 font-medium transition ${
          viewMode === "diff"
            ? "bg-white text-slate-900 shadow-sm"
            : "text-slate-500 hover:text-slate-700"
        }`}
      >
        Comparación textual
      </button>
    </div>
  );
}
