# Auditor Clínico — Medicenter

Control de calidad **asistido por IA** para informes de ecografía.

El sistema recibe el **audio del dictado** del médico radiólogo y el **informe
transcrito** por el equipo de transcripción, los compara y marca las
**discrepancias clasificadas por severidad clínica** (crítico / advertencia /
estilo). Opcionalmente incorpora el **preinforme del tecnólogo** para una
comparación triple.

> **La IA no reemplaza a nadie.** Asiste al equipo que ya existe, haciéndolo más
> rápido y más seguro. El sistema **nunca modifica el informe**: solo señala, y
> el humano decide qué corregir (human-in-the-loop).

_Producto de **SynapTech** desarrollado para **Medicenter** (Chile)._

---

## Cómo funciona (pipeline)

```
Audio dictado ──▶ Storage (URL firmada) ──▶ Transcripción (Whisper)
                                                   │
Informe escrito ──▶ Seudonimización de PHI ────────┤
Preinforme (opc.) ─▶ Seudonimización de PHI ───────┤
                                                   ▼
                                        Auditoría LLM (temp 0)
                                                   │
                                                   ▼
                              Discrepancias por severidad + métricas
                                                   │
                                                   ▼
                                   Revisión humana → aprobación
```

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (sin librería de componentes)
- **Firebase Admin** (Firestore + Storage) para casos y audios
- **LLM auditor** configurable vía `AUDITOR_PROVIDER`: Groq (Llama 3.3 70B),
  Anthropic (Claude), OpenAI (GPT-4o mini) o Google (Gemini)
- **STT**: Whisper (`whisper-large-v3`) vía Groq
- **Zod** para validar la salida estructurada del LLM

## Puesta en marcha

```bash
npm install
cp .env.local.example .env.local   # completar credenciales (ver abajo)
npm run dev                        # http://localhost:3000
```

Otros scripts: `npm run build`, `npm run start`, `npm run lint`.

### Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `AUDITOR_PROVIDER` | No | `groq` (default), `anthropic`, `openai` o `gemini`. Selecciona el LLM auditor. |
| `GROQ_API_KEY` | Sí* | API key de Groq. Necesaria para la transcripción (Whisper) y, si el provider es `groq`, para la auditoría. |
| `ANTHROPIC_API_KEY` | Sí* | Solo si `AUDITOR_PROVIDER=anthropic`. |
| `OPENAI_API_KEY` | Sí* | Solo si `AUDITOR_PROVIDER=openai`. |
| `GEMINI_API_KEY` | Sí* | Solo si `AUDITOR_PROVIDER=gemini`. Se obtiene en [Google AI Studio](https://aistudio.google.com/apikey). |
| `GEMINI_MODEL` | No | Modelo de Gemini. Default `gemini-2.5-flash`; usar `gemini-2.5-pro` para mejor calidad. |
| `FIREBASE_PROJECT_ID` | Sí** | Credenciales de Firebase Admin (producción / Vercel). |
| `FIREBASE_CLIENT_EMAIL` | Sí** | " |
| `FIREBASE_PRIVATE_KEY` | Sí** | " (con `\n` escapados). |
| `FIREBASE_STORAGE_BUCKET` | No | Bucket de Storage. Default: `<projectId>.appspot.com`. |

\* Según el provider elegido. La transcripción siempre usa Groq.
\*\* En desarrollo se puede colocar un `service-account.json` en la raíz en
lugar de estas variables (ver `lib/firebase-admin.ts`). **Nunca** commitear ese
archivo: está en `.gitignore`.

## Estructura del proyecto

```
app/
  page.tsx              Wizard de carga (datos → pre-dictado → archivos)
  audit/                Historial e informe auditado por caso
  api/
    get-upload-url/     Genera URL firmada de subida directa a Storage
    audit/              Pipeline: transcribe → seudonimiza → audita → guarda
    cases/              Listado y detalle de casos
lib/
  auditor.ts            Motor de auditoría multi-proveedor (Groq/Anthropic/OpenAI)
  whisper.ts            Transcripción (Groq Whisper)
  pseudonymizer.ts      Reemplazo de PHI por tokens antes de las APIs externas
  prompt.ts             System prompts versionados (v1.0 dual, v1.1 triple)
  mapping.ts            Salida del LLM → tipos del frontend
  scoring.ts            Concordancia / métricas
  firestore.ts          Persistencia de casos
  firebase-admin.ts     Inicialización del Admin SDK
prompts/                Prompts en Markdown (fuente de verdad documental)
docs/                   Contexto de negocio, decisiones técnicas y legal
```

## Documentación

El **por qué** del proyecto vive en `docs/`:

- [`01-contexto-negocio.md`](docs/01-contexto-negocio.md) — problema, cliente, métricas de éxito y modelo de negocio.
- [`02-decisiones-tecnicas.md`](docs/02-decisiones-tecnicas.md) — stack, elección de LLM/STT y trade-offs.
- [`03-legal-y-datos.md`](docs/03-legal-y-datos.md) — marco legal (Chile), seudonimización, retención y compliance.
- [`04-clasificacion-clinica.md`](docs/04-clasificacion-clinica.md) — taxonomía de severidad y criterio clínico.
- [`05-roadmap.md`](docs/05-roadmap.md) — estado por capa y próximos hitos.

## Estado

**Pre-piloto / demo.** No usar con datos reales de pacientes hasta cerrar el
checklist legal de [`docs/03-legal-y-datos.md`](docs/03-legal-y-datos.md).
</content>
