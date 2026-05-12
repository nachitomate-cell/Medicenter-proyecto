# 01 · Contexto de Negocio

## El cliente

**Medicenter** es un centro médico en Chile que ofrece servicios de
imagenología, entre ellos **ecografía**. Sus informes ecográficos se
producen mediante un flujo de dictado por voz: el médico radiólogo dicta el
informe mientras realiza el estudio, y un equipo de **transcriptoras
humanas** (internamente llamadas "tipeadoras") escucha el audio y escribe
el informe final que se entrega al médico tratante o al paciente.

## El problema

El flujo actual introduce errores de transcripción por causas estructurales:

- **Vocabulario técnico denso**: términos como "hipoecoico", "hiperecogénico",
  "pielocalicial" son fonéticamente similares a otros con sentido distinto.
- **Confusión de homófonos clínicos**: "bazo" / "vaso", "hipodenso" /
  "hiperdenso" son errores frecuentes.
- **Medidas numéricas**: dictado oral de números ("ocho" vs "doce") con
  ruido ambiente genera errores que cambian conducta clínica.
- **Omisión de hallazgos**: la transcriptora puede perder información si el
  médico habla rápido o baja la voz al final de una frase.
- **Presión de volumen**: el equipo debe producir muchos informes por día,
  lo que reduce el tiempo de autorevisión.

Hoy el control de calidad, cuando existe, lo hace otra persona (revisor) o
no lo hace nadie. Es caro, lento, o inexistente.

## El volumen y el impacto

| Métrica | Valor confirmado |
|---------|-------------------|
| Informes diarios (máx) | 60 |
| Foco del piloto | Ecografía |
| Duración audio (estimada) | ~3 min por estudio |
| Audio almacenado | Sí |

A 60 informes/día, incluso un **5% de tasa de error** implica ~3 informes
diarios con errores potencialmente relevantes. En términos anuales, ~900
eventos que pueden generar desde re-trabajo hasta decisiones clínicas
equivocadas.

## La solución propuesta

Un **auditor inteligente** que:

1. Recibe el audio del dictado y el informe escrito.
2. Transcribe el audio automáticamente (referencia independiente).
3. Compara ambas versiones con un LLM entrenado en criterio clínico.
4. Marca las discrepancias, clasificadas por severidad.
5. Presenta las marcas a la transcriptora o a un revisor.
6. **No modifica el informe**. El humano decide qué corregir.

## El posicionamiento (crítico para la venta)

El producto se vende como **asistente**, no como reemplazo.

Esto es una decisión estratégica, no cosmética. Posicionarlo como
reemplazo genera resistencia política interna: la coordinadora de
transcriptoras va a sabotear el piloto, las propias tipeadoras van a
marcar falsos positivos deliberadamente para mostrar que "la IA se
equivoca". Posicionarlo como asistente las convierte en **aliadas**: la
herramienta les saca presión, les cubre las espaldas, las hace más
rápidas.

**Frase ancla para cualquier comunicación con el cliente**:
> "La IA no reemplaza a nadie. Asiste al equipo que ya tienen,
> haciéndolo más rápido y más seguro."

## Métricas de éxito del piloto

| Métrica | Objetivo |
|---------|---------|
| Recall de errores críticos | ≥ 95% |
| Precisión global | ≥ 70% |
| Falsos críticos (estilo marcado como crítico) | < 5% |
| Reducción de tiempo de ciclo | A definir con Medicenter |
| Satisfacción del equipo de transcripción | Encuesta al término del piloto |

## Modelo de negocio (hipótesis inicial)

SaaS por volumen de informes procesados. Precio por informe auditado.
A 60 informes/día y costo operativo de API <$70/mes, hay margen amplio
para pricing de salida competitivo.

El primer contrato con Medicenter incluye fase de piloto con precio
reducido o gratuito a cambio de:
- Acceso a informes históricos para validación del modelo.
- Testimonio y caso de uso para ventas posteriores.
- Input del equipo clínico para mejorar el producto.

## Roadmap comercial

1. **Pre-piloto** (actual): levantamiento técnico y legal con Medicenter.
2. **Piloto** (4 semanas): sistema operativo con datos reales, supervisado.
3. **Contrato de operación** (post-piloto): si las métricas son favorables.
4. **Expansión vertical** (6-12 meses): otros tipos de informe radiológico
   (radiografía, TC, RM) dentro del mismo cliente.
5. **Expansión horizontal** (12+ meses): otros centros médicos con el
   mismo producto.
