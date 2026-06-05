#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genera la propuesta en PDF para Medicenter."""

from fpdf import FPDF

# Paleta
GREEN = (139, 197, 61)      # #8BC53D  (verde Medicenter, tomado de la UI)
GREEN_D = (95, 140, 30)
BLUE = (37, 99, 235)        # #2563EB
DARK = (30, 41, 59)         # slate-800
GRAY = (100, 116, 139)      # slate-500
LIGHT = (241, 245, 249)     # slate-100
RED = (220, 38, 38)
AMBER = (217, 119, 6)
WHITE = (255, 255, 255)


def s(txt: str) -> str:
    """Sanitiza a latin-1 reemplazando caracteres unicode comunes."""
    repl = {
        "—": "-", "–": "-", "•": "-",
        "“": '"', "”": '"', "‘": "'", "’": "'",
        "→": "->", "≥": ">=", "≤": "<=", "≈": "~",
        "·": "-", "…": "...", "₩": "", " ": " ",
        "️": "", "\U0001f534": "", "\U0001f7e1": "", "\U0001f7e2": "",
    }
    for k, v in repl.items():
        txt = txt.replace(k, v)
    return txt.encode("latin-1", "replace").decode("latin-1")


class PDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.set_auto_page_break(auto=True, margin=18)
        self.set_margins(18, 18, 18)
        self.cover = False

    def footer(self):
        if self.cover:
            return
        self.set_y(-15)
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*GRAY)
        self.cell(0, 8, s("SynapTech SpA  -  Propuesta confidencial para Medicenter"), 0, 0, "L")
        self.cell(0, 8, s(f"Pagina {self.page_no()}"), 0, 0, "R")

    # ---- helpers ----
    def h1(self, num, title):
        if self.get_y() > 240:
            self.add_page()
        self.ln(2)
        self.set_fill_color(*GREEN)
        self.set_draw_color(*GREEN)
        y = self.get_y()
        self.set_fill_color(*GREEN)
        self.rect(18, y, 4, 9, "F")
        self.set_xy(25, y)
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(*DARK)
        self.multi_cell(0, 9, s(f"{num}.  {title}"))
        self.ln(2)

    def h2(self, title):
        if self.get_y() > 250:
            self.add_page()
        self.ln(1)
        self.set_font("Helvetica", "B", 11.5)
        self.set_text_color(*GREEN_D)
        self.multi_cell(0, 6, s(title))
        self.ln(0.5)

    def body(self, txt):
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(*DARK)
        self.multi_cell(0, 5.6, s(txt))
        self.ln(1.5)

    def bullet(self, txt, bold_lead=None):
        self.set_font("Helvetica", "", 10.5)
        self.set_text_color(*GREEN_D)
        x = self.get_x()
        self.cell(6, 5.6, s("-"), 0, 0)
        self.set_text_color(*DARK)
        if bold_lead:
            self.set_font("Helvetica", "B", 10.5)
            lead_w = self.get_string_width(s(bold_lead) + " ")
            self.cell(lead_w, 5.6, s(bold_lead), 0, 0)
            self.set_font("Helvetica", "", 10.5)
            self.multi_cell(0, 5.6, s(txt))
        else:
            self.multi_cell(0, 5.6, s(txt))
        self.set_x(x)

    def callout(self, txt, color=BLUE):
        self.ln(1)
        self.set_font("Helvetica", "BI", 10.5)
        y0 = self.get_y()
        self.set_fill_color(*LIGHT)
        # medir alto
        self.set_xy(26, y0 + 2)
        x = self.get_x()
        self.multi_cell(self.w - 18 - 28, 5.6, s(txt))
        y1 = self.get_y()
        h = (y1 - y0) + 3
        self.set_fill_color(245, 247, 250)
        self.set_draw_color(*color)
        self.rect(18, y0, self.w - 36, h, "DF")
        self.set_draw_color(*color)
        self.set_line_width(1.2)
        self.line(18, y0, 18, y0 + h)
        self.set_line_width(0.2)
        self.set_xy(26, y0 + 2)
        self.set_text_color(*DARK)
        self.multi_cell(self.w - 18 - 28, 5.6, s(txt))
        self.set_y(y0 + h)
        self.ln(2)

    def table(self, headers, rows, widths, head_color=GREEN):
        self.ln(1)
        self.set_font("Helvetica", "B", 9.5)
        self.set_fill_color(*head_color)
        self.set_text_color(*WHITE)
        for h, w in zip(headers, widths):
            self.cell(w, 8, s(h), 0, 0, "L", True)
        self.ln()
        self.set_font("Helvetica", "", 9.2)
        fill = False
        for row in rows:
            # alto de fila segun contenido
            line_h = 5.2
            # calcular n lineas por celda
            n_lines = 1
            self.set_font("Helvetica", "", 9.2)
            for txt, w in zip(row, widths):
                nb = self._nb_lines(w - 2, s(str(txt)))
                n_lines = max(n_lines, nb)
            row_h = line_h * n_lines + 1.5
            if self.get_y() + row_h > 270:
                self.add_page()
                self.set_font("Helvetica", "B", 9.5)
                self.set_fill_color(*head_color)
                self.set_text_color(*WHITE)
                for h, w in zip(headers, widths):
                    self.cell(w, 8, s(h), 0, 0, "L", True)
                self.ln()
                self.set_font("Helvetica", "", 9.2)
            x0 = self.get_x()
            y0 = self.get_y()
            self.set_fill_color(*(LIGHT if fill else WHITE))
            self.set_text_color(*DARK)
            for txt, w in zip(row, widths):
                xc = self.get_x()
                self.rect(xc, y0, w, row_h, "F")
                self.set_xy(xc + 1, y0 + 0.8)
                self.multi_cell(w - 2, line_h, s(str(txt)), 0, "L")
                self.set_xy(xc + w, y0)
            self.set_xy(x0, y0 + row_h)
            fill = not fill
        # borde
        self.ln(2)

    def _nb_lines(self, w, txt):
        cw = self.get_string_width
        if w <= 0:
            return 1
        lines = 1
        for part in txt.split("\n"):
            words = part.split(" ")
            cur = ""
            for word in words:
                test = (cur + " " + word).strip()
                if cw(test) > w - 1:
                    lines += 1
                    cur = word
                else:
                    cur = test
        return lines

    def metric_box(self, x, y, w, h, value, label, color):
        self.set_fill_color(*color)
        self.rect(x, y, w, h, "F")
        self.set_xy(x, y + 5)
        self.set_font("Helvetica", "B", 22)
        self.set_text_color(*WHITE)
        self.cell(w, 10, s(value), 0, 2, "C")
        self.set_font("Helvetica", "", 8.5)
        self.set_xy(x, y + 17)
        self.multi_cell(w, 4.2, s(label), 0, "C")


