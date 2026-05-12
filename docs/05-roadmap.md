# 05 · Roadmap

> Este es el **documento vivo** del proyecto. Actualizar con cada avance.
> Si algo no está acá, está en riesgo de olvidarse.

## Estado del proyecto

**Fase actual**: Pre-piloto. Construyendo demo para venta a Medicenter.

**Próximo hito**: Reunión de levantamiento con Medicenter + demo funcional.

## Checklist por capa

### 🎨 Frontend

| Item | Estado | Notas |
|------|--------|-------|
| Scaffold Next.js + Tailwind | ✅ | Crear con `create-next-app` |
| Pantalla de upload (`app/page.tsx`) | ✅ | Mock listo, falta conectar |
| Pantalla de auditoría (`app/audit/page.tsx`) | ✅ | Mock listo con datos de eco abdominal |
| Pantalla de auditoría por caso (`app/audit/[id]/page.tsx`) | ⏳ | Refactor del mock para recibir data real |
| Pantalla de historial de casos | ⏳ | Lista de casos procesados |
| Pantalla de login | ⏳ | Firebase Auth |
| Pantalla de perfil/configuración | ⏳ | Básica |
| Estados de error globales | ⏳ | Error boundaries por ruta |
| Responsive mobile | ⏳ | Baja prioridad para MVP |

### ⚙️ Backend / API

| Item | Estado | Notas |
|------|--------|-------|
| API route `POST /api/audit` | ⏳ | Recibe audio + informe, devuelve caseId |
| Integración Whisper API | ⏳ | Transcripción de audio |
| Integración Claude API | ⏳ | Auditoría con prompt v1.0 |
| Módulo de seudonimización | ⏳ | Crítico antes de piloto real |
| API route `GET /api/cases/:id` | ⏳ | Obtener un caso procesado |
| API route `GET /api/cases` | ⏳ | Listar casos del usuario |
| Validación de input con zod | ⏳ | En todos los API routes |
| Rate limiting | ⏳ | Por usuario + global |
| Manejo de errores estructurado | ⏳ | Códigos + mensajes claros |

### 🗄️ Base de datos y almacenamiento

| Item | Estado | Notas |
|------|--------|-------|
| Setup Firebase project | ⏳ | Dev + staging + prod |
| Schema Firestore para casos | ⏳ | Definir en detalle |
| Schema Firestore para usuarios y roles | ⏳ | transcriptora / supervisor / admin |
| Storage de audios en Firebase Storage | ⏳ | Con reglas de acceso |
| Reglas de seguridad Firestore | ⏳ | Crítico |
| Reglas de seguridad Storage | ⏳ | Crítico |
| Política de retención automática | ⏳ | Ver docs/03-legal-y-datos.md |
| Backups | ⏳ | |

### 🔐 Auth y roles

| Item | Estado | Notas |
|------|--------|-------|
| Setup Firebase Auth | ⏳ | Email + password para MVP |
| Middleware de protección de rutas | ⏳ | Redirect si no autenticado |
| Sistema de roles | ⏳ | Custom claims en Firebase |
| MFA para admin/supervisor | ⏳ | Post-piloto |
| Registro de auditoría de accesos | ⏳ | Log en Firestore |

### 🧠 Modelo / Prompts

| Item | Estado | Notas |
|------|--------|-------|
| Prompt auditor v1.0 | ✅ | En `prompts/auditor-v1.0.md` |
| Golden set de 20 casos validados | ⏳ | Requiere radiólogo de Medicenter |
| Evaluación del prompt sobre golden set | ⏳ | |
| Iteración del prompt | ⏳ | Versionar cada cambio |
| Glosario institucional de Medicenter | ⏳ | Pregunta 8 del levantamiento |
| Reglas específicas para eco obstétrica | ⏳ | Solo si aplica al piloto |

### 📜 Legal y compliance

| Item | Estado | Notas |
|------|--------|-------|
| Documento de levantamiento para Medicenter | ✅ | PDF listo |
| DPA SynapTech ↔ Medicenter | ⏳ | Requiere abogado |
| DPA SynapTech ↔ OpenAI | ⏳ | Revisar plantilla estándar |
| DPA SynapTech ↔ Anthropic | ⏳ | Revisar plantilla estándar |
| Revisión consentimiento informado Medicenter | ⏳ | Responsabilidad Medicenter |
| Política de privacidad de SynapTech | ⏳ | Para la app |
| Términos y condiciones de uso | ⏳ | Para la app |
| Registro ante autoridad (si aplica) | ⏳ | Verificar con abogado |

### 🎙️ Comercial / pitch

| Item | Estado | Notas |
|------|--------|-------|
| Guión de pitch 5 minutos | ✅ | |
| Audio real de caso demo (grabado) | ⏳ | Grabar con médico o el dev |
| Slides de apoyo (opcional) | ⏳ | Si el pitch es formal |
| Propuesta comercial con pricing | ⏳ | Post-levantamiento |
| Materiales de onboarding para tipeadoras | ⏳ | Post-piloto |

## Cronograma sugerido

### Semana 1-2 · Preparación del demo
- Setup Next.js + Firebase (modo dev).
- Transferir mocks del chat al repo.
- Grabar audio real para el caso de demo.
- Pulir UI y estados.

### Semana 3 · Pitch
- Reunión con Medicenter usando guión del pitch.
- Entregar documento de levantamiento.
- Agendar reunión de levantamiento técnico.

### Semana 4-5 · Levantamiento
- Obtener respuestas a las 14 preguntas del documento.
- Firmar DPAs.
- Identificar radiólogo referente para validación.
- Conseguir golden set de 20 casos.

### Semana 6-8 · Desarrollo de piloto
- API route real con Whisper + Claude.
- Integración Firebase completa.
- Módulo de seudonimización.
- Evaluación del prompt sobre golden set.
- Iteración.

### Semana 9-12 · Piloto operativo
- Despliegue en ambiente controlado de Medicenter.
- Procesamiento de informes reales con supervisión.
- Métricas de precisión, latencia, aceptación.

### Semana 13 · Evaluación y contrato
- Análisis de resultados.
- Decisión go/no-go para producción.
- Propuesta comercial.

## Preguntas abiertas que bloquean avance

1. **¿Quién es el radiólogo referente?** Sin él, la validación clínica no
   arranca.
2. **¿Quién es el DPO o asesor legal de Medicenter?** Sin él, no se
   procesan datos reales.
3. **¿Qué tipo de eco cubre el piloto?** Si incluye obstétrica, hay
   trabajo adicional en el prompt.
4. **¿Cuál es el consentimiento informado actual?** Define si hay que
   actualizarlo antes del piloto.
5. **¿Existe política de residencia de datos?** Define región cloud.

## Convenciones para actualizar este documento

- Estados: ⏳ pendiente · 🔄 en progreso · ✅ hecho · ⚠️ bloqueado
- Cada vez que algo cambia de estado, actualizar acá **y** commitear.
- Si aparece un bloqueador nuevo, agregarlo a "Preguntas abiertas".
- No borrar items completados: pasan a ✅ para preservar historial.
