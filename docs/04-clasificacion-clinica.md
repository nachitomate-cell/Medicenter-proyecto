# 04 · Clasificación Clínica de Discrepancias

> Este documento define cómo el sistema clasifica las diferencias entre
> audio e informe. **La taxonomía aquí registrada es un draft inicial**,
> pendiente de validación con un radiólogo referente de Medicenter.
>
> Cualquier cambio a este documento se considera un **cambio clínico** y
> debe commitearse con tipo `clinical(...)` y referencia a quién lo validó.

## Principios de clasificación

### Principio 1 · Precaución clínica
Ante duda entre dos niveles de severidad, elegir **siempre el más grave**.
La penalidad de un falso positivo es baja (el humano revisa y descarta).
La penalidad de un falso negativo puede ser un evento adverso.

### Principio 2 · Independencia de fuentes
Ni la transcripción automática ni el informe escrito son verdad absoluta.
El sistema evalúa cuál versión es más plausible clínicamente según el
contexto, no asume infalibilidad de ninguno.

### Principio 3 · Observación, no corrección
El sistema reporta qué difiere, no ordena cambios. Lenguaje de output:
*"el audio registra X, el informe registra Y"* — no *"corregir a X"*.

### Principio 4 · Silencio no es consentimiento
Si un hallazgo aparece en una versión y no en la otra, es discrepancia.
No asumir que la ausencia equivale a confirmación.

## Niveles de severidad

### 🔴 CRÍTICO
Discrepancias que **pueden modificar la conducta clínica** o el diagnóstico.

**Incluye**:
- Cambios en **medidas numéricas** de hallazgos (tamaño de lesiones,
  órganos, estructuras).
- Cambios en **descriptores que invierten sentido diagnóstico**:
  - hipoecoico / hiperecoico
  - hipodenso / hiperdenso
  - dilatado / no dilatado
  - presente / ausente
  - homogéneo / heterogéneo (cuando cambia la interpretación)
- **Omisión o adición** de hallazgos patológicos.
- Cambios en **lateralidad** (derecho vs izquierdo).
- Cambios en **ubicación anatómica** del hallazgo.
- Cambios en la **conclusión diagnóstica**.
- Cambios en **cifras de referencia** clínicamente significativas (IMC,
  edad gestacional, percentiles).

**Ejemplos**:
| Audio | Informe | Por qué es crítico |
|-------|---------|-------------------|
| "cálculo de 12 mm" | "cálculo de 8 mm" | Indicación quirúrgica puede cambiar |
| "bazo levemente aumentado, 13 cm" | "bazo normal, 11 cm" | Se pierde el hallazgo patológico |
| "riñón derecho" | "riñón izquierdo" | Lateralidad invertida |
| "imagen hipoecoica" | "imagen hiperecoica" | Naturaleza de la lesión distinta |
| "sin signos de rotura" | (omitido) | Información relevante ausente |

### 🟡 ADVERTENCIA
Discrepancias que **requieren revisión pero no necesariamente cambian la
conducta**.

**Incluye**:
- Omisión o adición de **información descriptiva secundaria** que enriquece
  pero no altera el diagnóstico.
- **Terminología técnica entre sinónimos aceptables pero no idénticos**.
- **Ambigüedades** introducidas en la transcripción.
- **Diferencias menores al 10% en medidas de estructuras no críticas**
  (ej. medida de bazo normal 11.0 vs 11.5 cm).
- **Unidades omitidas o cambiadas** cuando el valor absoluto no cambia
  ("10 cm" vs "10").

**Ejemplos**:
| Audio | Informe | Por qué es advertencia |
|-------|---------|----------------------|
| "no se observan signos de hidronefrosis" | "no se observa dilatación pielocalicial" | Sinónimos clínicos, pero el radiólogo puede preferir el primero |
| "páncreas no visualizado por meteorismo" | "parcialmente visualizado por interposición gaseosa" | Reformulación técnica aceptable, verificar preferencia |
| "paredes finas, bordes regulares" | "paredes finas" | Se omite descriptor secundario |

### 🟢 ESTILO
Diferencias redaccionales **sin impacto clínico**.