pdf = PDF()

# ============================================================
# PORTADA
# ============================================================
pdf.add_page()
pdf.cover = True
pdf.set_fill_color(*DARK)
pdf.rect(0, 0, pdf.w, pdf.h, "F")
# banda verde
pdf.set_fill_color(*GREEN)
pdf.rect(0, 95, pdf.w, 2, "F")

pdf.set_xy(18, 30)
pdf.set_font("Helvetica", "B", 11)
pdf.set_text_color(*GREEN)
pdf.cell(0, 8, s("PROPUESTA DE PROYECTO  -  CONFIDENCIAL"), 0, 1)

pdf.set_xy(18, 50)
pdf.set_font("Helvetica", "B", 34)
pdf.set_text_color(*WHITE)
pdf.multi_cell(pdf.w - 36, 14, s("Auditor Clinico de Informes Ecograficos"))

pdf.set_xy(18, 100)
pdf.set_font("Helvetica", "", 14)
pdf.set_text_color(220, 230, 240)
pdf.multi_cell(pdf.w - 36, 8, s("Control de calidad asistido por IA para el flujo de dictado y transcripcion de Medicenter"))

pdf.set_xy(18, 235)
pdf.set_font("Helvetica", "", 11)
pdf.set_text_color(180, 190, 200)
pdf.cell(0, 7, s("Preparado para:  Medicenter  -  Direccion Medica y Gerencia"), 0, 1)
pdf.set_x(18)
pdf.cell(0, 7, s("Preparado por:  SynapTech SpA"), 0, 1)
pdf.set_x(18)
pdf.cell(0, 7, s("Fecha:  Junio 2026   -   Estado: Pre-piloto / demo funcional"), 0, 1)
pdf.set_x(18)
pdf.set_text_color(*GREEN)
pdf.set_font("Helvetica", "B", 11)
pdf.cell(0, 7, s('"La IA no reemplaza a nadie. Asiste al equipo que ya tienen, haciendolo mas rapido y mas seguro."'), 0, 1)

