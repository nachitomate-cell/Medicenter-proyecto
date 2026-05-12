# 02 · Decisiones Técnicas

Este documento registra las decisiones de arquitectura y stack, con el
**fundamento** de cada una. La intención es que cualquier persona (humano
o agente) que retome el proyecto entienda no solo **qué** se usa, sino
**por qué**.

## Decisión 1 — Stack base: Next.js + Vercel + Firebase

**Contexto**: MVP con equipo de un desarrollador, necesidad de entregar
rápido para un pitch, y escalar sin refactor mayor.

**Alternativas consideradas**:
- FastAPI + React separados → más control, pero duplicación de setup.
- Supabase en vez de Firebase → postgres es lindo, pero el ecosistema de
  Firebase está más consolidado y la curva es menor.
- Rails → mala idea para un MVP AI-first en 2026.

**Decisión**: Next.js App Router (v14+) + Firebase (Auth/Firestore/Storage)
+ Vercel.

**Razones**:
- Frontend y backend en un solo repo. Un developer, un deploy.
- Next.js API Routes son server-side por defecto, lo cual es crítico para
  no exponer API keys de OpenAI/Anthropic al cliente.
- Firebase Storage maneja bien archivos de audio hasta decenas de MB.
- Vercel hace deploy en <1 min con cada push.

**Costo asociado**: Vendor lock-in moderado con Vercel y Firebase. Aceptable
para MVP; revisar si escala a multi-cliente con requerimientos de residencia
de datos específicos.

---

## Decisión 2 — LLM del auditor: Claude Sonnet 4.5

**Contexto**: Necesitamos un LLM que compare dos textos en español clínico
y clasifique diferencias con criterio conservador.

**Alternativas consideradas**:
- `gpt-4o-mini`: barato, pero en pruebas informales aluciona más en
  contextos clínicos en español. Puede reformular cuando debería citar
  textual. **Descartado para producción.**
- `gpt-4o` / `gpt-4-turbo`: comparable en calidad a Claude, precio similar.
  Opción válida como fallback.
- `Claude Haiku`: evaluar para casos "estilo" donde el costo importa y la
  severidad es baja. Pendiente de test.
- Modelos locales (Llama, Qwen): rechazado para MVP. Infraestructura extra
  y calidad clínica en español inferior.

**Decisión**: Claude Sonnet 4.5 para todos los casos, **temperature 0**.

**Razones**:
- Mejor adherencia a instrucciones de "NO inventes, NO reformules" — crítico
  acá.
- Mejor manejo de español médico latinoamericano.
- Conservador por diseño: tiende a citar antes que parafrasear.
- DPAs de Anthropic permiten configuración de no-entrenamiento.

**Temperature 0**: no queremos creatividad. Queremos la misma respuesta si
mandamos el mismo caso dos veces. Reproducibilidad es requisito
médico-legal.

---

## Decisión 3 — STT: OpenAI Whisper API

**Contexto**: Necesitamos transcribir audio del médico a texto, como
referencia independiente para comparar con el informe de la tipeadora.

**Alternativas consideradas**:
- Deepgram: buena precisión, soporta diarización.
- AssemblyAI: buena API, buen español.
- Google Speech-to-Text: integrable con Google Cloud stack.
- Whisper self-hosted: control total, pero infra y latencia.

**Decisión (tentativa)**: Whisper API de OpenAI. Evaluar Deepgram si Whisper
falla en español clínico chileno.

**Razones**:
- Whisper fue entrenado con gran volumen de español.
- API simple, un endpoint, pay-per-use.
- Costo bajo (~$0.006/min) — a 60 informes/día × 3 min, ~$1/día.

**Riesgo conocido**: el modelo puede inventar palabras plausibles cuando
el audio es ambiguo (hallucination bajo ruido). Esto **ya está contemplado
en el prompt del auditor**: el sistema sabe que Whisper puede equivocarse
igual que la tipeadora.

