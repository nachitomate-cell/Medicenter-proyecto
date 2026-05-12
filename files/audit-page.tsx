"use client";

import { useState, useRef, useEffect, useMemo } from "react";

// ============================================================
// TIPOS
// ============================================================
type Severity = "critical" | "warning" | "style";

interface Discrepancy {
  id: string;
  severity: Severity;
  audioTimestamp: number;
  audioQuote: string;
  reportQuote: string;
  reportRange: [number, number];
  explanation: string;
}

// ============================================================
// DATOS MOCKEADOS — Caso: Ecografía Abdominal
// ============================================================
const MOCK_REPORT = `ECOGRAFÍA ABDOMINAL

Paciente: [REDACTADO]
Fecha: 24-04-2026

HÍGADO: De tamaño y ecogenicidad conservadas. No se observan lesiones focales. Vena porta permeable.

VESÍCULA BILIAR: Distendida, de paredes finas. En su interior se identifica imagen hiperecogénica de 8 mm compatible con cálculo, con sombra acústica posterior.

VÍA BILIAR: No dilatada. Colédoco de 4 mm.

PÁNCREAS: Parcialmente visualizado por interposición gaseosa. Segmentos visibles sin alteraciones.

BAZO: De tamaño normal, homogéneo. Mide 11 cm en su eje mayor.

RIÑONES: Ambos de tamaño y morfología conservadas. Riñón derecho mide 10,2 cm, riñón izquierdo 10,5 cm. No se observan litiasis ni dilatación pielocalicial.

VEJIGA: Adecuadamente distendida, de paredes finas, contenido anecoico.

CONCLUSIÓN: Colelitiasis. Resto del examen sin hallazgos patológicos.`;

const MOCK_DISCREPANCIES: Discrepancy[] = [
  {
    id: "d1",
    severity: "critical",
    audioTimestamp: 42,
    audioQuote: "cálculo de 12 milímetros",
    reportQuote: "cálculo de 8 mm",
    reportRange: [MOCK_REPORT.indexOf("8 mm"), MOCK_REPORT.indexOf("8 mm") + 4],
    explanation:
      "Discrepancia en la medida del cálculo vesicular. El audio indica 12 mm; el informe registra 8 mm. Esta diferencia puede modificar la conducta clínica (indicación quirúrgica).",
  },
  {
    id: "d2",
    severity: "critical",
    audioTimestamp: 118,
    audioQuote: "bazo de 13 centímetros, levemente aumentado",
    reportQuote: "Bazo de tamaño normal, 11 cm",
    reportRange: [
      MOCK_REPORT.indexOf("BAZO"),
      MOCK_REPORT.indexOf("eje mayor.") + "eje mayor.".length,
    ],
    explanation:
      "El audio describe esplenomegalia leve (13 cm). El informe registra bazo normal (11 cm). Se pierde un hallazgo clínicamente relevante.",
  },
  {
    id: "d3",
    severity: "warning",
    audioTimestamp: 95,
    audioQuote: "páncreas no visualizado en su totalidad por meteorismo",
    reportQuote: "Parcialmente visualizado por interposición gaseosa",
    reportRange: [
      MOCK_REPORT.indexOf("PÁNCREAS"),
      MOCK_REPORT.indexOf("sin alteraciones.") + "sin alteraciones.".length,
    ],
    explanation:
      "Parafraseo técnico aceptable, pero el término 'meteorismo' fue reemplazado por 'interposición gaseosa'. Revisar si corresponde al estilo institucional.",
  },
  {
    id: "d4",
    severity: "warning",
    audioTimestamp: 152,
    audioQuote: "no se observan litiasis ni signos de hidronefrosis",
    reportQuote: "No se observan litiasis ni dilatación pielocalicial",
    reportRange: [
      MOCK_REPORT.indexOf("No se observan litiasis"),
      MOCK_REPORT.indexOf("pielocalicial.") + "pielocalicial.".length,
    ],
    explanation:
      "'Hidronefrosis' fue transcrito como 'dilatación pielocalicial'. Términos clínicamente equivalentes pero el primero es más específico. Verificar preferencia del radiólogo.",
  },
  {
    id: "d5",
    severity: "style",
    audioTimestamp: 15,
    audioQuote: "hígado de tamaño y ecogenicidad normales",
    reportQuote: "De tamaño y ecogenicidad conservadas",
    reportRange: [
      MOCK_REPORT.indexOf("De tamaño y ecogenicidad"),
      MOCK_REPORT.indexOf("conservadas.") + "conservadas.".length,
    ],
    explanation:
      "Diferencia redaccional sin impacto clínico ('normales' vs 'conservadas').",
  },
  {
    id: "d6",
    severity: "style",
    audioTimestamp: 180,
    audioQuote: "vejiga bien distendida, sin alteraciones",
    reportQuote:
      "Adecuadamente distendida, de paredes finas, contenido anecoico",
    reportRange: [
      MOCK_REPORT.indexOf("Adecuadamente distendida"),
      MOCK_REPORT.indexOf("anecoico.") + "anecoico.".length,
    ],
    explanation:
      "El informe expande la descripción con detalles técnicos estándar no verbalizados en el audio. Práctica habitual; sin riesgo clínico.",
  },
];

// Audio de ejemplo (placeholder público). Reemplazar con audio real del dictado.
const MOCK_AUDIO_URL =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
const MOCK_AUDIO_DURATION = 225;

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

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AuditPage() {
  const [discrepancies] = useState<Discrepancy[]>(MOCK_DISCREPANCIES);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Severity | "all">("all");
  const [reportText, setReportText] = useState(MOCK_REPORT);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(MOCK_AUDIO_DURATION);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onLoad = () => setDuration(audio.duration || MOCK_AUDIO_DURATION);
    const onEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoad);
    audio.addEventListener("ended", onEnd);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoad);
      audio.removeEventListener("ended", onEnd);
    };
  }, []);

  const counts = useMemo(() => {
    return {
      critical: discrepancies.filter((d) => d.severity === "critical").length,
      warning: discrepancies.filter((d) => d.severity === "warning").length,
      style: discrepancies.filter((d) => d.severity === "style").length,
      total: discrepancies.length,
    };
  }, [discrepancies]);

  const filtered = useMemo(() => {
    if (filter === "all") return discrepancies;
    return discrepancies.filter((d) => d.severity === filter);
  }, [discrepancies, filter]);

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
        parts.push({
          type: "text",
          content: reportText.slice(cursor, r.start),
        });
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

  return (
    <main className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-600 to-blue-800" />
              <h1 className="text-base font-semibold text-slate-900">
                Auditor Clínico
              </h1>
              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                DEMO
              </span>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Ecografía abdominal · Caso #EC-2026-0418 · Medicenter
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50">
              Cargar otro caso
            </button>
            <button className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800">
              Aprobar informe
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-6 pb-32">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
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

          <aside className="flex flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Discrepancias detectadas
              </h2>
              <p className="text-xs text-slate-500">
                {counts.total} hallazgos · Ordenados por severidad
              </p>
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
                          </div>
                          <span className="font-mono text-xs text-slate-500">
                            {formatTime(d.audioTimestamp)}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="flex gap-2">
                            <span className="shrink-0 font-semibold text-slate-500">
                              Audio:
                            </span>
                            <span className="text-slate-700">
                              &ldquo;{d.audioQuote}&rdquo;
                            </span>
                          </div>
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
      </div>

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
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
                {discrepancies.map((d) => {
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
        <audio ref={audioRef} src={MOCK_AUDIO_URL} preload="metadata" />
      </div>
    </main>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================
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