pdf.cover = False

# ============================================================
# 1. RESUMEN EJECUTIVO
# ============================================================
pdf.add_page()
pdf.h1(1, "Resumen ejecutivo")
pdf.body(
    "Medicenter produce hasta 60 informes ecograficos diarios mediante un flujo de "
    "dictado por voz: el medico radiologo dicta, y un equipo de transcriptoras escribe "
    "el informe final. Ese proceso, por su propia naturaleza, introduce errores: "
    "vocabulario tecnico fonéticamente ambiguo, homofonos clinicos (bazo/vaso), medidas "
    "numericas mal escuchadas y hallazgos omitidos. Incluso una tasa de error del 5% "
    "significa ~3 informes con discrepancias relevantes por dia, ~900 al ano, que van "
    "desde re-trabajo hasta decisiones clinicas equivocadas."
)
pdf.body(
    "Proponemos un Auditor Clinico inteligente: un sistema que recibe el audio del dictado "
    "y el informe escrito, los compara automaticamente y marca cada discrepancia "
    "clasificada por severidad clinica (critica, advertencia o estilo). El sistema no "
    "modifica el informe: solo senala. El humano decide. Es un asistente, no un reemplazo."
)
pdf.body(
    "La aplicacion ya existe como demo funcional: tiene la interfaz de carga, el motor de "
    "auditoria multi-proveedor de IA, el calculo de un Score de Concordancia Clinica, la "
    "vista de comparacion textual, la seudonimizacion de datos del paciente y 10 casos "
    "reales de ecografia abdominal procesados de extremo a extremo. Lo que sigue es un "
    "piloto supervisado de 4 semanas con datos de Medicenter para validar las metricas "
    "clinicas y activar el contrato de operacion."
)

# tres metricas destacadas
y = pdf.get_y() + 2
bw = (pdf.w - 36 - 10) / 3
pdf.metric_box(18, y, bw, 26, "60/dia", "Informes auditables sin sumar personal", BLUE)
pdf.metric_box(18 + bw + 5, y, bw, 26, "< US$70", "Costo mensual de API estimado a ese volumen", GREEN)
pdf.metric_box(18 + 2 * (bw + 5), y, bw, 26, ">=95%", "Recall objetivo de errores criticos en el piloto", GREEN_D)
pdf.set_y(y + 30)

# ============================================================
# 2. EL PROBLEMA
# ============================================================
pdf.h1(2, "El problema que resolvemos")
pdf.body(
    "El flujo actual de dictado y transcripcion introduce errores por causas "
    "estructurales, no por negligencia del equipo. Las mas frecuentes:"
)
pdf.bullet("terminos como 'hipoecoico' / 'hiperecogenico' son foneticamente similares a otros con sentido clinico opuesto.", "Vocabulario tecnico denso:")
pdf.bullet("'bazo' / 'vaso', 'hipodenso' / 'hiperdenso' se confunden al escuchar.", "Homofonos clinicos:")
pdf.bullet("'ocho' vs 'doce' dictados con ruido ambiente cambian la conducta clinica.", "Medidas numericas:")
pdf.bullet("informacion que se pierde cuando el medico habla rapido o baja la voz al final.", "Omision de hallazgos:")
pdf.bullet("el equipo produce muchos informes por dia, lo que reduce el tiempo de autorevision.", "Presion de volumen:")
pdf.ln(1)
pdf.body(
    "Hoy el control de calidad, cuando existe, lo hace otra persona o no lo hace nadie. "
    "Es caro, lento o inexistente. El costo no es solo el re-trabajo: una medida mal "
    "transcrita o un hallazgo omitido puede modificar una conducta clinica."
)
pdf.callout(
    "A 60 informes/dia, un 5% de error son ~3 informes diarios con discrepancias "
    "potencialmente relevantes: cerca de 900 eventos al ano.",
    color=RED,
)