**Acción pendiente**: test con audios reales de ecografía chilena para
validar precisión antes de piloto.

---

## Decisión 4 — UI: Tailwind sin librería de componentes

**Contexto**: Hay tentación de meter shadcn/ui, Chakra, MUI, etc.

**Decisión**: Tailwind vanilla. Componentes custom.

**Razones**:
- Menos dependencias, menos superficie de bugs.
- El diseño del auditor es específico (player de audio con marcadores,
  highlights de texto clickeables) — no se resuelve bien con componentes
  genéricos.
- Bundle más liviano.
- El dev principal tiene control estético del resultado.

**Cuándo reconsiderar**: si el producto crece a multi-tenant con dashboards
administrativos complejos, agregar shadcn/ui como capa específica para esas
vistas.

---

## Decisión 5 — Prompts como archivos versionados

**Contexto**: El prompt del auditor es el **alma del producto**. Su
calidad determina la seguridad clínica.

**Decisión**:
- Los prompts viven en `prompts/` como archivos `.md`.
- Nombre incluye versión: `auditor-v1.0.md`, `auditor-v1.1.md`.
- Cada respuesta del LLM incluye `version_prompt` en el output.
- Este campo se guarda junto al caso procesado en Firestore.

**Razones**:
- **Trazabilidad médico-legal**: si en el futuro hay una disputa sobre un
  informe, necesitamos saber exactamente qué lógica de auditoría se usó.
- **Iteración controlada**: podemos A/B-testear prompts comparando
  resultados en el mismo golden set.
- **Accesibilidad no-dev**: el prompt en Markdown puede ser revisado por
  un radiólogo sin abrir el código.

---

## Decisión 6 — Procesamiento sincrónico en el MVP

**Contexto**: El flujo upload → transcribir → auditar puede tomar 30-90 seg.

**Alternativas consideradas**:
- Cola de jobs en background (Inngest, Trigger.dev, BullMQ).
- Server-Sent Events para progreso en tiempo real.
- Sincrónico simple: cliente espera la respuesta.

**Decisión**: **Sincrónico** para el MVP. Upgrade futuro si hace falta.

**Razones**:
- 60 informes/día = 1 cada ~8 minutos. No hay concurrencia crítica.
- Timeout de Vercel en plan Pro es 60s (configurable a 300s). Suficiente
  para audios de 3 min.
- UX con fases visibles ("Subiendo... Transcribiendo... Auditando...")
  es aceptable para el usuario.

**Cuándo migrar a async**: cuando el volumen justifique, o cuando el producto
soporte lotes de casos.

---

## Decisión 7 — Seudonimización antes de APIs externas

**Contexto**: Los audios e informes pueden contener datos identificatorios
(nombre del paciente, RUT, fecha exacta).

**Decisión**: implementar capa de **seudonimización** que remueva o
reemplace identificadores antes del envío a Whisper/Claude.

**Cómo**:
- Pipeline en el backend, previo al llamado a la API externa.
- Reemplazar nombres por tokens `[PACIENTE]`, RUTs por `[RUT]`, fechas
  por `[FECHA]`.
- Los tokens son reversibles solo en el servidor de SynapTech (no los
  enviamos a la API).

**Por qué**:
- Reduce dramáticamente el riesgo legal.
- Es práctica estándar en salud digital.
- Requerido casi con seguridad por el DPO de Medicenter.

**Estado**: pendiente implementación. Ver `docs/03-legal-y-datos.md`.

---

## Decisiones pendientes

| Decisión | Bloqueador | Quién responde |
|----------|-----------|----------------|
| Proveedor STT definitivo | Test con audio real | Developer |
| Schema de Firestore para casos | Validación legal | DPO Medicenter |
| Residencia de datos (región cloud) | Política institucional | Medicenter TI |
| Taxonomía final crítico/advertencia/estilo | Validación clínica | Radiólogo Medicenter |
| Integración con sistema actual de transcripción | Levantamiento | Medicenter |
