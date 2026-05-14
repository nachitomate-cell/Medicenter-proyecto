/**
 * Firebase Admin SDK — inicialización singleton.
 *
 * Carga las credenciales desde el archivo service-account.json
 * ubicado en la raíz del proyecto. Esto evita los problemas de
 * parseo de claves PEM que ocurren al pasarlas por variables de
 * entorno (escaped newlines, comillas, etc.).
 *
 * En producción (Vercel), se puede usar la variable de entorno
 * GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON
 * con el JSON stringificado.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage as getAdminStorage, type Storage } from "firebase-admin/storage";
import fs from "fs";
import path from "path";

let app: App | null = null;
let db: Firestore | null = null;
let storage: Storage | null = null;
let corsConfigured = false;

function loadServiceAccount(): { projectId: string; clientEmail: string; privateKey: string } {
  // Strategy 1: Load from service-account.json file (development)
  const saPath = path.join(process.cwd(), "service-account.json");

  if (fs.existsSync(saPath)) {
    console.log("Firebase: Loading credentials from service-account.json");
    const raw = fs.readFileSync(saPath, "utf-8");
    const sa = JSON.parse(raw);
    return {
      projectId: sa.project_id,
      clientEmail: sa.client_email,
      privateKey: sa.private_key,
    };
  }

  // Strategy 2: Fallback to env vars (production / Vercel)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase credentials. Either place service-account.json " +
        "in the project root, or set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local"
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  };
}

function getApp(): App {
  if (app) return app;

  const existing = getApps();
  if (existing.length > 0) {
    app = existing[0];
    return app;
  }

  const sa = loadServiceAccount();

  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET
    || `${sa.projectId}.appspot.com`;

  app = initializeApp({
    credential: cert(sa),
    storageBucket,
  });

  console.log(`Firebase Admin initialized (project: ${sa.projectId}, bucket: ${storageBucket})`);

  return app;
}

export function getDb(): Firestore {
  if (db) return db;

  getApp();
  db = getFirestore();
  return db;
}

async function configureBucketCors(bucket: ReturnType<Storage["bucket"]>): Promise<void> {
  if (corsConfigured) return;
  corsConfigured = true;
  try {
    await bucket.setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["PUT", "GET", "HEAD", "OPTIONS"],
        origin: ["*"],
        responseHeader: ["Content-Type", "Access-Control-Allow-Origin"],
      },
    ]);
    console.log("Firebase Storage: CORS configured.");
  } catch (err) {
    console.warn("Firebase Storage: CORS configuration failed (non-fatal):", err);
  }
}

export function getBucket() {
  if (storage) return storage.bucket();

  getApp();
  storage = getAdminStorage();
  const bucket = storage.bucket();
  // Lazily configure CORS (fire-and-forget; errors are non-fatal)
  configureBucketCors(bucket).catch(() => {});
  return bucket;
}