# ============================================================
# 3. LA SOLUCION
# ============================================================
pdf.h1(3, "La solucion: un auditor que asiste, no reemplaza")
pdf.body("El Auditor Clinico funciona en seis pasos:")
pdf.bullet("Recibe el audio del dictado y el informe escrito (opcionalmente, tambien el preinforme del tecnologo).")
pdf.bullet("Transcribe el audio automaticamente, generando una referencia independiente del informe.")
pdf.bullet("Compara las fuentes con un modelo de lenguaje guiado por criterio clinico.")
pdf.bullet("Marca cada discrepancia y la clasifica por severidad: critica, advertencia o estilo.")
pdf.bullet("Presenta las marcas a la transcriptora o al supervisor, con su nivel de confianza.")
pdf.bullet("No modifica el informe. El humano decide que corregir.")
pdf.ln(1)
pdf.h2("Por que 'asistente' y no 'reemplazo' (decision estrategica)")
pdf.body(
    "Posicionar la herramienta como reemplazo genera resistencia interna: las transcriptoras "
    "marcarian falsos positivos para demostrar que 'la IA se equivoca'. Posicionarla como "
    "asistente las convierte en aliadas: les saca presion, les cubre las espaldas y las hace "
    "mas rapidas y seguras. La direccion clinica conserva siempre la ultima palabra."
)

# ============================================================
# 4. COMO FUNCIONA (FLUJO)
# ============================================================
pdf.h1(4, "Como funciona en la practica")
pdf.body(
    "La aplicacion guia al usuario a traves de un flujo de 5 pasos, visible en pantalla en "
    "todo momento:"
)
pdf.table(
    ["Paso", "Etapa", "Que ocurre"],
    [
        ["1", "Datos del examen", "Tipo de estudio, codigo de paciente, tecnologo y radiologo."],
        ["2", "Pre-dictado (opcional)", "Preinforme del tecnologo como fuente clinica adicional."],
        ["3", "Cargar archivos", "Se sube el audio del dictado y el informe escrito."],
        ["4", "Auditoria IA", "Transcripcion + comparacion + clasificacion de discrepancias."],
        ["5", "Aprobacion", "El supervisor revisa las marcas y aprueba el informe."],
    ],
    [16, 42, pdf.w - 36 - 16 - 42],
)
pdf.body(
    "El procesamiento es sincronico: el usuario sube el caso y, en menos de 1-2 minutos, ve "
    "el resultado. A 60 informes/dia (uno cada ~8 minutos) no hay cuello de botella de "
    "concurrencia. El resultado incluye una vista de comparacion textual que resalta las "
    "diferencias palabra por palabra entre el audio y el informe."
)

