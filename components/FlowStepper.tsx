"use client";

const STEPS: { n: 1 | 2 | 3 | 4; label: string }[] = [
  { n: 1, label: "Datos del examen" },
  { n: 2, label: "Cargar archivos" },
  { n: 3, label: "Auditoría IA" },
  { n: 4, label: "Aprobación" },
];

export function FlowStepper({
  activeStep,
  allComplete = false,
}: {
  activeStep: 1 | 2 | 3 | 4;
  allComplete?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-y-2">
      {STEPS.map((step, i) => {
        const isDone = step.n < activeStep || allComplete;
        const isActive = step.n === activeStep && !allComplete;
        return (
          <div key={step.n} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                  isDone
                    ? "bg-[#8BC53D] text-white"
                    : isActive
                    ? "bg-blue-600 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {isDone ? (
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
                ) : (
                  step.n
                )}
              </div>
              <span
                className={`text-xs font-medium ${
                  isActive
                    ? "text-slate-900"
                    : isDone
                    ? "text-[#6FA02C]"
                    : "text-slate-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`mx-3 h-0.5 w-10 shrink-0 ${
                  isDone ? "bg-[#8BC53D]" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
