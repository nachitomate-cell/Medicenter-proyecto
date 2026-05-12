/**
 * Seudonimizador de PHI (Protected Health Information) para informes médicos chilenos.
 *
 * Detecta y reemplaza con tokens los datos personales más comunes antes de
 * enviar el texto a proveedores externos de LLM.
 *
 * Limitaciones conocidas:
 * - No detecta nombres propios sin contexto previo ("Paciente:", "Nombre:", etc.)
 * - No detecta RUTs sin guion (solo secuencias numéricas puras)
 * - El mismo input siempre produce los mismos tokens (determinístico), lo que
 *   permite auditoría pero no protege contra ataques de re-identificación.
 *
 * Para producción: reemplazar por un servicio NER dedicado (Microsoft Presidio,
 * Amazon Comprehend Medical) con DPA vigente.
 */

export interface PseudonymizedResult {
  /** Texto con PHI reemplazado por tokens como [RUT_1], [FECHA_2]. */
  text: string;
  /** Mapa token → valor original. Usar SOLO en servidor para reversión. */
  map: Record<string, string>;
  /** Número total de tokens generados. */
  tokenCount: number;
}

/**
 * Seudonimiza un texto médico en español (Chile).
 * Los patrones se aplican en orden de mayor a menor riesgo de re-identificación.
 */
export function pseudonymize(text: string): PseudonymizedResult {
  let result = text;
  const map: Record<string, string> = {};
  let counter = 0;

  function makeToken(prefix: string): string {
    counter++;
    return `[${prefix}_${counter}]`;
  }

  function replacePattern(pattern: RegExp, prefix: string): void {
    result = result.replace(pattern, (match) => {
      const token = makeToken(prefix);
      map[token] = match;
      return token;
    });
  }

  // 1. RUT chileno: 12.345.678-9 · 12345678-9 · 1.234.567-K · 1234567-k
  replacePattern(/\b\d{1,2}\.?\d{3}\.?\d{3}-[0-9Kk]\b/g, "RUT");

  // 2. Fechas en formato largo: "28 de abril de 2026"
  replacePattern(
    /\b\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4}\b/gi,
    "FECHA"
  );

  // 3. Fechas en formato corto: 28/04/2026 · 28-04-2026 · 28.04.2026
  replacePattern(/\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/g, "FECHA");

  // 4. Teléfonos chilenos: +56912345678 · +56 9 1234 5678 · 912345678
  replacePattern(/(?:\+?56\s?)?9\d{8}\b/g, "TEL");

  // 5. Correos electrónicos
  replacePattern(
    /\b[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}\b/g,
    "EMAIL"
  );

  // 6. Nombres propios después de etiquetas clínicas comunes (2-4 palabras con mayúscula)
  const NAME_LABELS =
    "Paciente|Nombre completo|Nombre|Solicitante|Médico tratante|Médico|Dr\\.|Dra\\.|Solicitado por";
  replacePattern(
    new RegExp(
      `(?<=(?:${NAME_LABELS}):?\\s*)[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,3}`,
      "g"
    ),
    "PACIENTE"
  );

  // 7. Números de ficha / episodio / folio clínico
  replacePattern(
    /(?:(?:Ficha|Episodio|Nro?|N[°º]|Caso|Folio)[:\s.]*)\d{4,}/gi,
    "FICHA"
  );

  return { text: result, map, tokenCount: counter };
}

/**
 * Revierte la seudonimización usando el mapa generado.
 * Solo llamar en el servidor — nunca enviar el mapa al cliente.
 */
export function depseudonymize(
  text: string,
  map: Record<string, string>
): string {
  return Object.entries(map).reduce(
    (acc, [token, original]) => acc.replaceAll(token, original),
    text
  );
}