# ============================================================
# 5. CLASIFICACION CLINICA
# ============================================================
pdf.h1(5, "Clasificacion clinica de discrepancias")
pdf.body(
    "El corazon del producto es como clasifica las diferencias. La taxonomia sigue un "
    "principio rector: ante duda entre dos niveles de severidad, elegir siempre el mas grave. "
    "Un falso positivo cuesta poco (el humano lo descarta); un falso negativo puede ser un "
    "evento adverso."
)
pdf.table(
    ["Nivel", "Definicion", "Ejemplos"],
    [
        ["CRITICO", "Puede modificar la conducta clinica o el diagnostico.",
         "'12 mm' vs '8 mm'; rinon derecho vs izquierdo; hipoecoico vs hiperecoico; hallazgo omitido."],
        ["ADVERTENCIA", "Requiere revision, no necesariamente cambia la conducta.",
         "Sinonimos clinicos no identicos; descriptor secundario omitido; diferencia <10% en estructura normal."],
        ["ESTILO", "Diferencia de redaccion, sin impacto clinico.",
         "'cm' vs 'centimetros'; muletillas del dictado; expansiones tecnicas estandar."],
    ],
    [30, 60, pdf.w - 36 - 30 - 60],
)
pdf.h2("Inteligencia adicional: lo que el sistema NO marca")
pdf.body(
    "El auditor distingue los errores de la transcriptora de los errores del propio "
    "reconocimiento de voz. Si el audio transcrito dice 'vaso de tamano normal' y el informe "
    "dice 'bazo de tamano normal', el sistema reconoce que es un homofono del motor de voz "
    "-no un error humano- y no lo marca. Esto reduce el ruido y construye confianza con el "
    "equipo."
)

# ============================================================
# 6. SCORE DE CONCORDANCIA
# ============================================================
pdf.h1(6, "Score de Concordancia Clinica")
pdf.body(
    "Cada caso recibe una puntuacion de 0 a 100, calculada de forma deterministica "
    "(reproducible, sin intervencion del modelo): se parte de 100 y se descuenta por cada "
    "discrepancia segun su peso. El resultado se traduce en un semaforo facil de leer para "
    "la gerencia y la coordinacion:"
)
y = pdf.get_y() + 1
bw = (pdf.w - 36 - 10) / 3
pdf.metric_box(18, y, bw, 24, "95-100", "VERDE  -  Concordancia optima", GREEN)
pdf.metric_box(18 + bw + 5, y, bw, 24, "80-94", "AMARILLO  -  Revisar", AMBER)
pdf.metric_box(18 + 2 * (bw + 5), y, bw, 24, "0-79", "ROJO  -  Atencion requerida", RED)
pdf.set_y(y + 28)
pdf.body(
    "Formula: 100 - (criticas x 15) - (advertencias x 5) - (estilo x 1). Ademas, una regla "
    "de seguridad clinica garantiza que ningun caso con una discrepancia critica activa se "
    "muestre nunca como 'verde optimo', aunque la aritmetica lo permita. La precaucion "
    "clinica esta embebida en el codigo."
)

# ============================================================
# 7. USO REAL / DEMO
# ============================================================
pdf.h1(7, "Uso real: la demo ya procesa casos de extremo a extremo")
pdf.body(
    "Esto no es una idea en papel. La aplicacion ya existe y procesa casos reales de "
    "ecografia abdominal. Un ejemplo procesado por el sistema:"
)
pdf.callout(
    "Informe: 'imagen hiperecogenica de 12 milimetros compatible con calculo... el bazo "
    "presenta dimensiones aumentadas, mide 13 centimetros'.  El auditor confirmo la "
    "concordancia con el audio y solo marco una diferencia de ESTILO ('cm' vs "
    "'centimetros'), sin impacto clinico. Score alto, sin falsas alarmas.",
    color=GREEN,
)
pdf.body(
    "El mismo motor, frente a un caso donde el audio dijera '12 mm' y el informe '8 mm', "
    "lo marcaria como CRITICO con una explicacion clara: la indicacion quirurgica puede "
    "cambiar. Esa es exactamente la clase de error que hoy puede pasar inadvertido."
)
pdf.h2("Lo que ya esta construido")
pdf.bullet("Interfaz de carga con flujo guiado de 5 pasos y captura de metadatos del examen.")
pdf.bullet("Motor de auditoria multi-proveedor (puede operar con Claude, GPT-4o u otros modelos), con validacion estricta del formato de salida.")
pdf.bullet("Transcripcion automatica de audio mediante reconocimiento de voz.")
pdf.bullet("Comparacion dual (audio vs informe) y triple (audio + preinforme del tecnologo + informe).")
pdf.bullet("Vista de comparacion textual con diferencias resaltadas y Score de Concordancia.")
pdf.bullet("Seudonimizacion automatica de datos del paciente (RUT, fechas, nombres, fichas) antes de cualquier envio externo.")
pdf.bullet("10 casos reales procesados y almacenados, con trazabilidad de la version de prompt usada.")

