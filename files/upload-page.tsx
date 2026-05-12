"use client";

import { useState, useRef, useCallback, DragEvent, ChangeEvent } from "react";
import { useRouter } from "next/navigation";

// ============================================================
// CONSTANTES
// ============================================================
const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/wave",
  "audio/x-wav",
  "audio/mp4",
  "audio/x-m4a",
  "audio/webm",
  "audio/ogg",
];
const ACCEPTED_EXTENSIONS = ".mp3,.wav,.m4a,.webm,.ogg";
const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const MIN_REPORT_CHARS = 50;

// ============================================================
// TIPOS
// ============================================================
type ProcessingPhase =
  | "idle"
  | "uploading"
  | "transcribing"
  | "auditing"
  | "done"
  | "error";

interface PhaseInfo {
  label: string;
  description: string;
}

const PHASE_INFO: Record<ProcessingPhase, PhaseInfo> = {
  idle: { label: "", description: "" },
  uploading: {
    label: "Subiendo audio",
    description: "Transfiriendo archivo al servidor",
  },
  transcribing: {
    label: "Transcribiendo audio",
    description: "Generando texto de referencia desde el dictado",
  },
  auditing: {
    label: "Auditando informe",
    description: "Comparando audio con informe escrito",
  },
  done: {
    label: "Listo",
    description: "Redirigiendo al informe auditado",
  },
  error: {
    label: "Error",
    description: "Algo salió mal durante el procesamiento",
  },
};

