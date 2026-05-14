/**
 * Firestore operations — replaces local-storage.ts for production.
 * Cases are stored in the `cases` collection.
 */

import { getDb } from "@/lib/firebase-admin";
import type { AuditCase, CaseSummary } from "@/lib/types";

/**
 * Saves a new audit case to Firestore.
 * Returns the Firestore-generated document ID.
 */
export async function saveCase(data: Omit<AuditCase, "id">): Promise<string> {
  const db = getDb();
  const docRef = await db.collection("cases").add({ ...data });
  // Persist the generated ID back into the document so it's self-describing.
  await docRef.update({ id: docRef.id });
  console.log(`Caso guardado en Firestore: ${docRef.id}`);
  return docRef.id;
}

/**
 * Loads a single case by ID. Returns null if not found.
 */
export async function loadCase(id: string): Promise<AuditCase | null> {
  const db = getDb();
  const snap = await db.collection("cases").doc(id).get();
  if (!snap.exists) return null;
  return snap.data() as AuditCase;
}

/**
 * Partially updates an existing case.
 */
export async function updateCase(id: string, updates: Partial<AuditCase>): Promise<void> {
  const db = getDb();
  await db.collection("cases").doc(id).update(updates as Record<string, unknown>);
}

/**
 * Lists all cases ordered by createdAt descending.
 * Returns CaseSummary shape (no full report/transcription).
 */
export async function listCases(): Promise<CaseSummary[]> {
  const db = getDb();
  const snap = await db
    .collection("cases")
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map((doc) => {
    const data = doc.data() as AuditCase;
    return {
      id: data.id ?? doc.id,
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
}