# ============================================================
# 8. PRIVACIDAD Y LEGAL
# ============================================================
pdf.h1(8, "Privacidad, seguridad y cumplimiento legal")
pdf.body(
    "El proyecto trata datos personales sensibles y esta disenado desde el inicio para el "
    "marco legal chileno: Ley 19.628, la reforma 21.719 y la Ley 20.584 de derechos del "
    "paciente. Medidas adoptadas:"
)
pdf.bullet("antes de enviar cualquier texto a un proveedor de IA, un modulo en el servidor reemplaza RUT, fechas, nombres y numeros de ficha por tokens. El mapeo reverso nunca sale del servidor.", "Seudonimizacion previa:")
pdf.bullet("HTTPS/TLS en transito y cifrado en reposo a nivel de almacenamiento.", "Cifrado:")
pdf.bullet("contratos de tratamiento de datos (DPA) con cada proveedor, con clausula de prohibicion de uso para entrenamiento de modelos.", "Acuerdos de datos:")
pdf.bullet("cada operacion sobre un caso queda registrada (usuario, accion, timestamp, version de prompt). Log consultable por Medicenter.", "Registro de auditoria:")
pdf.bullet("autenticacion obligatoria y roles diferenciados (transcriptora, supervisor, admin), con MFA para roles sensibles.", "Control de acceso:")
pdf.bullet("el sistema soporta acceso, rectificacion, eliminacion y portabilidad de datos del paciente.", "Derechos del titular:")
pdf.callout(
    "Regla de oro del proyecto: antes de procesar un solo audio real, debe completarse el "
    "checklist legal (DPAs firmados, consentimiento validado, seudonimizacion testeada, "
    "politica de retencion acordada). Si cualquier control falla, no se procesa.",
    color=BLUE,
)

# ============================================================
# 9. METRICAS DEL PILOTO
# ============================================================
pdf.h1(9, "Metricas de exito del piloto")
pdf.body(
    "El piloto de 4 semanas no es una demostracion: es una validacion medible. Los objetivos "
    "acordados de antemano:"
)
pdf.table(
    ["Metrica", "Objetivo", "Por que importa"],
    [
        ["Recall de errores criticos", ">= 95%", "Casi ningun error grave debe escaparse."],
        ["Precision global", ">= 70%", "Pocas falsas alarmas: la herramienta es confiable."],
        ["Falsos criticos", "< 5%", "El estilo no se marca como critico sin razon."],
        ["Reduccion de tiempo de ciclo", "A medir", "Cuanto tiempo de revision se ahorra el equipo."],
        ["Satisfaccion del equipo", "Encuesta", "La herramienta debe sentirse como una aliada."],
    ],
    [52, 28, pdf.w - 36 - 52 - 28],
)
pdf.body(
    "La validacion clinica se hace contra un 'golden set' de 20 casos historicos de "
    "Medicenter, anonimizados y marcados manualmente por un radiologo de referencia. El "
    "sistema se ajusta hasta cumplir las metricas, versionando cada cambio del criterio "
    "clinico para total trazabilidad."
)