// ============================================================
// UTILIDADES
// ============================================================
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  if (!isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function validateAudioFile(file: File): string | null {
  const extension = file.name.toLowerCase().split(".").pop() ?? "";
  const validExtensions = ["mp3", "wav", "m4a", "webm", "ogg"];

  const hasValidType =
    ACCEPTED_AUDIO_TYPES.includes(file.type) ||
    validExtensions.includes(extension);

  if (!hasValidType) {
    return `Formato no soportado. Use: MP3, WAV, M4A, WebM u OGG.`;
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `El archivo supera el máximo de ${MAX_FILE_SIZE_MB} MB. Actual: ${formatBytes(
      file.size
    )}.`;
  }

  if (file.size === 0) {
    return "El archivo parece estar vacío.";
  }

  return null;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function UploadPage() {
  const router = useRouter();

  // Estado de inputs
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [reportText, setReportText] = useState("");

  // Estado de UI
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [processingPhase, setProcessingPhase] =
    useState<ProcessingPhase>("idle");
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = validateAudioFile(file);
      if (error) {
        setAudioError(error);
        setAudioFile(null);
        setAudioUrl(null);
        return;
      }

      if (audioUrl) URL.revokeObjectURL(audioUrl);

      const url = URL.createObjectURL(file);
      setAudioFile(file);
      setAudioUrl(url);
      setAudioError(null);
      setAudioDuration(null);
    },
    [audioUrl]
  );

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioFile(null);
    setAudioUrl(null);
    setAudioDuration(null);
    setAudioError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canProcess =
    audioFile !== null &&
    !audioError &&
    reportText.trim().length >= MIN_REPORT_CHARS &&
    processingPhase === "idle";

  const handleProcess = async () => {
    if (!canProcess || !audioFile) return;

    setProcessingError(null);
    setUploadProgress(0);

    try {
      setProcessingPhase("uploading");

      const formData = new FormData();
      formData.append("audio", audioFile);
      formData.append("report", reportText);

      const response = await uploadWithProgress(
        "/api/audit",
        formData,
        (pct) => setUploadProgress(pct)
      );

      setProcessingPhase("transcribing");
      await new Promise((r) => setTimeout(r, 600));

      setProcessingPhase("auditing");
      await new Promise((r) => setTimeout(r, 400));

      const data = response as { caseId: string };
      if (!data.caseId) {
        throw new Error("Respuesta del servidor sin identificador de caso.");
      }

      setProcessingPhase("done");

      setTimeout(() => {
        router.push(`/audit/${data.caseId}`);
      }, 500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error desconocido al procesar.";
      setProcessingError(message);
      setProcessingPhase("error");
    }
  };

  const handleReset = () => {
    setProcessingPhase("idle");
    setProcessingError(null);
    setUploadProgress(0);
  };

  const isProcessing =
    processingPhase !== "idle" &&
    processingPhase !== "error" &&
    processingPhase !== "done";

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-600 to-blue-800" />
            <h1 className="text-base font-semibold text-slate-900">
              Auditor Clínico
            </h1>
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              DEMO
            </span>
          </div>
          <div className="text-xs text-slate-500">Medicenter · SynapTech</div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-slate-900">
            Nuevo caso para auditar
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Suba el audio del dictado y pegue el informe transcrito. El sistema
            comparará ambas versiones y marcará las discrepancias.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-900">
                1. Audio del dictado
              </label>
              <span className="text-xs text-slate-500">
                Máx. {MAX_FILE_SIZE_MB} MB
              </span>
            </div>

            {!audioFile ? (
              <DropZone
                isDragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                error={audioError}
                disabled={isProcessing}
              />
            ) : (
              <AudioPreview
                file={audioFile}
                url={audioUrl}
                duration={audioDuration}
                onClear={clearAudio}
                onDurationLoaded={setAudioDuration}
                audioRef={audioPreviewRef}
                disabled={isProcessing}
              />
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleInputChange}
              className="hidden"
              disabled={isProcessing}
            />
          </section>

          <section className="flex flex-col">
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="report"
                className="text-sm font-semibold text-slate-900"
              >
                2. Informe transcrito
              </label>
              <span className="text-xs text-slate-500">
                {reportText.length < MIN_REPORT_CHARS
                  ? `Mín. ${MIN_REPORT_CHARS} caracteres`
                  : `${reportText.length} caracteres`}
              </span>
            </div>

            <textarea
              id="report"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              disabled={isProcessing}
              placeholder="Pegue aquí el informe escrito por la transcriptora..."
              className="min-h-[280px] flex-1 resize-none rounded-lg border border-slate-300 bg-white p-4 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            />

            <p className="mt-2 text-xs text-slate-500">
              El texto no se modificará hasta que la transcriptora apruebe cada
              sugerencia.
            </p>
          </section>
        </div>

        <div className="mt-8">
          {processingPhase === "idle" && (
            <div className="flex items-center justify-between">
              <div className="text-xs text-slate-500">
                {!audioFile && "Agregue un audio para continuar."}
                {audioFile &&
                  reportText.trim().length < MIN_REPORT_CHARS &&
                  `Agregue al menos ${MIN_REPORT_CHARS} caracteres del informe.`}
                {canProcess && "Todo listo. Puede iniciar la auditoría."}
              </div>
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                className="rounded-md bg-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                Auditar informe
              </button>
            </div>
          )}

          {(isProcessing || processingPhase === "done") && (
            <ProcessingPanel
              phase={processingPhase}
              uploadProgress={uploadProgress}
            />
          )}

          {processingPhase === "error" && (
            <ErrorPanel
              message={processingError ?? "Error desconocido."}
              onRetry={handleReset}
            />
          )}
        </div>

        <div className="mt-12 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs leading-relaxed text-amber-900">
            <strong>Aviso:</strong> Este es un entorno de demostración. No subir
            audios ni informes con datos identificatorios reales de pacientes
            hasta la validación legal correspondiente por parte de Medicenter.
          </p>
        </div>
      </div>
    </main>
  );
}

// ============================================================
// SUBCOMPONENTES
// ============================================================

function DropZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  error,
  disabled,
}: {
  isDragging: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onClick: () => void;
  error: string | null;
  disabled: boolean;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={disabled}
        className={`flex min-h-[280px] w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-white p-6 transition ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : error
            ? "border-red-300"
            : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
        } disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <UploadIcon />
        <p className="mt-3 text-sm font-medium text-slate-700">
          Arrastre el audio aquí o haga clic para seleccionar
        </p>
        <p className="mt-1 text-xs text-slate-500">
          MP3, WAV, M4A, WebM u OGG · Máx. 25 MB
        </p>
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function AudioPreview({
  file,
  url,
  duration,
  onClear,
  onDurationLoaded,
  audioRef,
  disabled,
}: {
  file: File;
  url: string | null;
  duration: number | null;
  onClear: () => void;
  onDurationLoaded: (d: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  disabled: boolean;
}) {
  return (
    <div className="flex min-h-[280px] flex-col rounded-lg border border-slate-300 bg-white p-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <AudioIcon />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">
              {file.name}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatBytes(file.size)}
              {duration !== null && ` · ${formatDuration(duration)}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClear}
          disabled={disabled}
          className="text-xs text-slate-500 hover:text-slate-900 disabled:opacity-50"
        >
          Cambiar
        </button>
      </div>

      <div className="flex-1">
        {url && (
          <audio
            ref={audioRef}
            src={url}
            controls
            preload="metadata"
            onLoadedMetadata={(e) =>
              onDurationLoaded((e.target as HTMLAudioElement).duration)
            }
            className="w-full"
          >
            Su navegador no soporta audio HTML5.
          </audio>
        )}
      </div>

      {duration !== null && duration > 600 && (
        <p className="mt-3 text-xs text-amber-700">
          Audio extenso ({formatDuration(duration)}). La transcripción puede
          tomar más tiempo de lo habitual.
        </p>
      )}
    </div>
  );
}

