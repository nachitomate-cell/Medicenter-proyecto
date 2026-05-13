/**
 * Almacenamiento local — reemplaza Firebase Firestore + Storage
 * mientras no tengamos facturación habilitada.
 *
 * Los casos se guardan como archivos JSON en data/cases/.
 * Los audios se guardan en public/audios/ para que Next.js los sirva estáticamente.
 */

import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { AuditCase, CaseSummary } from "./types";

const DATA_DIR = path.join(process.cwd(), "data", "cases");
const AUDIO_DIR = path.join(process.cwd(), "public", "audios");

function ensureDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }
}

/**
 * Genera un ID único para el caso (similar a un Firestore doc ID).
 */
function generateId(): string {
  return crypto.randomBytes(10).toString("hex");
}

/**
 * Guarda un caso de auditoría como archivo JSON.
 * Retorna el ID generado.
 */
export async function saveCase(data: Omit<AuditCase, "id">): Promise<string> {
  ensureDirs();
  const id = generateId();
  const caseWithId: AuditCase = { id, ...data };
  const filePath = path.join(DATA_DIR, `${id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(caseWithId, null, 2), "utf-8");
  console.log(`Caso guardado: ${filePath}`);
  return id;
}

/**
 * Actualiza campos de un caso existente.
 */
export async function updateCase(id: string, updates: Partial<AuditCase>): Promise<void> {
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Case ${id} not found`);
  }
  const existing = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const updated = { ...existing, ...updates };
  fs.writeFileSync(filePath, JSON.stringify(updated, null, 2), "utf-8");
}

/**
 * Carga un caso por su ID.
 */
export async function loadCase(id: string): Promise<AuditCase | null> {
  ensureDirs();
  const filePath = path.join(DATA_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) {
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as AuditCase;
}

/**
 * Lista todos los casos de auditoría ordenados del más reciente al más antiguo.
 * Retorna solo los campos necesarios para el listado (sin report/transcription).
 */
export async function listCases(): Promise<CaseSummary[]> {
  ensureDirs();
  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => f.endsWith(".json"));

  const summaries = files.map((file) => {
    const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
    const data = JSON.parse(raw) as AuditCase;
    return {
      id: data.id,
      audioFileName: data.metadata.audioFileName,
      audioDurationSeconds: data.metadata.audioDurationSeconds,
      createdAt: data.createdAt,
      counts: data.metadata.counts,
      promptVersion: data.metadata.promptVersion,
      processingMs: data.metadata.processingMs,
      modelName: data.metadata.modelName,
      status: data.status ?? "pending",
      examType: data.examType ?? "—",
      patientCode: data.patientCode ?? "—",
      radiologist: data.radiologist ?? "—",
      approvedAt: data.approvedAt,
    } satisfies CaseSummary;
  });

  return summaries.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Aprueba un caso cambiando su estado a "approved".
 */
export async function approveCase(id: string): Promise<void> {
  await updateCase(id, { status: "approved", approvedAt: new Date().toISOString() });
}

/**
 * Guarda el buffer de audio en public/audios/{caseId}.{ext}
 * y retorna la URL relativa para el frontend.
 */
export async function saveAudio(
  caseId: string,
  buffer: Buffer,
  ext: string,
  contentType: string
): Promise<string> {
  ensureDirs();
  const fileName = `${caseId}.${ext}`;
  const filePath = path.join(AUDIO_DIR, fileName);
  fs.writeFileSync(filePath, buffer);
  console.log(`Audio guardado: ${filePath} (${buffer.length} bytes)`);
  // URL relativa que Next.js sirve desde /public
  return `/audios/${fileName}`;
}