# ============================================================
# 10. POTENCIAL Y ESCALABILIDAD
# ============================================================
pdf.h1(10, "Uso potencial y escalabilidad")
pdf.body(
    "El piloto en ecografia abdominal es solo el punto de entrada. El mismo motor escala en "
    "dos direcciones:"
)
pdf.h2("Expansion vertical (dentro de Medicenter)")
pdf.bullet("Otros tipos de informe radiologico: radiografia, TC, resonancia magnetica.")
pdf.bullet("Ecografia obstetrica, con reglas especificas (edad gestacional, percentiles, Doppler).")
pdf.bullet("Glosario institucional propio de Medicenter cargado como excepciones de estilo.")
pdf.bullet("Panel de gerencia con metricas agregadas de calidad por periodo, examen y profesional.")
pdf.h2("Expansion horizontal (mas alla de Medicenter)")
pdf.body(
    "El producto esta disenado como SaaS multi-cliente. Una vez validado en Medicenter, el "
    "mismo sistema sirve a otros centros de imagenologia. Medicenter, como primer cliente y "
    "caso de exito, obtiene condiciones preferentes."
)
pdf.h2("Modelo de negocio")
pdf.body(
    "SaaS por volumen de informes auditados. Con un costo operativo de API estimado en menos "
    "de US$70/mes a 60 informes diarios, el margen permite un precio de salida competitivo. "
    "El piloto inicial se ofrece con precio reducido o gratuito a cambio de acceso a informes "
    "historicos para validacion, un testimonio de caso de uso, e input del equipo clinico."
)

# ============================================================
# 11. ROADMAP
# ============================================================
pdf.h1(11, "Plan de implementacion")
pdf.table(
    ["Fase", "Duracion", "Que sucede"],
    [
        ["1. Pre-piloto", "Actual", "Demo funcional + levantamiento tecnico y legal con Medicenter."],
        ["2. Levantamiento", "Sem. 1-2", "Radiologo de referencia, DPO, golden set de 20 casos, firma de DPAs."],
        ["3. Desarrollo piloto", "Sem. 3-5", "Integracion completa, seudonimizacion, ajuste del criterio clinico."],
        ["4. Piloto operativo", "Sem. 6-9", "Informes reales con supervision; medicion de precision y aceptacion."],
        ["5. Evaluacion y contrato", "Sem. 10", "Analisis de resultados y decision de paso a produccion."],
    ],
    [40, 26, pdf.w - 36 - 40 - 26],
)
pdf.body(
    "Para arrancar el piloto, Medicenter solo necesita designar tres interlocutores: un "
    "radiologo de referencia (validacion clinica), un responsable de datos / DPO (marco "
    "legal) y un contacto de TI (integracion). El resto lo construye SynapTech."
)

# ============================================================
# 12. POR QUE APROBAR
# ============================================================
pdf.h1(12, "Por que aprobar este proyecto")
pdf.bullet("el equipo conserva su trabajo y gana una red de seguridad. La direccion clinica conserva el control.", "Riesgo bajo:")
pdf.bullet("la demo ya procesa casos reales. No financian una idea, validan un producto funcional.", "Inversion protegida:")
pdf.bullet("cada caso con error critico evitado es un evento adverso potencial menos y un re-trabajo menos.", "Impacto clinico directo:")
pdf.bullet("disenado para la ley chilena de datos sensibles, con seudonimizacion y trazabilidad desde el primer dia.", "Cumplimiento serio:")
pdf.bullet("Medicenter se posiciona como un centro que audita su calidad con IA -un diferenciador frente a pacientes y medicos derivadores.", "Ventaja reputacional:")
pdf.bullet("primer cliente, condiciones preferentes y voz en la evolucion del producto.", "Posicion de socio:")
pdf.ln(2)
pdf.callout(
    "La IA no reemplaza a nadie. Asiste al equipo que ya tienen, haciendolo mas rapido y mas "
    "seguro. Lo unico que pedimos para empezar es un piloto supervisado de 4 semanas con datos "
    "reales. Las metricas decidiran el resto.",
    color=GREEN,
)
pdf.ln(2)
pdf.set_font("Helvetica", "B", 11)
pdf.set_text_color(*DARK)
pdf.cell(0, 7, s("Proximo paso sugerido: agendar la reunion de levantamiento tecnico y clinico."), 0, 1)
pdf.set_font("Helvetica", "", 10)
pdf.set_text_color(*GRAY)
pdf.cell(0, 6, s("SynapTech SpA  -  Contacto: ignaciiio.mate@gmail.com"), 0, 1)

pdf.output("/home/user/Medicenter-proyecto/files/Propuesta-Medicenter-Auditor-Clinico.pdf")
print("PDF generado OK")