function ProcessingPanel({
  phase,
  uploadProgress,
}: {
  phase: ProcessingPhase;
  uploadProgress: number;
}) {
  const phases: ProcessingPhase[] = [
    "uploading",
    "transcribing",
    "auditing",
    "done",
  ];
  const currentIndex = phases.indexOf(phase);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        {phase !== "done" ? (
          <Spinner />
        ) : (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
            <CheckIcon />
          </div>
        )}
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {PHASE_INFO[phase].label}
          </p>
          <p className="text-xs text-slate-500">
            {PHASE_INFO[phase].description}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {phases.map((p, idx) => {
          const isActive = idx === currentIndex;
          const isDone = idx < currentIndex;
          return (
            <div key={p} className="flex items-center gap-3">
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 text-xs ${
                  isDone
                    ? "border-green-500 bg-green-500 text-white"
                    : isActive
                    ? "border-blue-500 bg-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isDone ? <CheckIcon /> : null}
                {isActive && !isDone && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                )}
              </div>
              <span
                className={`text-xs ${
                  isActive
                    ? "font-semibold text-slate-900"
                    : isDone
                    ? "text-slate-500"
                    : "text-slate-400"
                }`}
              >
                {PHASE_INFO[p].label}
              </span>
              {p === "uploading" && isActive && (
                <span className="ml-auto font-mono text-xs text-slate-500">
                  {uploadProgress}%
                </span>
              )}
            </div>
          );
        })}
      </div>

      {phase === "uploading" && (
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
          <span className="text-xs font-bold">!</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-red-900">
            No se pudo procesar el caso
          </p>
          <p className="mt-1 text-xs text-red-700">{message}</p>
          <button
            onClick={onRetry}
            className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Volver a intentar
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Respuesta del servidor con formato inválido."));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.message || `Error ${xhr.status}`));
        } catch {
          reject(new Error(`Error ${xhr.status} del servidor.`));
        }
      }
    });

    xhr.addEventListener("error", () =>
      reject(new Error("Error de red al subir el archivo."))
    );
    xhr.addEventListener("abort", () =>
      reject(new Error("Subida cancelada."))
    );

    xhr.open("POST", url);
    xhr.send(formData);
  });
}

// ============================================================
// ICONOS
// ============================================================
function UploadIcon() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-slate-400"
    >
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
    </svg>
  );
}

function AudioIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-blue-600"
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
    >
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="h-5 w-5 animate-spin text-blue-600"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
