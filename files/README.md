# Medicenter Auditor

Auditor IA de informes ecográficos para Medicenter.
Proyecto de **SynapTech SpA**.

> **Antes de tocar código**, leer [`CLAUDE.md`](./CLAUDE.md) y los
> documentos en [`docs/`](./docs/). Es fundamental.

## Arranque rápido

Este repo contiene el **código ya escrito**, pero **no el scaffold de
Next.js**. Para instalarlo:

### 1. Inicializar Next.js sobre este directorio

```bash
# Estando dentro de la carpeta del proyecto
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
```

Cuando te pregunte si sobreescribir `app/` y otros archivos, **responde
NO** — queremos conservar los archivos que ya están en este repo.

> Si `create-next-app` no respeta los archivos existentes, hacé un backup
> de `app/`, `prompts/`, `docs/` y `CLAUDE.md` antes de correrlo, y luego
> copiá todo de vuelta encima.

### 2. Instalar dependencias

Lo estándar de Next.js ya viene en el `package.json`. Por ahora no se
necesitan paquetes adicionales.

### 3. Variables de entorno

Crear `.env.local`:

```
# OpenAI (Whisper) — pendiente integración
OPENAI_API_KEY=

# Anthropic (Claude) — pendiente integración
ANTHROPIC_API_KEY=

# Firebase — pendiente integración
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

Agregar `.env.local` al `.gitignore` (normalmente Next.js ya lo hace).

### 4. Correr en dev

```bash
npm run dev
```

Navegar a:
- `http://localhost:3000/` — Pantalla de upload
- `http://localhost:3000/audit` — Demo de auditoría con datos mockeados

## Estructura

```
.
├── CLAUDE.md                    Reglas para Claude Code y otros agentes
├── README.md                    Este archivo
├── app/
│   ├── page.tsx                 Pantalla de upload (home)
│   ├── audit/
│   │   └── page.tsx             UI de auditoría (con mocks)
│   └── api/
│       └── audit/
│           └── route.ts         API route — MOCK temporal
├── prompts/
│   └── auditor-v1.0.md          System prompt versionado del auditor
└── docs/
    ├── 01-contexto-negocio.md
    ├── 02-decisiones-tecnicas.md
    ├── 03-legal-y-datos.md
    ├── 04-clasificacion-clinica.md
    └── 05-roadmap.md
```

## Estado actual

- ✅ UI de upload funcional (con mock de API)
- ✅ UI de auditoría con datos mockeados
- ✅ System prompt del auditor v1.0 (draft)
- ⏳ API route real (Whisper + Claude)
- ⏳ Integración Firebase
- ⏳ Seudonimización
- ⏳ Validación clínica del prompt

Detalle completo en [`docs/05-roadmap.md`](./docs/05-roadmap.md).

## Próximos pasos de desarrollo

1. Instalar el scaffold de Next.js sobre este repo (paso 1 de arriba).
2. Verificar que `/` y `/audit` renderizan correctamente.
3. Grabar un audio real para el caso de demo y reemplazar
   `MOCK_AUDIO_URL` en `app/audit/page.tsx`.
4. Implementar el API route real en `app/api/audit/route.ts`:
   - Validación con zod.
   - Seudonimización.
   - Whisper API.
   - Claude API con el prompt de `prompts/auditor-v1.0.md`.
5. Integrar Firebase para persistencia.
6. Pantalla de auditoría por caso: `app/audit/[caseId]/page.tsx`.

## Contacto

- Desarrollo: [tu nombre]
- Comercial: Pablo
- Cliente: Medicenter