**Incluye**:
- Reformulaciones que conservan **significado completo**.
- Puntuación, mayúsculas, formato.
- **Expansiones estándar institucionales**: la transcriptora agrega
  frases convencionales que no fueron verbalizadas explícitamente
  ("vejiga normal" → "vejiga adecuadamente distendida, de paredes finas,
  contenido anecoico").
- **Omisiones de muletillas** del dictado ("eh", "a ver", "entonces").
- Cambios entre abreviaturas y formas completas ("mm" vs "milímetros").

**Ejemplos**:
| Audio | Informe | Por qué es estilo |
|-------|---------|-------------------|
| "normales" | "conservadas" | Sinónimos completos en contexto clínico |
| "no se observa" | "sin evidencia de" | Equivalencia de negación |
| "hígado eh, de tamaño normal" | "hígado de tamaño normal" | Muletilla omitida |
| "vejiga sin alteraciones" | "vejiga adecuadamente distendida, paredes finas, contenido anecoico" | Expansión técnica estándar |

## Qué NO se reporta

### Errores del reconocimiento automático (STT)
Cuando la diferencia entre audio y informe se puede atribuir con alta
probabilidad a que **Whisper se equivocó**, no la tipeadora, **no se
marca como discrepancia**.

**Indicadores de error de Whisper**:
- **Homófonos**: "vaso" / "bazo", "vello" / "bello".
- **Palabras cortadas** por cortes de audio.
- **Puntuación incoherente** introducida automáticamente.
- **Números verbalizados de forma inusual** que el modelo interpretó mal.

**Ejemplo**:
> Audio transcrito: *"vaso de tamaño normal"*
> Informe: *"bazo de tamaño normal"*
> **NO es discrepancia**. Whisper escribió el homófono.

### Diferencias de formato y estructura
- Saltos de línea.
- Mayúsculas en encabezados.
- Orden de secciones (si la tipeadora reorganiza por plantilla institucional).

### Expansiones técnicas estándar
Como se explicó arriba, cuando la tipeadora agrega descriptores
convencionales esperables en el tipo de informe, **sin introducir
información nueva**, es estilo.

## Manejo de incertidumbre

### Confianza
Cada discrepancia reportada incluye un nivel de confianza:
- **alta**: el sistema está seguro de la clasificación.
- **media**: la clasificación es razonable pero cabe otra interpretación.
- **baja**: el sistema no está seguro; clasifica hacia arriba (más grave)
  y marca explícitamente.

### Fragmentos inaudibles
Cuando el audio es inaudible o Whisper lo marca como tal:
- **No inventar** qué decía.
- Si el informe tiene información en esa zona, reportar como
  **advertencia** con nota *"audio no verificable en este fragmento"*.

## Casos límite conocidos

### Medidas: cuándo es crítico, cuándo advertencia
- **Crítico**: diferencia que cruza un umbral clínico conocido
  (ej. tamaño de cálculo que define conducta quirúrgica).
- **Advertencia**: diferencia menor al 10% en estructuras normales.
- **Ambiguo**: cuando no se conoce el umbral aplicable, clasificar como
  **crítico** (Principio 1).

### Terminología regional chilena
Medicenter puede usar términos específicos del español chileno o
convenciones internas. Estos se documentan como **glosario institucional**
y se cargan al prompt como excepciones de estilo.

**Pendiente**: solicitar el glosario en el levantamiento (Pregunta 8 del
documento para Medicenter).

### Ecografía obstétrica
Tiene reglas específicas no cubiertas aún en este documento:
- Edad gestacional: las diferencias en semanas/días son críticas.
- Medidas fetales: percentiles determinan conducta.
- Doppler: valores específicos con umbrales clínicos.

**Estado**: el prompt actual **no está optimizado para obstétrica**. Si
Medicenter incluye eco obstétrica en el piloto, ampliar este documento y el
prompt con reglas específicas.

## Proceso de validación clínica del prompt

Para cerrar este documento como v1.0 (no draft), se requiere:

1. **Golden set**: 20 casos históricos de Medicenter anonimizados, con
   errores marcados manualmente por un radiólogo.
2. **Ejecutar el prompt v1.0** sobre el golden set.
3. **Comparar output del sistema con marcado manual**:
   - Recall crítico ≥ 95%
   - Precisión global ≥ 70%
   - Falsos críticos < 5%
4. **Iterar el prompt** hasta cumplir métricas, versionando cada cambio.
5. **Firmar off con el radiólogo** sobre la taxonomía definitiva.

Hasta que este proceso se complete, **este documento y el prompt están en
estado `draft`**.

## Historial de cambios

| Versión | Fecha | Cambio | Validador |
|---------|-------|--------|-----------|
| 0.1-draft | Inicio proyecto | Primera redacción | — |
