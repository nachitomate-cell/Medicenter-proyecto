# 03 · Legal y Protección de Datos

> **Advertencia**: este documento no constituye asesoría legal.
> Es un registro interno del equipo técnico sobre los requisitos que se
> han identificado y las prácticas que se adoptaron. La validación legal
> definitiva corresponde al DPO de Medicenter y/o al asesor legal
> contratado por SynapTech.

## Marco legal aplicable

### Chile

- **Ley N° 19.628** sobre Protección de la Vida Privada.
- **Ley N° 21.719** (reforma integral, con vigencia escalonada) que moderniza
  la anterior y refuerza el tratamiento de datos sensibles.
- **Ley N° 20.584** sobre derechos y deberes de los pacientes (ficha clínica).

### Qué implica para este proyecto

- Los datos clínicos de pacientes son **datos personales sensibles**.
- Su tratamiento requiere **base legal específica** (consentimiento o
  habilitación legal).
- Requieren **medidas de seguridad reforzadas** en almacenamiento,
  transmisión y procesamiento.
- Las transferencias a terceros (como proveedores de IA) deben estar
  cubiertas por un **DPA** (Data Processing Agreement) y el tratamiento
  debe ser informado al titular.

## Responsabilidades en el tratamiento

| Rol | Quién | Responsabilidad |
|-----|-------|-----------------|
| Responsable del tratamiento | Medicenter | Decide finalidades y medios. |
| Encargado del tratamiento | SynapTech SpA | Procesa por cuenta del responsable. |
| Subencargados | OpenAI, Anthropic, Google Cloud, Vercel, Firebase | Procesan por cuenta del encargado. |

Cada relación requiere contrato escrito con cláusulas específicas:
- Finalidad del tratamiento.
- Deber de confidencialidad.
- Obligación de notificar brechas.
- Prohibición de uso para entrenamiento de modelos.
- Derecho a auditoría.
- Destino de los datos al término del contrato.

## Principios operativos adoptados

### 1. Minimización
Solo se procesan los datos estrictamente necesarios para la finalidad.
No se solicita información del paciente que no aparezca ya en el
dictado o el informe.

### 2. Seudonimización previa
**Antes** de enviar contenido a cualquier API externa (Whisper, Claude),
un módulo de seudonimización en el backend de SynapTech remueve o
reemplaza identificadores directos:

| Dato original | Reemplazo |
|--------------|-----------|
| Nombre del paciente | `[PACIENTE]` |
| RUT | `[RUT]` |
| Fecha de nacimiento | `[FECHA_NAC]` |
| Fecha del estudio | `[FECHA_ESTUDIO]` |
| Número de ficha | `[FICHA]` |
| Nombre del médico | `[MEDICO]` |

El mapeo reverso se mantiene **exclusivamente en el servidor de SynapTech**,
nunca se envía a terceros. Al mostrar el resultado al usuario, el mapeo se
reconstituye.

### 3. Cifrado
- **En tránsito**: HTTPS/TLS para toda comunicación.
- **En reposo**: cifrado a nivel de storage (Firebase Storage lo hace
  nativamente).

### 4. Retención limitada
Los audios y transcripciones se almacenan por el tiempo mínimo necesario
para la operación y la trazabilidad. Política concreta a definir con
Medicenter, pero baseline sugerido:

- Audio original: 90 días, luego eliminación definitiva.
- Transcripción automática: 1 año.
- Informe auditado y metadata de auditoría: según política de Medicenter
  para historia clínica.

### 5. Registro de auditoría
Cada operación sobre un caso queda registrada con:
- Usuario que ejecutó la acción.
- Timestamp.
- Acción realizada (upload, procesamiento, visualización, edición, etc.).
- Versión del prompt usado.
- Resultado sintético.

Este log es consultable por Medicenter.

### 6. Control de acceso
- Autenticación obligatoria (Firebase Auth).
- Roles mínimos: **transcriptora**, **supervisor**, **admin**.
- Acceso a casos limitado por rol y, eventualmente, por asignación.
- MFA requerido para roles supervisor y admin.

## Cláusulas requeridas en contratos con subencargados

### OpenAI (Whisper API)
- Endpoint API que **no** guarda los datos para entrenamiento (confirmado
  en política de OpenAI para API, distinto de ChatGPT consumer).
- DPA firmado con OpenAI.
- Preferible: acuerdo de residencia de datos en región específica si
  Medicenter lo exige.

### Anthropic (Claude API)
- Política estándar de Anthropic API: no uso para entrenamiento por defecto.
- DPA disponible para firma.
- Revisar términos actualizados antes del piloto.

### Google Cloud / Firebase
- DPA estándar de Google Cloud.
- Configurar región de Firestore acorde a política de Medicenter.

### Vercel
- DPA disponible.
- Para producción con datos reales: evaluar plan Enterprise con compliance
  reforzado, o migrar a infraestructura propia.

## Consentimiento informado del paciente

El consentimiento que los pacientes de Medicenter firman hoy debe
revisarse para verificar si cubre:

- El tratamiento de datos por **terceros tecnológicos** (SynapTech y sus
  subencargados).
- La **finalidad específica** de control de calidad mediante IA.
- La eventual **transferencia internacional** de datos (si los servidores
  están fuera de Chile).

Si el consentimiento actual no cubre esto, Medicenter debe:
- Actualizar el texto del consentimiento, o
- Obtener consentimiento específico adicional, o
- Apoyarse en otra base legal (ej. interés legítimo con análisis de
  proporcionalidad documentado).

**Esto es decisión de Medicenter, no de SynapTech**. Nuestro rol es informar
lo que el sistema hace para que ellos tomen la decisión informada.

## Derechos de los titulares

El sistema debe permitir operativamente:
- **Acceso**: un paciente puede solicitar saber qué datos suyos existen.
- **Rectificación**: corregir datos incorrectos.
- **Eliminación**: borrado completo de todos los datos asociados a un
  paciente.
- **Portabilidad**: exportar los datos en formato estructurado.
- **Oposición**: detener el tratamiento.

Estas operaciones las gestiona Medicenter (responsable). SynapTech
(encargado) debe proveer las herramientas técnicas para ejecutarlas en
tiempo razonable.

## Checklist pre-piloto

Antes de procesar **un solo audio real** de un paciente de Medicenter:

- [ ] DPA firmado entre Medicenter y SynapTech.
- [ ] DPAs firmados con OpenAI, Anthropic y Google.
- [ ] Validación del consentimiento informado del paciente.
- [ ] Seudonimización implementada y testeada.
- [ ] Política de retención acordada por escrito.
- [ ] Sistema de auditoría funcionando.
- [ ] Control de accesos con roles implementado.
- [ ] Plan de respuesta ante incidentes definido.
- [ ] Contacto del DPO de Medicenter establecido.

**Si cualquiera de estos checks falla: no se procesa.**

## Riesgos conocidos y mitigaciones

| Riesgo | Mitigación |
|--------|-----------|
| Exposición de PHI a proveedor de LLM | Seudonimización previa + DPA con cláusula de no-entrenamiento |
| Residencia de datos fuera de Chile | Elegir región cloud acordada con Medicenter |
| Alucinación del LLM genera falso diagnóstico | Diseño human-in-the-loop. La IA nunca modifica informes. |
| Filtración interna de datos | Control de acceso por roles + auditoría completa |
| Error en seudonimización no remueve todos los identificadores | Tests unitarios exhaustivos + revisión manual periódica |
| Proveedor de IA cambia política de privacidad | Monitoreo contractual + cláusula de notificación de cambios |
